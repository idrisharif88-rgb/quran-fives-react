# Android keyboard — one fix across three screen sizes (Note 9 · Tab Active 3 · Tab S6)

## Symptom
On a tablet, focusing an input (e.g. the sign-in email on the welcome screen) shrank the
whole app into the top part of the screen; a white box filled the space down to the
keyboard. After a first fix, a thinner white strip still flashed while the keyboard slid up.
Same family as `android-webview-black-input.md` (black there, white here), but a different cause.

## Cause
Native, not CSS — the WebView itself shrank (`innerHeight` 248 of 960 CSS px).
Three mechanisms each moved the page for the same keyboard:
1. `windowSoftInputMode="adjustPan"` (manifest) pans the window.
2. The Keyboard plugin (`resizeOnFullScreen: true` in `capacitor.config.json`) shrinks the
   content view to the visible frame.
3. Capacitor 8's `SystemBars` pads the WebView's parent by the IME height.

Together they subtract the keyboard twice. The gap itself is the parent view, whose colour
comes from the theme's `android:background` (`#f4f6f8`), so it showed white even at night.

## Fix (final) — `MainActivity.java`, large screens only
Phones such as the Note 9 keep the settings from the black-input fix untouched.
A large screen is `smallestScreenWidthDp >= 600` (Note 9 ≈ 411; Tab S6 / Tab Active 3 above 600).

1. **Before `super.onCreate`:** load `CapConfig.loadDefault(this)`, set the Keyboard plugin's
   `resizeOnFullScreen` to `false` in its config JSON, and assign it to `config` — so the plugin
   is created without its resize. (Plugin config is global; this is the per-device switch.)
2. **After edge-to-edge:** `setSoftInputMode(SOFT_INPUT_ADJUST_NOTHING)` — no pan.
   Only SystemBars' IME padding remains, as in the Daftar app (which never set the plugin option).
3. **In `applyWindowBackground`:** also paint the WebView's parent with the page colour,
   so the padding revealed while the keyboard animates matches the page instead of `#f4f6f8`.

## Verified on three screen sizes
| Device | Screen | Resolution | Shortest side | Path |
|---|---|---|---|---|
| Galaxy Note 9 | 6.4″ phone | 1440×2960 | ≈ 411dp | phone — `adjustPan` + plugin resize, unchanged |
| Galaxy Tab Active 3 | 8″ tablet | 1200×1920 | 600dp | large screen — this fix |
| Galaxy Tab S6 | 10.5″ tablet | 1600×2560 | ≈ 800dp | large screen — this fix |

On all three the page sits flush above the keyboard: no box, no flash, no black input.

## How to spot it again
Inspect the debug build (`adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`) and
read `innerHeight` with the keyboard open. Far smaller than the space above the keyboard
means two mechanisms are both resizing — keep exactly one per device class.
