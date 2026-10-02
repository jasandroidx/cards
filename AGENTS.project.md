# Rules for this game

Read [README.md](README.md) and [design-state.md](design-state.md) first. This file is how you are allowed to change the game. [AGENTS.md](AGENTS.md) is the sandbox that builds and previews the app. Do not delete it, rewrite it, or move the game into another engine because that file mentions one.

If this file and `AGENTS.md` disagree about the game, this file wins. If this file and `design-state.md` disagree, `design-state.md` wins until play has proved a locked line wrong.

## Before you edit

1. Say which player-facing step you are changing. The first hour is in the README. Do not skip it to add a system behind it.
2. Open the file that already owns that step. Do not start a second copy of the road, the save, or the hall.
3. Change one thing. A bug fix is one thing. Wiring one square is one thing. A new game plus a new person plus a new currency is three, and you do not ship three.

## Where work goes

- A screen the player sees: `src/components/reliquary/`.
- A rule with no pixels: `src/lib/reliquary/`.
- A picture or a short film: `public/`, named for the place, no words baked into the image.
- The map of squares: `src/lib/reliquary/road.ts` only. If you add a square, you renumber 0–29 and you update `canEnter` in `Board.tsx`. Do not add a square unless asked.
- Gates and prices: `GATES` in `src/lib/reliquary/sitting.ts` only.
- The save: the `Save` type and both effects in `Board.tsx`. One key, `reliquary-v3`.

## The loop you must not break

Solitaire, then the fall, then the Joker, then the paper, then one winning hand, then the chapel button, then the road, then a roll.

Until the chapel is open and the player is still at `position < 0`, the scene shows one next button and hides the rest. Do not put the map, the deck, and every game back on that first screen.

After the chapel is open, a gate the player can afford is a button on the scene. Do not hide the only way to pay inside a dialog.

`position === -1` means they have not taken the road. Do not treat `-1` as square 0.

## Checkers

English draughts. Dark squares. The player is red and starts at the bottom, moving toward row 0. Men move and jump forward. Kings move and jump both ways. If any jump exists, a move that is not a jump is illegal. After a jump, if that same piece can jump again and it was not just crowned, it must. Crowning ends the turn. The other side is a short search, not a second game. Pieces are `position: absolute` inside the board and must use `box-sizing: border-box` with no percentage padding, or they cover the square you are trying to drop on. Drag math uses the inside of the border, not the border box.

## The road

`roll` in `Board.tsx` is the only walker. One die. The comment above it is a promise: later, two dice, and doubles pay. Do not build that until asked.

Only the square you land on runs. Pip, the low stair, the cracked cup, the row, Mabel's line, and the high ledge are the wired stops. If you add a landing, do it in `roll` after `next` is chosen, and say the place in the note. Do not invent a second movement system.

`canEnter` is the gate. Do not let a roll walk onto a square the player has not paid for. Do not let a purchase skip the Maw. Queen and the reliquary stay closed until `mawBeaten` is true.

`OMENS` is unused. Do not wire it as a surprise unless asked.

## Words and pictures

The caption is a sentence, not a label in all caps. Buttons are verbs: Play a hand, Open the chapel, Roll, Cut for Pip.

No new named person unless the request names them. The Joker has left. Pip, Mabel, Nix, the Dealer, the Queen, and the Maw already exist as places. Do not give them a backstory scene.

Pictures: no letters, no numbers, no signs. One practical light, a lamp or a fire. The Maw has no face. Do not restyle the whole game into a cartoon, and do not restyle the opening solitaire away from the old Windows table until the moment it starts to break.

## Save

Add a field if you need one. Load it with a default when it is missing. Never rename `marks`, `owned`, `position`, `pocket`, `carried`, or the key `reliquary-v3`. A player who already fell should still load.

## Checks before you finish

- `npm run typecheck` passes.
- A new game can still fall, sign, win one hand, open the chapel, and roll.
- An old save with `position >= 0` still opens on the road, not back in solitaire.
- You did not add Phaser, Unity, Godot, a card API, a dice API, accounts, or a model that writes lines.

## Do not

- Perfect-information shopping as the whole game. A price may be on the button. The fear is the wick, the dark square, and not knowing the roll.
- A full opponent brain. A seat plays one page of rules.
- Stack a new game, a new person, and a new system in one change.
- Delete hall games to "simplify." They are the way you earn the first mark.
- Move the scene. It is a still picture, a caption, and buttons. Motion belongs to the piece you moved, not the room.
