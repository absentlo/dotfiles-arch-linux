// resistFingerprinting makes the browser report UTC, so the clock takes the zone from the
// time zone field, then from the weather city, and only then from the browser.
const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
let timeZone = BROWSER_TIME_ZONE;
// Logos ship inside the add-on, already in the palette, so they never touch the network.
const SEARCH = {
  "ddg-noai": { logo: "engine-ddg.png", label: "DuckDuckGo", option: "DuckDuckGo (no AI)", url: "https://noai.duckduckgo.com/" },
  ddg: { logo: "engine-ddg.png", label: "DuckDuckGo", option: "DuckDuckGo", url: "https://duckduckgo.com/" },
  brave: { logo: "engine-brave.png", label: "Brave", option: "Brave Search", url: "https://search.brave.com/search" },
  startpage: { logo: "engine-startpage.png", label: "Startpage", option: "Startpage", url: "https://www.startpage.com/do/search" },
  mojeek: { logo: "engine-mojeek.png", label: "Mojeek", option: "Mojeek", url: "https://www.mojeek.com/search" },
  google: { logo: "engine-google.png", label: "Google", option: "Google", url: "https://www.google.com/search" },
};
const PREF_CHOICES = { clock: ["24", "12"], clockSize: ["s", "m", "l"], tempUnit: ["c", "f"], search: Object.keys(SEARCH) };
const CLOCK_SIZES = { s: "44px", m: "64px", l: "96px" };
const MAX_NAME = 30;
let prefs = { clock: "24", clockSize: "m", tempUnit: "c", search: "ddg-noai", name: "", wallDim: 60 };
const clock = document.getElementById("clock");
const date = document.getElementById("date");
const greeting = document.getElementById("greeting");
let clockTimer;

function tick() {
  clearTimeout(clockTimer);
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: prefs.clock === "12" ? "h12" : "h23", timeZone });
  date.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", timeZone });
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone }));
  const hello = h < 6 ? "Late night" : h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening";
  greeting.textContent = prefs.name ? `${hello}, ${prefs.name}` : hello;
  // Wake once per minute, on the minute, and never while the tab is in the background
  if (!document.hidden) clockTimer = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}
tick();

// Wallpaper: stored as a data URL because Brave's storage.local can't hold Blobs (this page is shared with Brave).
const MAX_WALL_BYTES = 10 * 1024 * 1024;
const MAX_WALL_WIDTH = 1920;
const wallFile = document.getElementById("wall-file");
const wallRemove = document.getElementById("wall-remove");

function showWall(url) {
  document.body.style.backgroundImage = url ? `url("${url}")` : "";
  document.body.classList.toggle("has-wall", Boolean(url));
  wallRemove.hidden = !url;
}

// The saved image is read and decoded on every new tab, so it's stored small. WebP keeps transparency.
// shortcut: 4K screens get a slightly soft wallpaper and animations become still, raise the width or keep the original if anyone asks.
async function shrinkWall(file) {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, MAX_WALL_WIDTH / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/webp", 0.8);
    if (!url.startsWith("data:image/")) throw new Error("image has no usable size");
    return url;
  } finally {
    URL.revokeObjectURL(src);
  }
}

document.getElementById("wall-pick").onclick = () => wallFile.click();
wallRemove.onclick = () => chrome.storage.local.remove("wallpaper").then(() => showWall(null));

wallFile.onchange = async () => {
  const file = wallFile.files[0];
  wallFile.value = "";  // lets the same file be picked again
  if (!file) return;
  if (!file.type.startsWith("image/")) return alert("That file is not an image.");
  if (file.size > MAX_WALL_BYTES) return alert("Image is over 10 MB, pick a smaller one.");
  let wallpaper;
  try {
    wallpaper = await shrinkWall(file);
  } catch {
    return alert("Could not read that image.");
  }
  chrome.storage.local.set({ wallpaper })
    .then(() => showWall(wallpaper))
    .catch((e) => alert(`Could not save the wallpaper: ${e.message}`));
};

// Customize panel: which sections show, my pages, most visited, weather.
const WEATHER_MAX_AGE = 30 * 60 * 1000;  // new tabs reuse the last reading instead of hitting the network
const MAX_VISITED = 24;
const WHEEL_GAP = 200;  // ms between page flips, a touchpad fires many wheel events per swipe
const ICON_SIZE = 32;
const ICON_DARKEST = 0x5A;
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
      weather = { key, at: Date.now(), temp: current.temperature_2m, code: current.weather_code, isDay: current.is_day === 1 };
      chrome.storage.local.set({ weather });
    } catch {
      // Offline or API down: keep the last reading, the page must still work.
    }
  }
  if (weather?.key !== key) return out.replaceChildren();
  const [icon, label] = weatherInfo(weather.code, weather.isDay);
  const now = document.createElement("span");
  const temp = prefs.tempUnit === "f" ? weather.temp * 9 / 5 + 32 : weather.temp;
  now.textContent = `${Math.round(temp)}°${prefs.tempUnit.toUpperCase()} ${label}`;
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

function applyPrefs() {
  document.body.style.setProperty("--wall-dim", prefs.wallDim / 100);
  document.documentElement.style.setProperty("--clock-size", CLOCK_SIZES[prefs.clockSize]);
  const engine = SEARCH[prefs.search];
  const search = document.querySelector("main form");
  search.action = engine.url;
  search.querySelector("input").placeholder = `Search ${engine.label}`;
  search.querySelector("img").src = engine.logo;
  tick();
  renderWeather();
}

