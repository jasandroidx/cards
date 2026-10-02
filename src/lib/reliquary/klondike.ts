export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Card = {
  id: string;
  rank: number;
  suit: Suit;
  up: boolean;
};

export type Game = {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
};

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function rankLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function suitMark(suit: Suit): string {
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  if (suit === "clubs") return "♣";
  return "♠";
}

function shuffle(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: `${suit}-${rank}`, rank, suit, up: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = swap;
  }
  return deck;
}

export function deal(): Game {
  const deck = shuffle();
  const tableau: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const pile = deck.splice(0, col + 1);
    const top = pile[pile.length - 1];
    if (top) top.up = true;
    tableau.push(pile);
  }
  return { tableau, foundations: [[], [], [], []], stock: deck, waste: [] };
}

export function canBuild(card: Card, onto: Card | undefined): boolean {
  if (!onto) return card.rank === 13;
  return isRed(card.suit) !== isRed(onto.suit) && card.rank === onto.rank - 1;
}

export function canFound(card: Card, pile: Card[]): boolean {
  const top = pile[pile.length - 1];
  if (!top) return card.rank === 1;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

export function foundationIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

function sequenceOk(pile: Card[], index: number): boolean {
  if (!pile[index]?.up) return false;
  for (let i = index; i < pile.length - 1; i++) {
    const a = pile[i]!;
    const b = pile[i + 1]!;
    if (!b.up || !canBuild(b, a)) return false;
  }
  return true;
}

export function draw(game: Game): Game {
  if (game.stock.length === 0) {
    return { ...game, stock: [...game.waste].reverse().map((card) => ({ ...card, up: false })), waste: [] };
  }
  const stock = game.stock.slice();
  const card = stock.pop()!;
  return { ...game, stock, waste: [...game.waste, { ...card, up: true }] };
}

export function moveToTableau(game: Game, from: From, col: number): Game | null {
  const moving = take(game, from);
  if (!moving) return null;
  const pile = game.tableau[col] ?? [];
  const onto = [...pile].reverse().find((card) => card.up);
  if (!canBuild(moving.cards[0]!, onto)) return null;
  const next = moving.game;
  next.tableau = next.tableau.slice();
  next.tableau[col] = [...pile, ...moving.cards.map((card) => ({ ...card, up: true }))];
  return flip(next);
}

export function moveToFoundation(game: Game, from: From): Game | null {
  const moving = take(game, from);
  if (!moving || moving.cards.length !== 1) return null;
  const card = moving.cards[0]!;
  const index = foundationIndex(card.suit);
  const pile = game.foundations[index] ?? [];
  if (!canFound(card, pile)) return null;
  const next = moving.game;
  next.foundations = next.foundations.slice();
  next.foundations[index] = [...pile, { ...card, up: true }];
  return flip(next);
}

export type From =
  | { kind: "waste" }
  | { kind: "tableau"; col: number; index: number };

function take(game: Game, from: From): { game: Game; cards: Card[] } | null {
  if (from.kind === "waste") {
    const card = game.waste[game.waste.length - 1];
    if (!card) return null;
    return { cards: [card], game: { ...game, waste: game.waste.slice(0, -1) } };
  }
  const pile = game.tableau[from.col] ?? [];
  if (!sequenceOk(pile, from.index)) return null;
  const cards = pile.slice(from.index);
  const tableau = game.tableau.slice();
  tableau[from.col] = pile.slice(0, from.index);
  return { cards, game: { ...game, tableau } };
}

function flip(game: Game): Game {
  const tableau = game.tableau.map((pile) => {
    if (pile.length === 0) return pile;
    const top = pile[pile.length - 1]!;
    if (top.up) return pile;
    return [...pile.slice(0, -1), { ...top, up: true }];
  });
  return { ...game, tableau };
}
