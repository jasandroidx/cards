# Cards game-logic skill

Use when writing or changing game rules in `jasandroidx/cards` (Under the Table).

## The pattern

Game logic lives in **pure rule modules** under `src/lib/reliquary/`:
`bouts.ts`, `sitting.ts`, `euchre.ts`, `klondike.ts`, `road.ts`, `surprise.ts`,
`atmosphere.ts`. Components under `src/components/reliquary/` only render.

A pure rule module:
- Exports pure functions. No React, no DOM, no localStorage, no `Math.random`.
- Takes state in, returns new state out. Never mutates its input.
- Randomness comes from an injected RNG: `roll(rand: () => number, ...)`.
  Production passes a seeded/mutable RNG; tests pass a fixed sequence.

## Invariants (never break these)

- Marks never go negative. All awards go through `earn()` in `sitting.ts`.
- Gate order is fixed: chapel(1) < bridge(2) = yard(2) < queen(3) = reliquary(3).
- Only the **landed** road square resolves. Passing over a square does nothing.
- Save key is `reliquary-v3`. New fields are optional with defaults; old saves load.
- One die until Jason asks for two. Maw cannot be bought off.
- Each hall seat is one page of rules — no full opponent brain.

## Workflow for a new rule

1. Write the rule as a pure function in the matching lib module first.
2. Write a fast-check property test for its invariants before wiring UI.
3. Wire the component to call it; the component handles animation/caption only.
4. `npx tsc --noEmit` clean, `npx vitest run` green.

## What not to do

- Don't put rule logic in `.tsx` files. If a component computes an outcome,
  move it into the lib module.
- Don't invent economy numbers. Run `scripts/economy.mts` with a fixed seed
  and report the EV before proposing payout changes.
- Don't add a new hall game, engine, API, account, multiplayer, or generated story.
