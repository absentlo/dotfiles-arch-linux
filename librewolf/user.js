// Unload background tabs when RAM runs low instead of swapping (8 GB machine)
user_pref("browser.tabs.unloadOnLowMemory", true);
// Rice: load chrome/userChrome.css, compact density, built-in dark theme as the base
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.compactmode.show", true);
user_pref("browser.uidensity", 1);
user_pref("extensions.activeThemeID", "firefox-compact-dark@mozilla.org");
