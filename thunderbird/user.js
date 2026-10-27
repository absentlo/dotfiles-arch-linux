// Block remote images in emails: senders can't track opens via tracking pixels
user_pref("mailnews.message_display.disable_remote_image", true);
// Rice: built-in dark theme, compact layout
user_pref("extensions.activeThemeID", "thunderbird-compact-dark@mozilla.org");
user_pref("mail.uidensity", 0);
// Rice: load chrome/userChrome.css (Graphite palette, see the LibreWolf one)
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
// Rice: no start-page animations, matches LibreWolf
user_pref("ui.prefersReducedMotion", 1);
