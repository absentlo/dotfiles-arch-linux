// Edit your links here, then reload the extension.
// LibreWolf's resistFingerprinting reports UTC to pages; naming the zone keeps the clock local.
const TIME_ZONE = "America/Tijuana";
const LINKS = [
  ["Dotfiles", "https://github.com/absentlo/dotfiles-arch-linux"],
  ["Arch Wiki", "https://wiki.archlinux.org/"],
  ["AUR", "https://aur.archlinux.org/"],
  ["YouTube", "https://www.youtube.com/"],
  ["r/unixporn", "https://www.reddit.com/r/unixporn/"],
  ["Outlook", "https://outlook.live.com/mail/"],
];

const nav = document.getElementById("links");
for (const [name, url] of LINKS) {
  const a = document.createElement("a");
  a.textContent = name;
  a.href = url;
  nav.append(a);
}

const clock = document.getElementById("clock");
const date = document.getElementById("date");
const greeting = document.getElementById("greeting");

function tick() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
  date.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }));
  greeting.textContent = h < 6 ? "Late night" : h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening";
  // Wake once per minute, on the minute (no per-second timer)
  setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}
tick();
