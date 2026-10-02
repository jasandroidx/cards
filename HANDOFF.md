# Where this was left

Read this before you add to the game. The rules are in `AGENTS.project.md`. What is already on screen is in `README.md`. What must not be reopened is in `design-state.md`.

## The story, in one pass

You were playing a quiet game of solitaire. The table opened. You fell, with the cards that were face up. Under the table is every game that broke. It is dark. You are trying to get back to the chair.

The Joker is the first voice. He was not in that deck. He tells you the lamp pays a mark, the mark opens the chapel, and the road starts after that. Then he leaves. He is not a guide and not a partner. Do not bring him back unless asked.

The road is thirty squares. Each stretch kept one rule from some old game and threw the rest away. Pay a mark to open the next stretch. Roll to walk. Only the square you stop on happens.

The world is supposed to get warmer as you win the houses, not all at once.

- Breach, squares 0–9. Ash, just after the fall. Pip, the stair, the cracked cup, the row.
- Hearts, squares 10–13. Mabel keeps yacht. Beat her and the chapel was supposed to go from black stone to firelight, and stay lit.
- Spades, squares 14–16. The Dealer. One hand, a bid. Make it and the bridge drops. The water turns silver. Three dice on the border. Win and the silver spreads. Lose and you step back one.
- Mire, squares 17–23. The well is a falling card. Clear it and you carry the Black Ace. Tiles in the mud give you letters. Three letters make a word in the yard. Nix is a saint who sank. The Black Ace clears him, or a word from the yard does. Neither, and you play in a shrinking circle of lamplight while loose cards creep in. The high ledge skips the gravestones. It does not skip Nix.
- Diamonds and clubs, squares 24–27. A false queen, three cards, the hands cheat once. A scaffold, a house of cards that has to still be standing. A lone king on a burnt square that steps toward you.
- The Queen, square 28. She has no face. Her coat is a broken window. You play on her while she tries to cast you off. Win, and her face comes back.
- The reliquary, square 29. It opens onto the hall you started in. Same lamp. Same quiet solitaire. The deck is full. The boons you carried are the only mercy in it.

Those boons, as written and not built: the river gives a Heart boon, at the end you draw one card instead of three. The false queen gives one undo. The scaffold lets a queen open an empty column. The Black Ace and a yard-word are how you pass Nix without the hard game.

The Maw stands in the wood before the Queen. It is not a place. It does not take marks. You play it. If you win, it moves, and only then can her coat and the last key be bought.

The hall has a side mystery that is not the road. A bent key under the lamp. A cupboard. The code 4, 1, 8. A cell. A cracked cup that looks through a burning wall. One blank card in the deck you fell with. A gate will take that card instead of marks. The keepsakes from hall games are souvenirs. They do not open anything yet.

The fear was never a shop. A wick can burn down and take a mark. A voice in the hall says something and does not explain it. You roll before you know the square.

## What already plays

A new game can fall out of solitaire, hear the Joker, sign, win one hall game, open the chapel, take the road, and roll.

Wired landings: Pip's cut, the low stair to square 9, the cracked cup taking the next roll, the row taking a carried card, the high ledge to square 22, and a line when you stop on Mabel.

Playable seats: the hand, the box, War, Go Fish, Concentration, darts, four in a row, checkers, the cut, yacht, the bid, euchre, three dice on the border, Monte, and the Maw. Checkers is the one that was finished hardest. English draughts, forced jumps, a piece that must keep jumping, drag onto the gold dot.

If you can afford the next gate, the button is on the scene.

## Pick up here

Do these in this order. Do not skip to a new game.

0. **The refresh bug is fixed.** `fallen` was derived as `position >= 0 || heard`, so it wrote `false` over the `true` that `index.tsx` sets at the fall. A player who reloaded during the Joker went back to the green table. It is sticky state now.

1. ~~**Mabel lights the chapel.**~~ **Done.** The Heart house lights when you beat her and stays lit. The next open item is 2, the river.

2. **The river, square 12.** Cards in four colors race the current. Match the color or the next rank before they hit the middle. Miss and the river takes a card from the hand you fell with. Clear it and you carry the Heart boon for the last solitaire.

2. **The river takes a card.** Done. `src/lib/reliquary/shout.ts` holds the rules and `src/components/reliquary/Shout.tsx` only renders. Eight cards, four colors, same color or the next rank. A miss takes a card from `carried`; a clear adds `heart` to `boons`. The hand is guaranteed one legal answer every wave, so a clear is only ever lost to the timer. `boons` does nothing until the last solitaire.

