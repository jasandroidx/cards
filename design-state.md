# Reliquary — design state

One source of truth for what the game is. Do not reopen a Locked line without new evidence from play. How to edit is in `AGENTS.project.md`. What is on screen today is in `README.md`.

## Locked

- It starts as ordinary solitaire. Green table, white cards, no hell on screen.
- A few moves in, the room darkens. The table opens. The player falls. There is no door and no menu that asks them to.
- They land in the hall, holding the cards that were face up.
- They are walking back to the chair. The road is every game that broke. Thirty squares, 0 through 29. The hall is not a square. `position` `-1` means they have not stepped onto the road.
- The Joker is the first person. He says he watched the table open, he was not in the deck, a win at the lamp pays a mark, the mark opens the chapel, then the road. Then he leaves. He is not a partner.
- The paper says "I am still playing." Signing it is what shows the buttons.
- Until the chapel is open, the hall shows one next action. Play a hand. Then open the chapel. Then take the road.
- A mark is a place agreeing to let you through. Gates are bought in order: chapel 1, bridge 2, yard 2, Queen 3, reliquary 3. The Queen and the reliquary stay shut until the Maw is beaten. The Maw will not take a mark to move.
- The first stretch that is real: Pip's cut, the low stair, the cracked cup taking a roll, the row taking a carried card, Mabel offering yacht. Other squares may say more in `road.ts` than they do.
- Hall games that pay a mark: the hand, the box, War, Go Fish, Concentration, darts, four in a row, checkers. Wins of the last six leave a keepsake. The keepsakes are not keys.
- The blank card is one face-down card in the fallen deck. Found once. Spent once, on a gate, instead of marks.
- The bent key is under the lamp. The cupboard tells 4, 1, 8. That code opens the cell. The cracked cup looks through the far wall. Without it the wall is fire.
- Other seats are CPU. No new named people unless asked.
- The road is one die. Two dice are not in the game. When they are, doubles pay. That is a note on `roll`, not a task you start.
- Runtime stays in the browser. No card API, no dice API, no story model, no accounts. Save key `reliquary-v3`.
- Pictures: no readable words, one lamp or one fire, the Maw has no face.
- The scene stays still. Do not move this into Phaser, Unity, or Godot.
- The lamp deals three hands, then the player has to roll before it deals again. That limit does not trap a player who still has no mark and has not left the hall.

## Open

The next work is in `HANDOFF.md`, in order. Do not start a later item while an earlier one is still only a blurb.

- Beating Mabel pays marks and lights the Heart house. The chapel stays warm. Done, in `heartsLit`.
- The well, Nix, the false queen, the scaffold, and the king only announce themselves. Their blurbs are the intent, not a promise the code keeps.
- Making the bid drops the bridge and the water goes silver. Done, in `spadesLit`. The border dice still do not spread the silver.
- `lightCopy` in `road.ts` is read once the Heart house is lit. It still does nothing for the Spade house or the mire.
- Omens are written and unused. Do not wire them until the squares they point at are real.
- The Joker does not sit down.
- Euchre is one hand, not a match to ten.
- There are no music files and no sound-effect files. Solitaire has a generated drone.
- Two dice are not in the game. Doubles should pay. Not until the landings in `HANDOFF.md` are real.

## Do not

- Turn the price of a gate into the only thing the player can see, and do not hide that price so they cannot find it. The button may say the cost. The fear is elsewhere: the wick, the dark, the roll.
- Build a full opponent brain. A seat is one page of rules.
- Stack a new game, a new person, and a new system in the same change.
- Reopen a locked line because a blurb, an old comment, or an omen list describes a different game.
