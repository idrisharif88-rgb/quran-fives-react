# Project Structure & Organization Rules

- **Modular Development:** Every new feature or update must be split into its respective files. Do not put everything in one file.
- **File Placement:** - Components go to `src/components/`.
    - Logic/Hooks go to `src/hooks/`.
    - Styles go to `src/styles/` or as CSS modules next to the component.
    - Constants/Data go to `src/constants/` or `src/utils/`.
- **No Spaghetti Code:** Always prioritize readability and maintainability. If a file exceeds 200 lines, suggest breaking it down into smaller sub-components.
- **Consistency:** Follow the existing project structure (Vite + React + Capacitor). 
- **Refactoring:** Before implementing a new update, check if an existing file should be modified or if a new file is required to keep the structure clean.

# Verification Rules

Establish a baseline first, scope checks to changed files, and grep for orphaned references after deletions.

- **Baseline before blame:** Lint/test errors may already exist on `main`. Measure first (`git stash` → run the check → `git stash pop` → run again) and report only what the change introduced. Do not fix pre-existing errors unless asked.
- **Scope checks to the diff:** Run checks on changed files (`npx eslint src/path/File.jsx`) rather than the whole repo, so real results aren't buried in existing noise.
- **Sweep after deletions:** When removing code, `grep` every identifier it touched to catch orphaned state, refs, and dead handlers. Deleting is riskier than adding — the build catches unused imports, not unused state.
- **Keep the diff focused:** Revert incidental churn (e.g. `package-lock.json` touched by a local `npm install`). Install throwaway tooling with `npm install --no-save`.
- **Report honestly:** State what passed, what failed, and what was skipped.

# Navigation Step Rules

`currentIndex` is a position in a list whose length depends on `stepSize` (1, 2, 3, 5, 7). Nothing about it is absolute. `src/utils/stepNavigation.js` owns the maths; `getSurahAndRange(idx, step = 5)` reads from it.