3. **The bridge, square 14.** Done. A made bid drops the bridge and turns the water silver; it stays silver.
Next is 9 (Queen) unless any small wiring gaps show up. The core stretch 4–8 is implemented in pure form.

4. **The border, the well, the letters, Nix.** Border done (silver spread); well/tiles/yard/Nix pure modules and components. The high ledge still skips the tiles and must not skip Nix.

5. **The false queen, the scaffold, the king.** Monte gives `undo` on win; scaffold at 25 gives `column` if it stands; king at 26 uses even/odd on one die in effect (odd takes a carried card or sets `skipRoll`). Next is 9: The Queen gets her face at square 28.

6. **The Queen, then the reliquary.** She has no face until you win on her. The last scene is solitaire again, the deck you fell with made whole, and only the boons you actually earned.

7. **Two dice.** Not before the landings above are real. One die today. The comment on `roll` in `Board.tsx` says the rest: when it is two dice, doubles pay. What they pay is not chosen. Do not invent a shop. A double should feel like the stair: something the road gives you for the number, not a new currency.

## Do not pick up

- Do not bring the Joker back.
- Do not add a person who was not already named in `road.ts`.
- Do not start chess, billiards, darts-as-a-road-square, or another hall game. The hall list is enough to earn marks.
- Do not move the scene into a physics engine or a 3D engine.
- Do not write the ending solitaire until the boons exist, or it is just the first game again.
- Do not build the omens list until the squares they point at are real. Chapel would send you to Mabel. Bridge would send you to the Dealer. Mire would send you to Nix, often backward. Well to the well. Queen to the Queen. Low stair to the stair. Blank only glows. The Hole sends you back to the start.

## How to know you are still on this game

A player who has never fallen can still do it from a green solitaire table. A player who already fell loads on the road, not back at the start. Beating Mabel, once you have done item 1, is visible the next time they look at the chapel. A square that only says its name is still a square you have not finished.

## For Jules

These are big enough to be their own change, and small enough to finish. Take them in order when they depend on each other. Do not take two that touch `roll` in `Board.tsx` at the same time. One pull request each. Read `AGENTS.project.md` before editing. `npm run typecheck` has to pass. Do not add a person, an engine, an API, or a new hall game.

### 1. Light the Heart house when Mabel loses — **DONE**

Ships as `heartsLit` on the save. `Yacht` takes an optional `onWin(won)`, `Board` sets the flag on a win only, and a tie does not light it. The wash is `.scene.warm` in `styles.css` when `age.key === "chapel"`, and the Hearts line from `lightCopy` shows under the caption. No second painting.

The notes below are what the job was.

Yacht in `src/components/reliquary/Games.tsx` pays marks and stops. Beating her (not a tie) must set a saved flag, suggest `heartsLit` on the save in `Board.tsx`. Load it if it is missing. After it is set, the chapel scene is warmer and stays that way. There is no second painting. Do it with a warm wash on `.scene` when `age.key === "chapel"`, and show the Hearts line from `lightCopy` in `src/lib/reliquary/road.ts`. A tie does not light it. Do not change yacht's rules.

### 2. The river takes a card — **DONE**

Ships as `src/lib/reliquary/shout.ts` (pure rules) plus `src/components/reliquary/Shout.tsx` (render only). `guaranteeAnswer` keeps one legal answer in the hand every wave. `boons` on the save is where `heart` goes; job 6 adds `undo` and job 8 adds `column`. Do not read `boons` anywhere until job 10 exists.

The notes below are what the job was.

Square 12. Build the shout in its own component under `src/components/reliquary/`, and open it from the road the way yacht opens, only when `position` is 12. Four colors. Cards move toward a center. The player throws a match, same color or the next rank, before a card arrives. Miss, and one card leaves `carried`. Clear it, and set a saved `boons` list to include `heart`. That boon means nothing until the last solitaire exists. Say what happened in the note. Do not invent a new mark price.

### 3. A made bid drops the bridge — **DONE**

`Bid` takes an optional `onBid(made)` and fires it only when the hand finishes. The payout line is untouched — bid times two, 4/6/8. Board sets `spadesLit` on a made bid only; a miss writes a note and leaves the flag alone, and a later made bid still pays without clearing the flag. Euchre is not given `onBid`, so it structurally cannot set it. The wash is `.scene.cool`, and `lightCopy` shows once either house is lit.

The notes below are what the job was.

This is not a new card game, and it does not move the player. The gate is already bought or they would not be standing here. "The bridge drops" means the span settles and the water goes silver. It is a saved flag, `spadesLit`. It is not the player falling.

