# Cards game-logic skill

Use when writing or changing game rules in `jasandroidx/cards` (Under the Table / Reliquary).
Read `AGENTS.project.md`, `design-state.md`, and `HANDOFF.md` first. They win over this file.

## The pattern

Rules live in **pure modules** under `src/lib/reliquary/` (bouts, sitting, euchre,
klondike, road, surprise, atmosphere, border, death, king, light, mire, onboarding,
queen, scaffold, shout, tafl, telemetry). Components under `src/components/reliquary/`
render and call them. `Board.tsx` owns the save, `earn()`, `canEnter`, and `roll`.

A pure rule module:
- Exports pure functions. No React, no DOM, no localStorage.
- Takes state in, returns new state out. Never mutates input.
- Randomness: prefer an injected deck/RNG (`startQueen(deck)` style). Some older
  helpers (`shuffleDeck` in `sitting.ts`) call `Math.random` directly. Do not spread
  that; when you touch one, add an optional `rand = Math.random` parameter.

## Invariants (never break these)

- Marks never go negative. Awards go through `earn()` / `award()` in `Board.tsx`.
- Gate order is fixed in `GATES` (`sitting.ts`): chapel 1, bridge 2, yard 2, queen 3, reliquary 3.
- Queen and reliquary stay shut until `mawBeaten`. The Maw cannot be bought off.
- Only the **landed** road square runs. `roll` in `Board.tsx` is the only walker. One die.
- Save key `reliquary-v3`. New fields are optional with defaults. Never rename
  `marks`, `owned`, `position`, `pocket`, `carried`. Old saves must load.
- When you add a Save field, add it to the save object **and** the effect's dependency array.
- A seat is one page of rules. No full opponent brain.

## Workflow for a new or changed rule

1. Write or change the pure function in the matching lib module.
2. Add tests in `src/lib/reliquary/reliquary-rules.test.ts` (node:test + node:assert).
   For odds-based rules, write a loop test over 500–2000 deals that asserts the
   invariant (see the Queen block for the house style). No new test framework.
3. Wire the component; it renders, captions, and animates only the moved piece.
4. `npm run typecheck` clean. `npm test` on Node 22 with no new failures
   (8 failures in `grok-pwa-plugin.test.mjs` were already failing).
5. Hand off to `cards-playtest` for the real-browser check.

## Numbers

- Do not invent payouts or difficulty numbers. Before changing a payout, price, or
  win rate, write a small seeded simulation (a `*.test.ts` loop or a standalone
  `.mjs` under `scripts/`) and put the before/after table in the PR body.

## What not to do

- No rule logic in `.tsx`. If a component computes an outcome, move it to lib.
- No new hall game, engine, API, account, multiplayer, or generated story.
- No new test framework or dependency without Jason saying so.