document.getElementById("search-engine").append(...Object.entries(SEARCH).map(([key, engine]) => new Option(engine.option, key)));

for (const field of document.querySelectorAll("[data-pref]")) {
  const key = field.dataset.pref;
  // input applies it live, change saves it, so dragging the slider doesn't write on every step
  field.oninput = () => {
    prefs[key] = field.type === "range" ? field.valueAsNumber : field.value.trim();
    applyPrefs();
  };
  field.onchange = () => chrome.storage.local.set({ prefs });
}

// Backup: a JSON file that carries the settings into a new profile.
const BACKUP_APP = "graphite-start";
const MAX_BACKUP_BYTES = 30 * 1024 * 1024;  // room for the largest allowed wallpaper once in base64
const MAX_LINKS = 500;
const BACKUP_KEYS = ["show", "links", "perPage", "timeZone", "city", "prefs", "wallpaper"];
const IMAGE_DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/;

// A backup can come from anyone, so only known keys with valid values get through.
function cleanBackup(raw) {
  if (raw?.app !== BACKUP_APP) throw new Error("This is not a Graphite Start backup.");
  const clean = {};
  if (raw.show && typeof raw.show === "object") {
    clean.show = {};
    for (const key of Object.keys(show)) if (typeof raw.show[key] === "boolean") clean.show[key] = raw.show[key];
  }
  if (Array.isArray(raw.links)) {
    clean.links = [];
    for (const link of raw.links.slice(0, MAX_LINKS)) {
      const url = typeof link?.url === "string" ? parseUrl(link.url) : null;
      if (!url) continue;
      const entry = { url };
      if (typeof link.name === "string") entry.name = link.name.trim().slice(0, 40);
      if (typeof link.iconOnly === "boolean") entry.iconOnly = link.iconOnly;
      clean.links.push(entry);
    }
  }
  if (Number.isInteger(raw.perPage) && raw.perPage >= 1 && raw.perPage <= 24) clean.perPage = raw.perPage;
  if (typeof raw.timeZone === "string" && raw.timeZone) {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: raw.timeZone });
      clean.timeZone = raw.timeZone;
    } catch {
      // Unknown zone: leave it out and let the clock follow the browser
    }
  }
  const place = raw.city;
  if (typeof place?.name === "string" && Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    clean.city = { name: place.name.slice(0, 100), lat: place.lat, lon: place.lon };
    if (typeof place.label === "string") clean.city.label = place.label.slice(0, 200);
    if (typeof place.timezone === "string") clean.city.timezone = place.timezone.slice(0, 100);
  }
  if (raw.prefs && typeof raw.prefs === "object") {
    clean.prefs = {};
    for (const [key, choices] of Object.entries(PREF_CHOICES)) if (choices.includes(raw.prefs[key])) clean.prefs[key] = raw.prefs[key];
    if (typeof raw.prefs.name === "string") clean.prefs.name = raw.prefs.name.trim().slice(0, MAX_NAME);
    if (Number.isInteger(raw.prefs.wallDim) && raw.prefs.wallDim >= 0 && raw.prefs.wallDim <= 90) clean.prefs.wallDim = raw.prefs.wallDim;
  }
  // Goes inside a CSS url(""), so the pattern also keeps quotes and other CSS out
  if (typeof raw.wallpaper === "string" && IMAGE_DATA_URL.test(raw.wallpaper)) clean.wallpaper = raw.wallpaper;
  return clean;
}

document.getElementById("export").onclick = async () => {
  try {
    const saved = await chrome.storage.local.get(BACKUP_KEYS);
    // links come from memory: storage can still hold the plain URLs of older builds
    const blob = new Blob([JSON.stringify({ app: BACKUP_APP, format: 1, ...saved, links })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "graphite-start-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) {
    alert(`Could not export: ${e.message}`);
  }
};

const importFile = document.getElementById("import-file");
document.getElementById("import").onclick = () => importFile.click();
importFile.onchange = async () => {
  const file = importFile.files[0];
  importFile.value = "";  // lets the same file be picked again
  if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error("That file is too large to be a backup.");
    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      throw new Error("That file is not a backup.");
    }
    const clean = cleanBackup(raw);
    if (!confirm("Replace your current start page settings with this backup?")) return;
    await chrome.storage.local.set(clean);  // first, so a failed write can't leave the settings empty
    await chrome.storage.local.remove(BACKUP_KEYS.filter((key) => !(key in clean)));
    location.reload();
  } catch (e) {
    alert(`Could not import: ${e.message}`);
  }
};

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
    if (NEEDS.weather && !(await chrome.permissions.request(NEEDS.weather))) return;
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

chrome.storage.local.get().then(async (saved) => {
  show = { ...show, ...saved.show };
  // Firefox's consent for data the add-on sends. Brave has no such permission and would throw on the key.
  if ((await chrome.permissions.getAll()).data_collection) {
    NEEDS.weather = { data_collection: ["locationInfo"] };
    NEEDS.siteIcons.data_collection = ["browsingActivity"];
  }
  // A backup from another profile, or a permission removed in about:addons, can leave a box ticked with no access
  for (const key of Object.keys(NEEDS)) {
    if (show[key] && !(await chrome.permissions.contains(NEEDS[key]))) show[key] = false;
  }
  prefs = { ...prefs, ...saved.prefs };
  for (const field of document.querySelectorAll("[data-pref]")) field.value = prefs[field.dataset.pref];
  links = (saved.links ?? []).map((link) => (typeof link === "string" ? { url: link } : link));  // older builds saved plain URLs
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
  applyPrefs();
  renderLinks();
}).finally(() => document.body.classList.add("ready"));
