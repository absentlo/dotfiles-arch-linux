// resistFingerprinting makes the browser report UTC, so the clock takes the zone from the
// time zone field, then from the weather city, and only then from the browser.
const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
let timeZone = BROWSER_TIME_ZONE;
const clock = document.getElementById("clock");
const date = document.getElementById("date");
const greeting = document.getElementById("greeting");
let clockTimer;

function tick() {
  clearTimeout(clockTimer);
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  date.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", timeZone });
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone }));
  greeting.textContent = h < 6 ? "Late night" : h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening";
  // Wake once per minute, on the minute, and never while the tab is in the background
  if (!document.hidden) clockTimer = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}
tick();

// Wallpaper: stored as a data URL because Brave's storage.local can't hold Blobs (this page is shared with Brave).
const MAX_WALL_BYTES = 10 * 1024 * 1024;  // the base64 string is decoded on every new tab
const wallFile = document.getElementById("wall-file");
const wallRemove = document.getElementById("wall-remove");

function showWall(url) {
  document.body.style.backgroundImage = url ? `linear-gradient(#11111199, #11111199), url("${url}")` : "";
  document.body.classList.toggle("has-wall", Boolean(url));
  wallRemove.hidden = !url;
}

document.getElementById("wall-pick").onclick = () => wallFile.click();
wallRemove.onclick = () => chrome.storage.local.remove("wallpaper").then(() => showWall(null));

wallFile.onchange = () => {
  const file = wallFile.files[0];
  wallFile.value = "";  // lets the same file be picked again
  if (!file) return;
  if (!file.type.startsWith("image/")) return alert("That file is not an image.");
  if (file.size > MAX_WALL_BYTES) return alert("Image is over 10 MB, pick a smaller one.");
  const reader = new FileReader();
  reader.onerror = () => alert("Could not read that image.");
  reader.onload = () => chrome.storage.local.set({ wallpaper: reader.result })
    .then(() => showWall(reader.result))
    .catch((e) => alert(`Could not save the wallpaper: ${e.message}`));
  reader.readAsDataURL(file);
};

// Customize panel: which sections show, my pages, most visited, weather.
const WEATHER_MAX_AGE = 30 * 60 * 1000;  // new tabs reuse the last reading instead of hitting the network
const MAX_VISITED = 24;
const WHEEL_GAP = 200;  // ms between page flips, a touchpad fires many wheel events per swipe
const ICON_SIZE = 32;
const ICON_DARKEST = 0x5A;   // --dim
const ICON_LIGHTEST = 0xD8;  // --fg
const SVG_NS = "http://www.w3.org/2000/svg";
let show = { logo: true, clock: true, date: true, search: true, links: true, siteIcons: false, visited: false, visitedIcons: false, weather: false };
// Permissions the browser only grants from a click, asked the first time a box is ticked.
const NEEDS = { visited: { permissions: ["topSites"] }, siteIcons: { origins: ["https://icons.duckduckgo.com/*"] } };
let links = [];  // { url, name?, iconOnly? }
let perPage = 8;
const rowPage = { links: 0, visited: 0 };
let icons = {};  // host -> palette PNG data URL, "" when the site has none
let city = null;
let weather = null;

function applyShow() {
  // toggleAttribute, not .hidden: the logo is an svg, which has no .hidden property
  for (const el of document.querySelectorAll("[data-section]")) el.toggleAttribute("hidden", !show[el.dataset.section]);
}

function hostOf(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

// Only http(s) becomes a link, so a typed "javascript:..." can never run from the page.
function parseUrl(text) {
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function svgIcon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "i");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

// Recolors RGBA pixels in place to the palette's gray ramp, whatever colors the logo had.
function toPalette(px) {
  let sum = 0, count = 0, clear = 0, min = 1, max = 0;
  const lum = (i) => (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) { clear++; continue; }
    const l = lum(i);
    sum += l; count++;
    min = Math.min(min, l); max = Math.max(max, l);
  }
  if (!count) return;
  // A dark logo on a transparent background would vanish on the dark chip, so flip it.
  const flip = clear / (clear + count) > 0.2 && sum / count < 0.4;
  const range = max - min;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    let l = range < 0.1 ? 1 : Math.min(1, Math.max(0, (lum(i) - min) / range));  // one-color logos go lightest
    if (flip && range >= 0.1) l = 1 - l;
    px[i] = px[i + 1] = px[i + 2] = ICON_DARKEST + l * (ICON_LIGHTEST - ICON_DARKEST);
  }
}

