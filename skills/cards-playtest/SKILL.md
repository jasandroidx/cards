# Cards playtest skill

Use when verifying a change to `jasandroidx/cards` in a real browser.

## Setup (loopback only; never Funnel, never a public tunnel)

1. `npm ci` (first time). Then `npx playwright install chromium` once, if
   Playwright has no browser yet.
2. Dev server: `npm run dev` → `http://127.0.0.1:8080/` (script binds 0.0.0.0:8080;
   only ever open it as 127.0.0.1, and don't share the port).
3. Quick look, desktop + mobile + JSON verdict:
   `node scripts/browser-smoke.mjs http://127.0.0.1:8080/ /workspace/screenshots/playtest-<job>-home.png`
   (the guard refuses non-loopback URLs and paths outside /workspace).
4. Interactive play: the Playwright MCP (local stdio). Navigate, click by visible
   button text (verbs: "Play a hand", "Open the chapel", "Roll", "Her coat"), and
   take screenshots.

## Jump to a square with a save preset

Set the save, then reload:
`localStorage.setItem("reliquary-v3", JSON.stringify(PRESET)); location.reload();`
Presets live in `skills/cards-playtest/presets.json` (add it in the same PR).
A save with `position >= 0` must open on the road, not in solitaire.

## Rules

1. Play it; don't imagine it. Drive the affected path and report what happened.
2. One variable at a time. Use a preset to reach a square, plus **one full
   clean-save run per phase**: solitaire → fall → Joker → sign → win one hand →
   open the chapel → roll.
3. Screenshot the moment: the fall, each gate purchase, each new square's first
   resolution. Name: `/workspace/screenshots/playtest-<job>-<step>.png`
   (screenshots/ is gitignored; never commit them).
4. Onboarding check after any change near the opening: still green-table
   solitaire, one next action, no "do you want to fall" menu.
5. Old-save check: load a `position >= 0` preset and confirm it opens on the road.

## Reporting

- did / didn't / needs-yes. No theater.
- A green claim needs the screenshot path or exact terminal output.
- A soft-lock or missing caption is the finding. Report it, don't work around it.