The bid is already `Bid` in `src/components/reliquary/Table.tsx`. Leave the hand as it is.

- Five cards, from the same two-suit deck as the lamp.
- Before any card is played, the player bids 2, 3, or 4.
- Then they play by the cut. A card must be the next rank up, or a higher card of the same suit. Ace is low here. Nothing else is legal.
- The hand ends when the five cards are gone, or when every card still in hand is illegal on the card just played.
- The bid is made only if the number played is at least the number they named. Pay is that bid times two: 4, 6, or 8. A miss pays nothing. Do not change this pay.
- The first time a bid is made, set `spadesLit` on the save. A miss does not set it. A later made bid still pays, and does not turn the flag off.
- Euchre does not set it. Only this hand.
- When `spadesLit` is set, the bridge scene and the far bank wear a cool silver wash, and the Spades line from `lightCopy` shows. The player's square does not change.

### 4. The border spreads the silver

Three dice already play from square 16 on, in `Games.tsx`. `borderEnd` in `Board.tsx` pays a mark, walks you back, or ties. A win must be what spreads the silver, only if `spadesLit` is already true. If the bridge is still dark, the dice can still pay the mark, and the note says the water is not silver yet. Do not change the step-back rule. A loss still cannot go earlier than square 15.

### 5. The well, the letters, and Nix — **DONE**
- Square 17, the well. A short fall game; clear it and add `black-ace` to `pocket`.
- Tiles at 19 and 21 add letters. The high ledge already skips to 22 and must continue to skip the tiles; Nix at 23 is not skipped.
- Square 20, the yard: three letters form a word saved to state.
- Square 23, Nix: spend Black Ace or a word to pass; otherwise open the lamp game from the hall with wick (reserved).

### 6. The false queen's undo — **DONE**
Monte win grants `undo` in `boons` (once). Loss adds nothing. Payout unchanged.

### 7. The king on one square — **DONE**
Square 26: when landing, roll one die in effect (the note). Even → stay and note says stepped past. Odd → if `carried` has a card, he takes one; if empty, he takes the next roll (`skipRoll`). No board game. He moves once.

### 8. The house on the scaffold — **DONE**
Square 25: a timer-based house of cards. If it stands when settled, add `column` to `boons` (once). If it falls, no boon. Pure rules + simple UI.

### 9. The Queen gets her face — **DONE, WITH A KNOWN PROBLEM**

Square 28, gated on `mawBeaten` and `queen` in `owned`. `src/lib/reliquary/queen.ts` is the pure rules, `Queen.tsx` renders it. Four rounds: she leads a card, you must beat it with `beats` from `sitting.ts`, and on round 2 she throws a card out of your hand. Win sets `queenFaced`; lose leaves you on the square. No marks to skip. It reuses the existing `public/queen.jpg` and lifts the shadow with a `.scene.faced` wash plus the `lightCopy` line — no new portrait.

**Known problem, left for a later pass.** The contest is too hard: with `QUEEN_HAND = QUEEN_ROUNDS + 2` (six cards, four rounds, one stolen card), a player who plays optimally still only wins about **64%** of deals. Three different strategies all land near 63%, so it is not a bad-bot artifact — the ranking is simply unforgiving. She leads her *strongest* answerable card first, which is already the fair ordering; leading her weakest instead drops the win rate to ~31%. Raising the hand to `QUEEN_ROUNDS + 3` reaches ~83% but makes for a cluttered board. The card-theft on round 2 is my own reading of "she tries to throw you off" and is the main thing costing the player. Worth revisiting whether that theft should exist at all, or whether the difficulty should come from somewhere else.

Also fixed in this pass: the well, letter tiles, yard, Nix, and the scaffold were written and typechecked but had **no dock button and were never mounted**, so jobs 5 and 8 were not actually playable. They are wired now.

### 10. The last solitaire

Square 29, only when `queenFaced` is set and `reliquary` is owned. Open solitaire again, using `src/lib/reliquary/klondike.ts`, not a new rules file. The deck is a full deck. Apply only the boons the player actually has. `heart`: draw one, not three, when the stock deals three. `undo`: one take-back in the whole game. `column`: a queen may be placed on an empty column. No boon, no mercy. Winning this is the end. The note says you are back in the chair. Do not start this until 2, 6, and 8 have somewhere to store `boons`.

### Leave for later

Two dice, and doubles paying, stay a comment on `roll`. Omens in `road.ts` stay unused until the square they name is finished. The Joker stays gone.

