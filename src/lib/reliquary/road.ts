export type Kind = "start" | "road" | "gate" | "way" | "trap" | "shortcut" | "end";

export type House =
  | "breach"
  | "hearts"
  | "spades"
  | "mire"
  | "diamonds"
  | "clubs"
  | "nave";

export interface Square {
  id: number;
  name: string;
  short: string;
  kind: Kind;
  house: House;
  game: string;
  /** The one rule this square kept from some other game. */
  relic?: string;
  blurb: string;
  labeled: boolean;
}

export const SQUARES: Square[] = [
  {
    id: 0,
    name: "The Hole",
    short: "Hole",
    kind: "start",
    house: "breach",
    game: "Arrival",
    blurb:
      "Where you landed. The hall is behind you; the road ahead is every game that broke. Click a square, then step in. When it stops, go back and play a hand.",
    labeled: true,
  },
  {
    id: 1,
    name: "Ash",
    short: "",
    kind: "road",
    house: "breach",
    game: "Walk",
    blurb: "The road is not stone. It is bone. And dice.",
    labeled: false,
  },
  {
    id: 2,
    name: "Ash",
    short: "",
    kind: "road",
    house: "breach",
    game: "Walk",
    blurb: "Ash underfoot. The fog has not lifted. Something was dealt here, and left.",
    labeled: false,
  },
  {
    id: 3,
    name: "Pip",
    short: "Pip",
    kind: "gate",
    house: "breach",
    game: "Cut",
    blurb:
      "A page with no face, holding a lantern that does not reach his feet. He calls a rank. You cut the deck. Win, or you do not pass.",
    labeled: true,
  },
  {
    id: 4,
    name: "The Low Stair",
    short: "Stair",
    kind: "shortcut",
    house: "breach",
    game: "Shortcut to the stair's end",
    blurb:
      "A stair of cracked cards, going up. Land here exactly and it carries you past the cup and the row. It will not carry you past Mabel.",
    labeled: true,
  },
  {
    id: 5,
    name: "Ash",
    short: "",
    kind: "road",
    house: "breach",
    game: "Walk",
    blurb: "If you took the stair, you never stood here. If you did not — ash, and the road going on.",
    labeled: false,
  },
  {
    id: 6,
    name: "The Cracked Cup",
    short: "Cup",
    kind: "trap",
    house: "breach",
    game: "Lose a roll",
    blurb: "A split dice cup in the ash. Land here and you lose your next roll. The stair exists so you can refuse this.",
    labeled: true,
  },
  {
    id: 7,
    name: "Ash",
    short: "",
    kind: "road",
    house: "breach",
    game: "Walk",
    blurb: "Nothing here but the sound of your own walking. The Table is listening.",
    labeled: false,
  },
  {
    id: 8,
    name: "The Row",
    short: "Row",
    kind: "way",
    house: "breach",
    game: "Rent",
    relic: "A street of deeds. Only the rent survived.",
    blurb:
      "A street of burnt deeds. Land here and the row charges one card from your hand. Pay, or lose your next roll.",
    labeled: true,
  },
  {
    id: 9,
    name: "Stair's End",
    short: "",
    kind: "road",
    house: "breach",
    game: "Walk",
    blurb: "Where the Low Stair comes out. Mabel is the next square, and she cannot be skipped.",
    labeled: false,
  },
  {
    id: 10,
    name: "Mabel",
    short: "Mabel",
    kind: "gate",
    house: "hearts",
    game: "Yacht",
    relic: "Five dice, three throws. The chapel kept only this.",
    blurb:
      "Five bone dice on a chapel altar. Three throws, hold what you like. Beat her and the chapel burns. That light stays.",
    labeled: true,
  },
  {
    id: 11,
    name: "Ash",
    short: "",
    kind: "road",
    house: "hearts",
    game: "Walk",
    blurb: "Empty road. Warm only after the Heart house is lit.",
    labeled: false,
  },
  {
    id: 12,
    name: "The River",
    short: "River",
    kind: "way",
    house: "hearts",
    game: "The Shout",
    relic: "A color game. Only the matching survived.",
    blurb:
      "Cards race the current in four ugly colors. Match the color or the next rank before they reach the center. Miss, and the river takes a card.",
    labeled: true,
  },
  {
    id: 13,
    name: "Ash",
    short: "",
    kind: "road",
    house: "hearts",
    game: "Walk",
    blurb: "The road goes down to the bridge. The water below is black, and does not hurry.",
    labeled: false,
  },
  {
    id: 14,
    name: "The Bridge",
    short: "Bridge",
    kind: "gate",
    house: "spades",
    game: "Spades",
    relic: "One hand, bid and made. The river kept only this.",
    blurb:
      "The Dealer and two empty chairs. One hand of spades — you and him against the dead seats. Make the bid and the bridge drops. The water turns silver.",
    labeled: true,
  },
  {
    id: 15,
    name: "Far Bank",
    short: "",
    kind: "road",
    house: "spades",
    game: "Walk",
    blurb: "The far bank. If the bridge is down, the water runs silver. If not, you are still on the wrong side.",
    labeled: false,
  },
  {
    id: 16,
    name: "The Border",
    short: "Border",
    kind: "way",
    house: "spades",
    game: "Three dice",
    relic: "A war map. Only one battle survived.",
    blurb:
      "A black territory with no name. You roll three dice, the border rolls two. Higher takes it. Win, and the silver spreads.",
    labeled: true,
  },
  {
    id: 17,
    name: "The Well",
    short: "Well",
    kind: "way",
    house: "mire",
    game: "The fall",
    blurb:
      "You are one card, kicking off ledges as you drop. Miss and you fall faster. At the bottom: the Black Ace. Nix will take it in place of a harder game.",
    labeled: true,
  },
  {
    id: 18,
    name: "The High Ledge",
    short: "Ledge",
    kind: "shortcut",
    house: "mire",
    game: "Shortcut to the graves' end",
    blurb:
      "Land here exactly and you skip the gravestones. You do not skip Nix. The mire still has to be answered.",
    labeled: true,
  },
  {
    id: 19,
    name: "A Tile",
    short: "",
    kind: "road",
    house: "mire",
    game: "Take a letter",
    blurb: "A letter tile standing in the mud. Walk it and you carry the letter.",
    labeled: false,
  },
  {
    id: 20,
    name: "The Yard",
    short: "Yard",
    kind: "way",
    house: "mire",
    game: "Three letters",
    relic: "A word board. Only three tiles survived.",
    blurb:
      "Set the letters you carried into any word of three. No letters, and the yard gives you nothing. Nix will take a word in place of the lamp.",
    labeled: true,
  },
  {
    id: 21,
    name: "A Tile",
    short: "",
    kind: "road",
    house: "mire",
    game: "Take a letter",
    blurb: "Another tile in the mud. The last one before the ledge comes out.",
    labeled: false,
  },
  {
    id: 22,
    name: "Ledge's End",
    short: "",
    kind: "road",
    house: "mire",
    game: "Walk",
    blurb: "Where the High Ledge comes out. Nix is next.",
    labeled: false,
  },
  {
    id: 23,
    name: "Nix",
    short: "Nix",
    kind: "gate",
    house: "mire",
    game: "The Ace, the word, or the lamp",
    blurb:
      "A saint who sank. The Black Ace clears the mire. A word from the yard does too. Neither, and you play in a shrinking circle of lamplight while loose cards creep in.",
    labeled: true,
  },
  {
    id: 24,
    name: "The False Queen",
    short: "Shade",
    kind: "way",
    house: "diamonds",
    game: "Monte",
    blurb:
      "Three cards. Follow the queen. The hands cheat once — so watch the hands, not the cards.",
    labeled: true,
  },
  {
    id: 25,
    name: "The Scaffold",
    short: "Scaffold",
    kind: "way",
    house: "clubs",
    game: "House of cards",
    blurb:
      "Build a house on the felt. The table bumps. It has to be standing when the lamp steadies.",
    labeled: true,
  },
  {
    id: 26,
    name: "The King",
    short: "King",
    kind: "trap",
    house: "clubs",
    game: "One square",
    relic: "A whole board, and one piece left on it.",
    blurb:
      "A lone king on a burnt square. It moves once, toward you. Roll even and you step past. Roll odd and it takes a card from your hand. Beyond him the dark has teeth.",
    labeled: true,
  },
  {
    id: 27,
    name: "Ash Wood",
    short: "",
    kind: "road",
    house: "clubs",
    game: "Walk",
    blurb: "Flesh of cards. Bone of dice. The Maw. It is in the road. It does not want poker chips — it wants the ante. Feed it a poker chip, or be eaten.",
    labeled: false,
  },
  {
    id: 28,
    name: "The Queen",
    short: "Queen",
    kind: "gate",
    house: "nave",
    game: "Court",
    blurb:
      "Faceless. Too large for her square. Coat like a broken window. You play on her while she tries to cast you off. Four rounds. Win, and her face returns.",
    labeled: true,
  },
  {
    id: 29,
    name: "The Reliquary",
    short: "Reliquary",
    kind: "end",
    house: "nave",
    game: "Solitaire",
    blurb:
      "Sealed until all four houses burn. It opens onto the hall you started in. Same lamp. Same quiet game. But the seat is warm now. Dealer.",
    labeled: true,
  },
];

