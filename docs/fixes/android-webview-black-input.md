# Android WebView — search input renders as a black box (Note 9 / Android 9)

## Cause
The search input stayed non-opaque/native: it used theme tokens
(`background-color: var(--app-surface); color: var(--app-text)`), the app set
`color-scheme: dark` in night mode, and the focused input got promoted to a
hardware/composited layer. Old WebView mis-composites that layer and paints it black.
`adjustResize` made it worse.

## Changes (final)
- `src/components/QuranSearch.css` — `.quran-search-input` / `:focus` / `::placeholder`:
  solid `background:#ffffff`, `color:#1b5e20`, `-webkit-text-fill-color:#1b5e20`,
  `caret-color`, `opacity:1`, `filter:none`, `backdrop-filter:none`, `transform:none`,
  `-webkit-appearance:none`, `color-scheme:light`. (The `-webkit-text-fill-color` is what
  keeps the text visible on old WebView.)
- `android/app/src/main/AndroidManifest.xml`: `windowSoftInputMode` `adjustResize` → `adjustPan`.

## What was tried (reverted)
- Replacing the `<input>` with a `contenteditable` div (to survive edge-to-edge): fixed the
  Note 9 but rendered a blank "white box" (invisible text) on the S6 / Tab Active 3, so it
  was reverted.

## How to spot it again
Input looks solid black **only while focused** (text invisible), but typing/back works.
Suspect: transparent/`var()` background, `color-scheme:dark`, or effects on the input/
ancestors, plus `adjustResize` on old WebView. Fix: solid opaque background + explicit
`color` + `-webkit-text-fill-color` + `-webkit-appearance:none` + `color-scheme:light`, and
use `adjustPan`.