async function paletteIcon(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
  const pixels = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
  toPalette(pixels.data);
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

// Each host is fetched once and kept in storage, so new tabs use no network for icons.
// shortcut: icons never refresh and old hosts stay cached (about 1 KB each), add expiry if a logo goes stale.
async function iconFor(host, favicon) {
  if (Object.hasOwn(icons, host)) return icons[host];
  let src = favicon;  // the browser's own copy needs no network
  if (!src) {
    let res;
    try {
      res = await fetch(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`, { credentials: "omit" });
    } catch {
      return "";  // offline: not cached, so the next tab tries again
    }
    if (!res.ok) {
      icons[host] = "";
      chrome.storage.local.set({ icons });
      return "";
    }
    src = URL.createObjectURL(await res.blob());
  }
  try {
    icons[host] = await paletteIcon(src);
  } catch {
    icons[host] = "";  // unreadable image: keep the globe
  }
  if (!favicon) URL.revokeObjectURL(src);
  chrome.storage.local.set({ icons });
  return icons[host];
}

function siteIcon(host, favicon) {
  const slot = document.createElement("span");
  slot.className = "site-icon";
  slot.append(svgIcon("globe"));
  if (!show.siteIcons) return slot;
  iconFor(host, favicon).then((url) => {
    if (!url) return;
    const img = new Image();
    img.alt = "";
    img.src = url;
    slot.replaceChildren(img);
  });
  return slot;
}

function chip({ url, name, iconOnly, favicon }) {
  const host = hostOf(url);
  const label = name || host;
  const a = document.createElement("a");
  a.href = url;
  a.title = name ? `${name} (${url})` : url;
  a.classList.toggle("icon-only", Boolean(iconOnly));
  a.setAttribute("aria-label", label);
  const text = document.createElement("span");
  text.textContent = label;
  a.append(siteIcon(host, favicon), text);
  return a;
}

function saveLinks() {
  chrome.storage.local.set({ links });
}

function arrow(icon, label, onclick) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(svgIcon(icon));
  button.onclick = onclick;
  return button;
}

// One page of chips at a time, so only what shows gets drawn or has its icon fetched.
function renderRow(out, sites) {
  const key = out.id;
  const pages = Math.ceil(sites.length / perPage) || 1;
  rowPage[key] = Math.min(rowPage[key], pages - 1);
  const page = document.createElement("div");
  page.className = "page";
  const count = document.createElement("span");
  count.className = "page-count";
  count.setAttribute("aria-live", "polite");

  const draw = () => {
    const start = rowPage[key] * perPage;
    page.replaceChildren(...sites.slice(start, start + perPage).map(chip));
    count.textContent = `${rowPage[key] + 1} / ${pages}`;
  };
  const flip = (step) => {
    rowPage[key] = (rowPage[key] + step + pages) % pages;  // wraps around at both ends
    draw();
  };
  draw();

  if (!sites.length) out.replaceChildren();
  else if (pages === 1) out.replaceChildren(page);
  else out.replaceChildren(arrow("left", "Previous sites", () => flip(-1)), page, arrow("right", "Next sites", () => flip(1)), count);

  let lastWheel = -Infinity;
  out.onwheel = pages === 1 ? null : (event) => {
    event.preventDefault();
    const step = Math.sign(event.deltaY || event.deltaX);
    if (!step || event.timeStamp - lastWheel < WHEEL_GAP) return;
    lastWheel = event.timeStamp;
    flip(step);
  };
  out.onkeydown = pages === 1 ? null : (event) => {
    if (event.key === "ArrowLeft") flip(-1);
    if (event.key === "ArrowRight") flip(1);
  };
}

function renderChips() {
  renderRow(document.getElementById("links"), links);
}

// Separate from renderChips: rebuilding this list on rename would drop keyboard focus.
function renderLinkList() {
  const rows = links.map((link) => {
    const host = hostOf(link.url);
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 40;
    name.value = link.name ?? "";
    name.placeholder = host;
    name.title = link.url;
    name.setAttribute("aria-label", `Name for ${host}`);
    name.onchange = () => {
      link.name = name.value.trim();
      name.value = link.name;
      saveLinks();
      renderChips();
    };

    const iconOnly = document.createElement("button");
    iconOnly.type = "button";
    iconOnly.title = "Show only the icon";
    iconOnly.setAttribute("aria-label", `Show only the icon for ${host}`);
    iconOnly.setAttribute("aria-pressed", String(Boolean(link.iconOnly)));
    iconOnly.append(svgIcon("image"));
    iconOnly.onclick = () => {
      link.iconOnly = !link.iconOnly;
      iconOnly.setAttribute("aria-pressed", String(link.iconOnly));
      saveLinks();
      renderChips();
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.setAttribute("aria-label", `Remove ${host}`);
    remove.onclick = () => {
      links = links.filter((other) => other !== link);
      saveLinks();
      renderLinks();
    };

    const row = document.createElement("li");
    row.append(siteIcon(host), name, iconOnly, remove);
    return row;
  });
  document.getElementById("link-list").replaceChildren(...rows);
}

function renderLinks() {
  renderChips();
  renderLinkList();
  renderVisited();  // a newly pinned site leaves the most visited row
}

async function topSites() {
  try {
    return await chrome.topSites.get({ includeFavicon: true, onePerDomain: true });
  } catch {
    return chrome.topSites.get().catch(() => []);  // Brave's version takes no options
  }
}

async function renderVisited() {
  const out = document.getElementById("visited");
  if (!show.visited || !chrome.topSites) return out.replaceChildren();  // no API until the permission is granted
  const sites = await topSites();
  const seen = new Set(links.map((link) => hostOf(link.url)));
  const chips = [];
  for (const site of sites) {
    if (!/^https?:/.test(site.url) || seen.has(hostOf(site.url))) continue;
    seen.add(hostOf(site.url));
    chips.push({ url: site.url, favicon: site.favicon, iconOnly: show.visitedIcons });
    if (chips.length === MAX_VISITED) break;
  }
  renderRow(out, chips);  // swapped in one go, so two overlapping calls can't double the row
}

function weatherInfo(code, isDay) {
  if (code === 0) return isDay ? ["sun", "Clear"] : ["moon", "Clear"];
  if (code <= 2) return [isDay ? "cloud-sun" : "cloud-moon", "Partly cloudy"];
  if (code === 3) return ["cloud", "Cloudy"];
  if (code <= 48) return ["fog", "Fog"];
  if (code <= 67 || (code >= 80 && code <= 82)) return ["rain", "Rain"];
  if (code <= 86) return ["snow", "Snow"];
  return ["storm", "Storm"];
}

async function renderWeather() {
  const out = document.getElementById("weather");
  if (!show.weather || !city) return out.replaceChildren();
  const key = `${city.lat},${city.lon}`;  // two cities can share a name
  if (weather?.key !== key || Date.now() - weather.at >= WEATHER_MAX_AGE || !city.timezone) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
      if (!res.ok) throw new Error(res.status);
      const { current, timezone } = await res.json();
      if (city.timezone !== timezone) {
        city.timezone = timezone;
        chrome.storage.local.set({ city });
        pickTimeZone();
      }
      weather = { key, at: Date.now(), temp: Math.round(current.temperature_2m), code: current.weather_code, isDay: current.is_day === 1 };
      chrome.storage.local.set({ weather });
    } catch {
      // Offline or API down: keep the last reading, the page must still work.
    }
  }
  if (weather?.key !== key) return out.replaceChildren();
  const [icon, label] = weatherInfo(weather.code, weather.isDay);
  const now = document.createElement("span");
  now.textContent = `${weather.temp}°C ${label}`;
  const place = document.createElement("span");
  place.textContent = city.name;
  out.replaceChildren(svgIcon(icon), now, svgIcon("pin"), place);
}

// A tab left open or a suspended PC comes back with a stale clock and weather.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  tick();
  renderWeather();
});

for (const box of document.querySelectorAll("[data-show]")) {
  box.onclick = () => {
    const key = box.dataset.show;
    const allowed = NEEDS[key] && box.checked ? chrome.permissions.request(NEEDS[key]) : Promise.resolve(true);
    allowed.then((ok) => {
      if (!ok) return void (box.checked = false);
      show[key] = box.checked;
      chrome.storage.local.set({ show });
      applyShow();
      if (key === "visited" || key === "visitedIcons") renderVisited();
      if (key === "siteIcons") renderLinks();
      if (key === "weather") {
        renderWeather();
        if (box.checked && !city) document.getElementById("city").focus();
      }
    }).catch((e) => {
      box.checked = !box.checked;
      alert(`Could not change that: ${e.message}`);
    });
  };
}

const perPageInput = document.getElementById("per-page");
perPageInput.onchange = () => {
  const value = perPageInput.valueAsNumber;
  if (!Number.isInteger(value) || value < 1 || value > 24) return void (perPageInput.value = perPage);
  perPage = value;
  chrome.storage.local.set({ perPage });
  renderChips();
  renderVisited();
};

let savedTimeZone = "";
const timeZoneInput = document.getElementById("time-zone");

function pickTimeZone() {
  timeZone = savedTimeZone || (BROWSER_TIME_ZONE === "UTC" && city?.timezone) || BROWSER_TIME_ZONE;
  timeZoneInput.placeholder = timeZone;
  tick();
}

// The full zone list is about 400 entries, so it only gets built when someone needs it.
timeZoneInput.onfocus = () => {
  timeZoneInput.onfocus = null;
  document.getElementById("time-zones").replaceChildren(...Intl.supportedValuesOf("timeZone").map((zone) => new Option(zone)));
};
timeZoneInput.onchange = () => {
  const zone = timeZoneInput.value.trim();
  try {
    if (zone) new Intl.DateTimeFormat(undefined, { timeZone: zone });
  } catch {
    timeZoneInput.value = savedTimeZone;
    return alert(`Unknown time zone: ${zone}`);
  }
  savedTimeZone = zone;
  chrome.storage.local.set({ timeZone: zone });
  pickTimeZone();
};

document.getElementById("city-form").onsubmit = async (event) => {
  event.preventDefault();
  const input = document.getElementById("city");
  const query = input.value.trim();
  if (!query) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(res.status);
    const place = (await res.json()).results?.[0];
    if (!place) return alert(`City not found: ${query}`);
    // The label shows which match was picked
    city = { name: place.name, label: [place.name, place.country].filter(Boolean).join(", "), lat: place.latitude, lon: place.longitude };
    input.value = city.label;
    chrome.storage.local.set({ city });
    renderWeather();
  } catch {
    alert("Could not reach the weather service.");
  }
};

document.getElementById("link-form").onsubmit = (event) => {
  event.preventDefault();
  const input = document.getElementById("link-url");
  const url = parseUrl(input.value.trim());
  if (!url) return alert("That is not a web address.");
  if (!links.some((link) => link.url === url)) links.push({ url });
  saveLinks();
  renderLinks();
  input.value = "";
};

chrome.storage.local.get().then((saved) => {
  show = { ...show, ...saved.show };
  links = (saved.links ?? []).map((link) => (typeof link === "string" ? { url: link } : link));  // 1.2 saved plain URLs
  icons = saved.icons ?? icons;
  city = saved.city ?? city;
  weather = saved.weather ?? weather;
  perPage = saved.perPage ?? perPage;
  perPageInput.value = perPage;
  savedTimeZone = saved.timeZone ?? savedTimeZone;
  timeZoneInput.value = savedTimeZone;
  pickTimeZone();
  showWall(saved.wallpaper);
  for (const box of document.querySelectorAll("[data-show]")) box.checked = show[box.dataset.show];
  if (city) document.getElementById("city").value = city.label ?? city.name;
  applyShow();
  renderLinks();
  renderWeather();
}).finally(() => document.body.classList.add("ready"));
