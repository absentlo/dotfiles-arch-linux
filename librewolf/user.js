// Graphite LibreWolf preferences. Applied every time the browser starts.
// The "Perf" lines are for low-spec PCs; delete any you don't want.

// Perf: unload background tabs when RAM runs low instead of swapping
user_pref("browser.tabs.unloadOnLowMemory", true);
// Rice: load chrome/userChrome.css, compact density, built-in dark theme as the base
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.compactmode.show", true);
user_pref("browser.uidensity", 1);
user_pref("extensions.activeThemeID", "firefox-compact-dark@mozilla.org");
// Rice: classic design. New profiles default to Nova, which adds a colored glow on the active tab and a colored search button
user_pref("browser.nova.enabled", false);
// Rice: no bookmarks bar or its "place your bookmarks here" message on new tabs. Delete this line to use the bar
user_pref("browser.toolbars.bookmarks.visibility", "never");
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
// Perf: GPU video decode when the driver supports it (falls back to the CPU on error)
user_pref("media.ffmpeg.vaapi.enabled", true);
// Perf: no AV1. Most older CPUs and GPUs can only decode it in software, so sites fall back to a lighter format
user_pref("media.av1.enabled", false);
// Perf: fewer cached back/forward pages, for around 8 GB of RAM
user_pref("browser.sessionhistory.max_total_viewers", 2);
// Perf: write session to disk every 60s instead of 15s
user_pref("browser.sessionstore.interval", 60000);
// Look: dark about: pages, thin overlay scrollbars. Websites still see "light": resistFingerprinting hides this from them
user_pref("layout.css.prefers-color-scheme.content-override", 0);
user_pref("browser.theme.content-theme", 0);
user_pref("widget.gtk.overlay-scrollbars.enabled", true);
// Rice: no forced underline on every link (was on; turned off by choice)
user_pref("layout.css.always_underline_links", false);
// Rice: plain tab tooltip instead of the preview card (it showed the start page's internal ID)
user_pref("browser.tabs.hoverPreview.enabled", false);