export const OMENS: { name: string; text: string }[] = [
  { name: "Chapel", text: "Sends you to Mabel." },
  { name: "Bridge", text: "Sends you to the Dealer." },
  { name: "Mire", text: "Sends you to Nix. Often backward." },
  { name: "Well", text: "Sends you to the Well." },
  { name: "Queen", text: "Sends you to the Queen." },
  { name: "Low Stair", text: "Sends you to the stair." },
  { name: "Blank", text: "The die only glows." },
  { name: "The Hole", text: "All the way back to the start." },
];

export const COLS = 5;

export function cellOf(id: number): { col: number; rowFromTop: number } {
  const rowIndex = Math.floor(id / COLS);
  const i = id % COLS;
  const col = rowIndex % 2 === 0 ? i : COLS - 1 - i;
  const rowFromTop = Math.floor((SQUARES.length - 1) / COLS) - rowIndex;
  return { col, rowFromTop };
}

export function lightCopy(progress: number): string {
  if (progress <= 0) return "Just fallen. The road is still black.";
  if (progress < 3) return "Ash underfoot. Pip has not shown you his face.";
  if (progress < 10) return "A lantern. The chapel is still dark above you.";
  if (progress < 14) return "The Heart house is burning. The bridge is not down.";
  if (progress < 23) return "Silver on the water. The mire is still ahead.";
  if (progress < 28) return "The mire has dropped. The Queen has no face yet.";
  if (progress < 29) return "Her face is back. The reliquary is the last door.";
  return "The hall opens. The deck you carried is the last game.";
}
