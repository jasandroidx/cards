export type ShoutSuit = "rust" | "bone" | "moss" | "ash";

export type ShoutCard = {
  id: string;
  rank: number;
  suit: ShoutSuit;
};

export const SHOUT_SUITS: ShoutSuit[] = ["rust", "bone", "moss", "ash"];
export const SHOUT_RANKS = [1, 2, 3, 4, 5, 6, 7, 8];
export const SHOUT_HAND = 5;
export const SHOUT_WAVES = 8;
export const SHOUT_DEPTH = 3;

export const SHOUT_MARKS: Record<ShoutSuit, string> = {
  rust: "◆",
  bone: "▲",
  moss: "●",
  ash: "■",
};

export function shoutRankLabel(rank: number): string {
  return rank === 1 ? "A" : String(rank);
}

export function shoutDeck(): ShoutCard[] {
  const cards: ShoutCard[] = [];
  for (const suit of SHOUT_SUITS) {
    for (const rank of SHOUT_RANKS) {
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

export function canShout(card: ShoutCard, threat: ShoutCard): boolean {
  if (card.suit === threat.suit) return true;
  return card.rank === threat.rank + 1;
}

export type ShoutBout = {
  hand: ShoutCard[];
  stock: ShoutCard[];
  lane: ShoutCard[];
  wave: number;
  passed: number;
  missed: number;
  done: boolean;
};

function refillLane(bout: ShoutBout): { lane: ShoutCard[]; stock: ShoutCard[] } {
  const lane = bout.lane.slice(1);
  let stock = bout.stock;
  if (stock.length < SHOUT_DEPTH) {
    stock = [...stock, ...shoutDeck()];
  }
  while (lane.length < SHOUT_DEPTH) {
    const next = stock[0];
    if (!next) break;
    lane.push(next);
    stock = stock.slice(1);
  }
  return { lane, stock };
}

function dealFrom(bout: ShoutBout): { hand: ShoutCard[]; stock: ShoutCard[] } {
  if (bout.hand.length >= SHOUT_HAND || bout.stock.length === 0) {
    return { hand: bout.hand, stock: bout.stock };
  }
  const next = bout.stock[0]!;
  return { hand: [...bout.hand, next], stock: bout.stock.slice(1) };
}

function guaranteeAnswer(
  hand: ShoutCard[],
  stock: ShoutCard[],
  threat: ShoutCard | undefined,
): { hand: ShoutCard[]; stock: ShoutCard[] } {
  if (!threat) return { hand, stock };
  if (hand.some((card) => canShout(card, threat))) return { hand, stock };
  let pool = stock;
  let index = pool.findIndex((card) => canShout(card, threat));
  if (index < 0) {
    pool = shoutDeck();
    index = pool.findIndex((card) => canShout(card, threat));
  }
  if (index < 0) return { hand, stock };
  const rest = pool.slice();
  const [card] = rest.splice(index, 1);
  if (hand.length < SHOUT_HAND) return { hand: [...hand, card!], stock: rest };
  const spare = hand.findIndex((item) => !canShout(item, threat));
  if (spare < 0) return { hand, stock };
  const dealt = hand.slice();
  dealt[spare] = card!;
  return { hand: dealt, stock: rest };
}

function advance(bout: ShoutBout, matched: boolean): ShoutBout {
  const { lane, stock } = refillLane(bout);
  const drawn = dealFrom({ ...bout, lane, stock });
  const kept = guaranteeAnswer(drawn.hand, drawn.stock, lane[0]);
  const wave = bout.wave + 1;
  return {
    hand: kept.hand,
    stock: kept.stock,
    lane,
    wave,
    passed: matched ? bout.passed + 1 : bout.passed,
    missed: matched ? bout.missed : bout.missed + 1,
    done: wave >= SHOUT_WAVES,
  };
}

export function startShout(): ShoutBout {
  const all = shoutDeck();
  const lane = all.slice(0, SHOUT_DEPTH);
  let stock = all.slice(SHOUT_DEPTH);
  const dealt = stock.slice(0, SHOUT_HAND);
  stock = stock.slice(SHOUT_HAND);
  const kept = guaranteeAnswer(dealt, stock, lane[0]);
  return { hand: kept.hand, stock: kept.stock, lane, wave: 0, passed: 0, missed: 0, done: false };
}

export function shoutAnswer(bout: ShoutBout, cardId: string): ShoutBout {
  if (bout.done) return bout;
  const card = bout.hand.find((item) => item.id === cardId);
  const threat = bout.lane[0];
  if (!card || !threat || !canShout(card, threat)) return bout;
  return advance({ ...bout, hand: bout.hand.filter((item) => item.id !== cardId) }, true);
}

export function shoutMiss(bout: ShoutBout): ShoutBout {
  if (bout.done) return bout;
  return advance(bout, false);
}

export function shoutCleared(bout: ShoutBout): boolean {
  return bout.done && bout.missed === 0;
}