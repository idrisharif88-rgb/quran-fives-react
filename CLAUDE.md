# Project Structure & Organization Rules

- **Modular Development:** Every new feature or update must be split into its respective files. Do not put everything in one file.
- **File Placement:**
    - Components go to `src/components/`.
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

# Communication

- Be concise. Lead with the outcome. Do not expand unless asked.
