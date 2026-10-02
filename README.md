# Under the Table

A dark-fantasy game. It starts as ordinary Windows solitaire. After a few moves the table opens and you fall. You land in a hall under the table, holding the cards that were face up. The Joker tells you where you are and leaves. You play games for marks, spend marks to open the next stretch of road, and roll to walk it. The road is every game that broke. You are walking back to the chair.

Repo: [jasandroidx/cards](https://github.com/jasandroidx/cards)

If you are an agent, read this file, then [HANDOFF.md](HANDOFF.md), then [design-state.md](design-state.md), then [AGENTS.project.md](AGENTS.project.md), before you change anything. Do not replace [AGENTS.md](AGENTS.md). That file is the app-builder sandbox, not the game. `HANDOFF.md` is where the work stopped, what the story was going to do next, and ten jobs written so Jules can take them one at a time.

## Run

```bash
npm install
npm run dev
```

Dev server: http://127.0.0.1:8080

```bash
npm run typecheck
npm run build
```

Progress is in the browser, key `reliquary-v3`. There are no accounts and no server save.

## The first hour, as it works now

1. Solitaire on a green table. Nothing looks wrong yet.
2. Moves darken the room. Around the seventh move the table cracks. A short fall, then the hall.
3. The Joker speaks four lines. He is not in the deck. Win one hand. Spend the mark. The chapel opens. Then the road. He leaves. He does not come back.
4. A paper on the table says "I am still playing." Sign it.
5. Until you have a mark, the only button is **Play a hand**.
6. Win any hall game. The lamp pays one mark. The only button is then **Open the chapel**.
7. **Take the road.** You are at the Hole, square 0. **Roll.** One die, 1 to 6.

You only resolve the square you stop on. Passing through does nothing.

| Stop | What happens |
|---|---|
| 3 Pip | He calls a rank from ace to king. **Cut for Pip.** You cut a rank the same way. Equal or higher passes. Ace is low, king is high. Fail and you go back to square 2. |
| 4 Low stair | If square 9 is open, you skip to Stair's End. |
| 6 Cracked cup | Your next roll is taken. You do not walk. |
| 8 The row | One card is removed from the hand you fell with. If that hand is empty, the next roll is taken. |
| 10 Mabel | The line tells you to play her dice. Yacht pays marks. Beating her lights the Heart house. It does not open the next gate. |
| 18 High ledge | If square 22 is open, you skip to Ledge's End. |
| A shut gate | The roll stops. The line says the way ahead is shut. |

## Marks and gates

A mark is a place agreeing to let you through. The Maw will not take one.

Gates are bought in order. Queen and the reliquary stay shut until the Maw has been beaten.

| Key | Shown as | Cost | You can walk onto |
|---|---|---|---|
| chapel | The chapel | 1 | squares 10–13 |
| bridge | The bridge | 2 | squares 14–19 |
| yard | The yard | 2 | squares 20–27, and the Maw vista |
| queen | The Queen | 3 | square 28, only after the Maw |
| reliquary | The reliquary | 3 | square 29, only after the Maw |

Squares 0–9 need no purchase. If you can afford the next gate, a button on the scene spends the marks. The same purchase also sits inside a hand, on the right. The blank card, once found, can pay a gate instead of marks.

The hall lamp will only deal three hands. A roll clears that count. Before the first mark, while you are still in the hall, that limit does not block **Play a hand**.

## Hall games

Sit at the lamp. One sitting, one game. A surprise may be nothing, a wick on a timer that snuffs the lamp and takes a mark, a whispered line, or one extra mark if you win.

| Game | Win |
|---|---|
| The hand | Play suit, rank, or one higher. Seven of spades ends it and takes a mark. 4 cards pay 1, 10 pay 2, 16 pay 3. |
| The box | Shut numbers that add to the roll. 5 shut pays 1, 7 pays 2, all 9 pays 3. |
| War | Twelve flips. Most cards left pays 1. |
| Go Fish | Ace through eight. More books pays 1. An empty hand draws from the pond. |
| Concentration | Eight pairs. Clear them for 1. |
| Darts | Three throws. Beat the other score for 1. |
| Four in a row | Beat them for 1. |
| Checkers | Take their last move for 1. English draughts. Jump if you can. A piece that can jump again has to. You cannot switch pieces in the middle of a jump. Reaching the far side crowns you and that turn ends. |

A win at War, Go Fish, Concentration, darts, four, or checkers also leaves a keepsake in the pocket: torn card, fishhook, matched pair, a flight, a red disc, a red king. Those keepsakes are not spent yet.

## Later seats

These appear when you are standing in that stretch and the gate is open.

| Where | Game | Pay |
|---|---|---|
| Chapel, square 10 or later | The cut. Only the next rank, or a higher card of the same suit. | 6 cards pay 2, 10 pay 4, 16 pay 6. |
| River, square 12 | The shout. Four colors, eight cards. Throw a match before one reaches the middle. | No marks. A miss takes a card from the hand you fell with. Clear it and you carry the Heart boon. |
| Chapel | Yacht against Mabel. Five dice, three throws, hold what you keep. | 2 if you win, 1 if you tie. |
| Bridge | The bid. Name a number, then play by the cut. Miss it and you are paid nothing. | Bid times two: 4, 6, or 8. Making it drops the bridge and turns the water silver. |
| Bridge | Euchre, one hand, not a match. Partner across. Left and right are theirs. | 4 if your side takes three tricks, 8 for all five, nothing if you are euchred. |
| Bridge, square 16 or later | Three dice on the border. | A win pays 1 mark. A loss walks you back one square, not past 15. A tie does nothing. |
| Yard, square 24 or later | Monte. Three swaps. Find the queen. | 2 if you do. |
| Maw, squares 27 | Five tricks. Beat its card. Ace is high. | Win three and it moves. Lose and it takes a mark. Marks do not buy it off the road. |

## The hall, besides the table

After you have signed, **Look around** opens the room.

- The lamp hides a bent key. Take it once.
- The cupboard takes the bent key and shows the code 4, 1, 8.
- The stone door opens on that code, into a cell.
- The cell has a cracked cup on the shelf. Hold it to the far wall and the wall becomes glass. Without the cup the wall is on fire and you cannot look through.
- The deck you fell with is under **Deck**. One card in that spread is face down. Click it once. It is the blank card. A gate will take it instead of marks. It is gone after that.

## The road, square by square

Intent lives in `src/lib/reliquary/road.ts`. Only the stops in the first table above are wired. The rest show their name if they are labeled, or just the number you rolled.

| Id | Name | Kind | Wired? |
|---|---|---|---|
| 0 | The Hole | start | You arrive here |
| 1–2 | Ash | road | Nothing |
| 3 | Pip | gate | Cut |
| 4 | The Low Stair | shortcut | Skips to 9 |
| 5 | Ash | road | Nothing |
| 6 | The Cracked Cup | trap | Takes the next roll |
| 7 | Ash | road | Nothing |
| 8 | The Row | way | Takes a carried card, or the next roll |
| 9 | Stair's End | road | Nothing |
| 10 | Mabel | gate | Yacht is offered. Winning does not change the road |
| 11 | Ash | road | Nothing |
| 12 | The River | way | The Shout. Same color or the next rank, before it lands |
| 13 | Ash | road | Nothing |
| 14 | The Bridge | gate | The bid and euchre. A made bid drops the bridge; the water goes silver |
| 15 | Far Bank | road | Nothing. A border loss can push you back to here, never past it |
| 16 | The Border | way | Three dice if you are here or farther in the stretch |
| 17 | The Well | way | Fall the ledges. Clear it and you carry the Black Ace |
| 18 | The High Ledge | shortcut | Skips to 22 |
| 19 | A Tile | road | Take one letter |
| 20 | The Yard | way | Set three letters into a word |
| 21 | A Tile | road | Take one letter |
| 22 | Ledge's End | road | Nothing |
| 23 | Nix | gate | Spend the Black Ace or a word to pass. Otherwise the lamp with a wick |
| 24 | The False Queen | way | Monte if you are here or farther |
| 25 | The Scaffold | way | Keep the house of cards standing until the lamp settles |
| 26 | The King | trap | One die in the note. Even, you pass. Odd, he takes a card, or your next roll |
| 27 | Ash Wood | road | The Maw stands in this stretch until you beat it |
| 28 | The Queen | gate | Shut until the Maw is beaten and her coat is bought. Beat her four times and her face comes back |
| 29 | The Reliquary | end | Shut until the Maw is beaten and the key is bought |

`OMENS` in `road.ts` is a list of die faces that would send you somewhere. Nothing reads it yet.

## Pictures

Files in `public/`. No readable words. One lamp in a room. The Maw has no face. Do not generate a picture with a sign, a title, or a letter.

Scenes: `hall.jpg`, `room.jpg`, `cell.jpg`, `glass.jpg`, `burn.jpg`, `street.jpg` (the hole), `chapel.jpg`, `river.jpg`, `yard.jpg`, `maw.jpg`, `queen.jpg`.

Tables: `solitaire.jpg`, `war.jpg`, `fish.jpg`, `memory.jpg`, `darts.jpg`, `four.jpg`, `checkers.jpg`, `box.jpg`, `yacht.jpg`, `euchre.jpg`, `monte.jpg`. Checkers also uses `checkers-king.mp4` when you are crowned and `checkers-take.mp4` when a piece is taken. The fall uses `fall.mp4` and `crack.jpg`.

## Where the code is

| Path | What |
|---|---|
| `src/routes/index.tsx` | Solitaire until you have fallen, then the world |
| `src/components/reliquary/Solitaire.tsx` | The opening game and the fall |
| `src/components/reliquary/Board.tsx` | Hall, road, buttons, pockets, save |
| `src/components/reliquary/Table.tsx` | The lamp, the cut, the bid, the Maw |
| `src/components/reliquary/Checkers.tsx` | Checkers |
| `src/components/reliquary/Quick.tsx` | War, Go Fish, Concentration |
| `src/components/reliquary/Sides.tsx` | Darts, four in a row |
| `src/components/reliquary/Box.tsx` | Shut the box |
| `src/components/reliquary/Games.tsx` | Yacht, Monte, the border |
| `src/components/reliquary/Shout.tsx` | The shout, the river at square 12 |
| `src/components/reliquary/Euchre.tsx` | One hand of euchre |
| `src/lib/reliquary/klondike.ts` | Solitaire rules |
| `src/lib/reliquary/road.ts` | The 30 squares |
| `src/lib/reliquary/sitting.ts` | Gates, the hand, the cut, the Maw's card rule |
| `src/lib/reliquary/euchre.ts` | Euchre rules |
| `src/lib/reliquary/bouts.ts` | Dice faces, yacht scoring, Mabel's throw |
| `src/lib/reliquary/shout.ts` | The shout's rules, four colors |
| `src/lib/reliquary/surprise.ts` | The wick, the voice, the extra mark |
| `src/lib/reliquary/atmosphere.ts` | The drone under solitaire. No music files |
| `src/styles.css` | The look |
| `design-state.md` | What is locked |
| `AGENTS.project.md` | How to change it without breaking it |

## Save shape

`localStorage["reliquary-v3"]`. Add fields. Do not rename or remove one a saved game may already have.

| Field | Meaning |
|---|---|
| `marks` | Number in the purse |
| `owned` | Gate keys already paid: `chapel`, `bridge`, `yard`, `queen`, `reliquary` |
| `mawBeaten` | The thing in the road has moved |
| `position` | Square 0–29. `-1` means you have not taken the road |
| `carried` | Cards that were face up when you fell. `{ rank, suit }[]` |
| `fallen` | True once you have fallen or signed |
| `heard` | You have been told |
| `signed` | You signed the paper. The buttons stay hidden until this is true |
| `sat` | Hands dealt at the lamp since the last roll. Three is the limit |
| `met` | The Joker has said his piece |
| `pocket` | Strings. Known ones: `Blank card`, `Bent key`, `Cracked cup`, and the keepsakes |
| `blankSpent` | The blank card was given to a gate |
| `cupboard` | The code has been read |
| `door` | The cell is open |
| `skipRoll` | The next roll is already taken |
| `pipOwed` | You are standing on Pip and have not cut |
| `fallen` | True once you have fallen. Never clears |
| `heartsLit` | True once you have beaten Mabel. The chapel stays warm |
| `spadesLit` | True once you have made the bid. The bridge stays down |
| `silver` | True once a border win has run the silver past the bank |
| `queenFaced` | True once you have beaten her four times at square 28 |
| `letters` | Letters taken from the tiles at 19 and 21 |
| `word` | The three-letter word set in the yard at square 20 |
| `boons` | Earned advantages carried to the last solitaire. `heart`, `undo`, `column` so far. Does nothing yet |

## Not built, on purpose

- Two dice. A double should pay. The reminder is the comment on `roll` in `Board.tsx`. Do not build it until asked.
- Landing effects for the well, Nix, the king, the false queen, and the scaffold.
- Mabel changing the chapel when you beat her.
- The Joker as a partner.
- Music and sound-effect files. The solitaire drone is generated in the browser.
- Multiplayer. Every other seat is CPU.
- A card API, a dice API, or a model that writes the story.

## Voice

Short sentences. The place is quiet. Do not explain the design in the caption. The line under the picture is what to do next, or what just happened. Buttons are the action, not a menu of every system.
