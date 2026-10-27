// Unload background tabs when RAM runs low instead of swapping (8 GB machine)
user_pref("browser.tabs.unloadOnLowMemory", true);
// Rice: load chrome/userChrome.css, compact density, built-in dark theme as the base
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.compactmode.show", true);
user_pref("browser.uidensity", 1);
user_pref("extensions.activeThemeID", "firefox-compact-dark@mozilla.org");
// Rice: horizontal tabs (vertical tabs off)
user_pref("sidebar.revamp", false);
user_pref("sidebar.verticalTabs", false);
// Rice: cleaner toolbar - no Firefox View, extensions button only when needed
user_pref("browser.tabs.firefox-view", false);
user_pref("extensions.unifiedExtensions.button.always_visible", false);
// Rice: empty new tab page (background color in chrome/userContent.css)
user_pref("browser.newtabpage.activity-stream.feeds.topsites", false);
user_pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
user_pref("browser.newtabpage.activity-stream.feeds.section.highlights", false);
user_pref("browser.newtabpage.activity-stream.showSearch", false);
user_pref("browser.newtabpage.activity-stream.showWeather", false);
// Rice: compact - narrower min tab width, no UI animations (saves CPU/GPU)
user_pref("browser.tabs.tabMinWidth", 60);
user_pref("ui.prefersReducedMotion", 1);
// Perf: GPU video decode (HD 8490/UVD3 = H.264 only; VP9/AV1 still use CPU, falls back on error)
user_pref("media.ffmpeg.vaapi.enabled", true);
// Perf/RAM: fewer content processes and cached back/forward pages (8 GB machine)
user_pref("dom.ipc.processCount", 4);
user_pref("browser.sessionhistory.max_total_viewers", 2);
// Perf: write session to disk every 60s instead of 15s
user_pref("browser.sessionstore.interval", 60000);
// Look: dark pages/about: pages, thin overlay scrollbars
user_pref("layout.css.prefers-color-scheme.content-override", 0);
user_pref("browser.theme.content-theme", 0);
user_pref("widget.gtk.overlay-scrollbars.enabled", true);
