# Android WebView — black rectangle/gap above the nav bar (Samsung Note 9)

## Cause
On the Note 9 (Android 9) the WebView window is laid out ~48px (one nav-bar height)
**shorter** than the screen — a double navigation-bar inset. That 48px strip shows the
native window background (black) between the app and the nav bar, and again above the
keyboard when searching. `fitsSystemWindows`, letterbox flags and CSS `height` don't fix it.

## What was tried (reverted)
- Edge-to-edge (`WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`) removes the
  gap entirely, **but it breaks the search input on old WebView**: the native `<input>`
  renders black, and a `contenteditable` div renders as a blank "white box" (text invisible)
  on the Galaxy S6 / Tab Active 3. So edge-to-edge is not viable without a reliable custom
  field.

## Final approach — paint the gap to match the app background
- `android/app/src/main/res/values/styles.xml`: window background `@null` → `#f4f6f8`
  (day) — the strip becomes invisible in day mode.
- `MainActivity.java`: `setWindowBackground(color)` JS bridge; `App.jsx` theme effect calls
  it with `getPageBg(isNightMode, accentTheme)` so night mode paints `#0c1116`.

## How to spot it again
A fixed strip at the very bottom (above the nav bar) that also appears above the keyboard.
Diagnosis: compare `window.outerHeight` to `screen.height` — if the WebView is ~48px short,
it's the double nav-bar inset.