- **Never write a group total as a literal.** `1202` was typed in six places and every one was a bug waiting for the step to change. Use `totalGroups(step)` — it computes 6236 / 3091 / 2040 / 1202 / 841. The same applies to `% 5` and `floor(verseCount / 5)` in validation.
- **The default `step = 5` is load-bearing.** It is what lets `KhmasiyatQuiz` and every other fives-only caller keep working with no argument passed. `stepNavigation.test.js` pins `getSurahAndRange(i, 5)` to the pre-step implementation across all 1202 indices — if that test fails, the fives behaviour changed and users lose their place.
- **Any stored index is step-relative and needs its step stored beside it.** `starredByStep` keys stars by step (star #7 at step 5 is a different verse than at step 7); the QR payload carries `st`; `reviewAnchor` is dropped when the step changes. A bare index restored under the wrong step lands on the wrong verse silently.
- **Index lists computed for fives stay behind `step === DEFAULT_STEP`.** `similarKhmasiyatIndices` (the double-verse cases) is the existing one.
- **Not every surah has a group at every step.** `floor(verseCount / step) === 0` for الكوثر at step 7 and four surahs at step 5. `firstIndexOfSurah` returns `null` there — disable the entry with a reason rather than jumping somewhere arbitrary.
- **Changing the step must preserve the reading place** by converting (surah, ayah) through `indexForSurahAyah`, never by keeping the raw index.

# Cloud Sync Rules

- **Deploy order:** client and server share a request contract (`baseUpdatedAt`, `writeId`, `Authorization: Basic`). Deploy the server BEFORE building the APK — mismatched pairs fail with 400.
- **`.env` is required to build:** without `VITE_SYNC_URL` the APK builds fine but sync is silently disabled (`SYNC_ENABLED=false`). Check it exists before any release build. There is no shared sync code any more — never bake a secret into the APK.
- **One account, two jobs.** `useAccount` (email + password) unlocks both state sync and the khitma record. New accounts must be emails, confirmed by a mailed code; *login* is never format-checked, because a migrated owner account may be a plain username (when `OWNER_EMAIL` was not set at first start). Signed in means sync is on. Credentials live under the legacy key `quran-fives-khitma-creds-v1` so pre-account logins survive the update — don't rename it.
- **Two-step sign-in is enforced by the server, not the form.** Data endpoints need the password *and* an `X-Device` key, issued only after a mailed code is confirmed. The key is stored inside the saved account (`device`); dropping it means a 401 and a forced re-login.
- **New accounts wait for the owner.** Data endpoints answer 403 until the owner approves the account in «إدارة المستخدمين». 403 is not a failure and not a logout: the app shows `AccountPending`, keeps working locally, and raises no sync warning.
- **A sync timestamp belongs to an account** (`src/utils/syncMeta.js`). `getSyncMeta()` returns 0 when the stored stamp was written by a different user, so switching accounts on one device shows the startup choice instead of pushing with another account's base. An unstamped (pre-accounts) stamp is valid only for a non-email account; trusting it for an email account sent a stale base to an empty cloud and 409'd forever.
- **Sign-out leaves no account data on the device.** `handleSignOut` uploads the latest snapshot, then `wipeDeviceData()` and a reload; the data comes back at the next sign-in. If the upload cannot happen (offline, account not approved) it must warn and wait for an explicit «اخرج وامسح» — never wipe silently. A forced sign-out on 401 does *not* wipe, because nothing could be uploaded. Hifz recordings are device files, not synced, and are not wiped.
- **A clean device downloads without asking.** When the cloud has state and `isPristineState()` says the device holds no user content, the startup check pulls and reloads instead of showing «نسختان مختلفتان». Preferences are not content.
- **«فقهيات» is the owner's.** The menu entry and screen render only when `accountStatus.admin`; the last known status is cached (`quran-fives-account-status-v1`) so it works offline. The text still ships inside the APK.
- **Never upload one user's data into another's account silently.** When the cloud is empty and `deviceDataIsForeign()` is true, `StartupSyncPrompt` (`emptyCloud`) asks: start empty, or copy this device's data. Both the startup check and the retry button go through `startupChoiceFor`.
- **The server is several files** (`index.js`, `app.js`, `authRoutes.js`, `adminRoutes.js`, `devices.js`, `mailTemplates.js`, `accounts.js`, `otp.js`, `mailer.js`, `store.js`, `rateLimit.js`). Deploy with `scp server/*.js`, not `index.js` alone. `MAX_USERS` is a server env var — raising it needs no release.
- **Mail needs `RESEND_API_KEY` + `MAIL_FROM` on the server.** Without them codes are printed to the log, not sent, and nobody can sign up. That fallback is for local testing only.
- **Never let fast-ticking state gate cloud pushes:** `nightTimerSeconds` ticks every second; putting it in the push effect's deps reset the debounce forever and killed sync while the timer ran. Ticking values are saved locally and ride along with the next real change — keep them out of push-trigger deps.
- **One push in flight:** `cloudPushBusyRef` serializes uploads; concurrent pushes 409 against each other.
- **Clear saved credentials on 401 only.** The khitma `catch` used to delete them on *any* failure, so one dropped request logged the user out and the sign-in came back forever. A network error is not an auth error — keep the credentials, serve the record from `quran-fives-khitma-cache-v1`, and retry in the background.
- **No push before a verified pull.** `khitmaBaseVerifiedRef` gates it: unlocked-from-cache means `khitmaBaseRef` is stale, and writing with a stale base can overwrite the server. Edits made in that state are held in `khitmaPendingRef` and merged by `id` on the first successful pull.
- **Forced sync needs no server change.** `forcePushLocal` / `forcePullRemote` read the server's current `updatedAt` and use it as `baseUpdatedAt`, so the write always wins inside the existing contract. Don't add a force flag to `server/index.js` for this — it would mean a deploy for nothing.

# Hifz Rules

- **The day's portion is one unit.** `rules.versesPerDay` (1, 3, 5 or 7, chosen at start) sets how many consecutive verses are memorised through the same five steps. Completing the last step appends one `memorizedOn` entry *per verse*, so every verse ages by its own clock and the boxes need no change. Use `portionOf` / `plan.verse.indices` / `plan.verse.refs`; `plan.verse.index` and `.ref` are only the first verse.
- **`versesPerDay: 1` is the default and load-bearing**: programmes stored before the choice existed have no such rule and must stay one verse a day (`withDefaultRules`).
- **The numbers are the owner's rules** (3 listens, 40 repeats, 5 times, 25 days, 6-day cycle, runs of 5). Do not tune them.
- **A recording carries all its verses.** `refs` is stored with each take so the listen view highlights the whole portion (`hifzRecordingRefs.js`); a portion can span two pages. Dropping `refs` in `writeRecording` silently highlighted only the first verse. The mushaf page view belongs to the record step; «تسجيلاتي» plays in place (`useRecordingPlayer`).
- **`origin` shifts where memorising starts.** `verseAt(direction, index, origin)` wraps around the mushaf, so indices and boxes stay untouched. Choosing a start verse needs the `hifzCustomStart` permission, granted per user by the owner (who always has it).
- **The owner may open another portion the same day** (`openExtraPortion`, for testing). `state.extra` lifts the one-portion-a-day lock until that portion is done.
- **Supervision is specified but not built** (stop after 3 unfinished days in a 30-day cycle, supervisor reopens, excused freeze for new verses only, reviews always allowed). `status` and `dayLog` in `hifzState.js` are the hooks left for it.

# Theming Rules

Colour is a token system on `.app-container`. Two independent switches — accent (green/gold) × mode (day/night) — produce four palettes. Never hardcode an accent colour.

- **Three accent tokens, three different jobs.** `--app-accent` fills backgrounds, and text on it must use `--app-accent-contrast`. `--app-accent-ink` is the accent used as *text or border on a light surface*. `--app-accent-deep` stays dark in BOTH modes, for elements that put light text on the accent. Choosing the wrong one breaks contrast silently, and usually in only one of the four palettes.
- **`--app-accent-deep` exists to protect commit `cffa3f3`.** The «آخر آية» button is dark green even at night because the bright night accent measured 2.44:1 there. Don't collapse it back into `--app-accent`.
- **Page background lives in three places.** `html, body, #root` in CSS, an inline `documentElement.style.backgroundColor` in `App.jsx`, and `meta[theme-color]` (the Android status bar). Inline style beats CSS — drive all three from `getPageBg()` in `src/constants/themes.js`, or you get mismatched edges on overscroll and in the safe-area insets.
- **Measure contrast before choosing a shade.** A light accent on the light day background is invisible as a *shape*: gold `#ffd700` is 1.29:1 against the day page, and the floor for UI component boundaries is 3:1. Both themes therefore go dark by day and bright by night.
- **Watch for hardcoded text colours.** The khatma save buttons set `color: '#fff'` inline, so `--app-save-grad-*` must stay dark enough for white text regardless of theme.
- **New palettes go in `src/styles/themes.css`,** imported after `App.css` so they win the cascade. Green remains the default, defined in `App.css`.

# Offline Rules

The APK must work with no network. Only recitation audio may hit the internet.

- **No CDN references in CSS or `index.html`.** `src/App.css` opened with an `@import` from `fonts.googleapis.com`; offline it silently failed and every font — Tajawal, Amiri, Amiri Quran, Noto Naskh, Scheherazade — fell back to the system font. Fonts are now self-hosted in `src/assets/fonts/` with `@font-face` rules in `src/styles/fonts.css`.
- **`src/styles/fonts.css` is generated — don't hand-edit it.** Re-run `scripts/fetch-fonts.sh src/assets/fonts src/styles/fonts.css` to add a family or weight. It keeps the `arabic` + `latin` subsets only and drops the rest.
- **A failing network request must never look like a styling bug.** Test any new asset with the device in airplane mode before shipping.

# Back Button Rules

- **Every overlay must be reachable by `handleHardwareBack`.** State kept inside a component (CornerNav's surah and step lists) is invisible to it, so back skipped the list and showed the exit prompt. Such a component takes a `backRef` and puts its own close function there while open (`hifzBackRef`, `mushafBackRef`, `cornerNavBackRef`).
- **Order is top layer first.** `ModalDialog` sits above everything, so its users are checked before menus and panels; a sheet opened over a panel (users list over the sync panel) closes before the panel. The startup sync choice swallows back: it must be answered, not dismissed.

# Debugging

- When the user reports a precise symptom ("it syncs only when I disable it"), trace that literal code path FIRST — before theorizing about networks, caches, or infrastructure. The symptom described the bug exactly.

# Communication

- Be concise. Lead with the outcome. Do not expand unless asked.