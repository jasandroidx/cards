export type Suit = "hearts" | "spades";

export type Card = {
  id: string;
  rank: number;
  suit: Suit;
};

export type Gate = {
  key: string;
  name: string;
  cost: number;
  opens: string;
};

export const GATES: Gate[] = [
  { key: "chapel", name: "Lantern", cost: 1, opens: "The chapel" },
  { key: "bridge", name: "Silver", cost: 2, opens: "The bridge" },
  { key: "yard", name: "Letters", cost: 2, opens: "The yard" },
  { key: "queen", name: "Her coat", cost: 3, opens: "The Queen" },
  { key: "reliquary", name: "The key", cost: 3, opens: "The reliquary" },
];

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function rankLabel(rank: number): string {
  return rank === 1 ? "A" : String(rank);
}

export function shuffleDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of ["hearts", "spades"] as const) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 6)}`, rank, suit });
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = cards[i];
    cards[i] = cards[j]!;
    cards[j] = swap!;
  }
  return cards;
}

export type Mode = "lamp" | "cut" | "bid" | "maw";

export function canPlay(card: Card, top: Card | null): boolean {
  if (!top) return true;
  if (card.suit === top.suit) return true;
  if (card.rank === top.rank) return true;
  return card.rank === top.rank + 1;
}

export function isSour(card: Card): boolean {
  return card.suit === "spades" && card.rank === 7;
}

export function canCut(card: Card, top: Card | null): boolean {
  if (!top) return true;
  if (card.rank === top.rank + 1) return true;
  return card.suit === top.suit && card.rank > top.rank;
}

function power(rank: number): number {
  return rank === 1 ? 14 : rank;
}

export function beats(card: Card, threat: Card): boolean {
  return power(card.rank) > power(threat.rank);
}

export function marksFor(played: number): number {
  if (played >= 16) return 3;
  if (played >= 10) return 2;
  if (played >= 4) return 1;
  return 0;
}

export function cutMarks(played: number): number {
  if (played >= 16) return 6;
  if (played >= 10) return 4;
  if (played >= 6) return 2;
  return 0;
}

export function nextGate(owned: string[], mawBeaten: boolean): Gate | null {
  for (const gate of GATES) {
    if (owned.includes(gate.key)) continue;
    if ((gate.key === "queen" || gate.key === "reliquary") && !mawBeaten) return null;
    return gate;
  }
  return null;
}

export function roadOpen(key: string, owned: string[], mawBeaten: boolean): boolean {
  if (key === "hall" || key === "hole") return true;
  if (key === "maw") return owned.includes("yard");
  if (key === "queen") return mawBeaten && owned.includes("queen");
  return owned.includes(key);
}
