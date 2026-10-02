# Cards playtest skill

Use when verifying a change to `jasandroidx/cards` in the browser.

## Setup

- Playwright MCP is configured in `opencode.json` (`playwright` server).
- Dev server: `npm run dev` (Vite default port; confirm from terminal output).
- The full loop to smoke-test: load page → play Klondike until the fall →
  sign the paper → earn first mark → buy chapel gate → step onto the road.

## Rules

1. **Play it, don't imagine it.** After any gameplay change, drive the real
   browser through the affected path and report what actually happened.
2. One variable at a time. If testing a road square, set up the save state
   to reach it directly (localStorage `reliquary-v3`) rather than replaying
   the whole game each time — but do one full clean-save run per phase.
3. Screenshot the moment: the fall, each gate purchase, each new square's
   first resolution. Name them `playtest-<job>-<step>.png`.
4. Onboarding check: after any change near the opening, confirm the game still
   starts as ordinary green-table solitaire with one next action and no
   "do you want to fall" menu.

## Reporting

- did / didn't / needs-yes. No theater.
- A green claim needs the screenshot or the exact terminal output attached.
- If the game soft-locks or a caption is missing, that's the finding —
  report it plainly, don't work around it in the test.
