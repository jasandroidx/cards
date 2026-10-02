export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type EuchreCard = {
  id: string;
  rank: number;
  suit: Suit;
};

export type Play = { seat: number; card: EuchreCard };

export type HandState = {
  hands: EuchreCard[][];
  trump: Suit;
  turn: number;
  leader: number;
  trick: Play[];
  yourTricks: number;
  theirTricks: number;
  played: number;
  done: boolean;
  payout: number;
};

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = [9, 10, 11, 12, 13, 14];

export function rankLabel(rank: number): string {
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  return String(rank);
}

export function suitMark(suit: Suit): string {
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  if (suit === "clubs") return "♣";
  return "♠";
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

function sameColor(a: Suit, b: Suit): boolean {
  return isRed(a) === isRed(b);
}

export function effectiveSuit(card: EuchreCard, trump: Suit): Suit {
  if (card.rank === 11 && card.suit !== trump && sameColor(card.suit, trump)) return trump;
  return card.suit;
}

export function strength(card: EuchreCard, trump: Suit): number {
  if (card.rank === 11 && card.suit === trump) return 200;
  if (card.rank === 11 && sameColor(card.suit, trump) && card.suit !== trump) return 190;
  if (effectiveSuit(card, trump) === trump) return 100 + card.rank;
  return card.rank;
}

function shuffle(): EuchreCard[] {
  const deck: EuchreCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 7)}`, rank, suit });
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

export function dealTable(): { hands: EuchreCard[][]; upcard: EuchreCard } {
  const deck = shuffle();
  const hands = [0, 1, 2, 3].map((seat) => deck.slice(seat * 5, seat * 5 + 5));
  const upcard = deck[20]!;
  return { hands, upcard };
}

export function legalPlays(hand: EuchreCard[], lead: EuchreCard | null, trump: Suit): EuchreCard[] {
  if (!lead) return hand;
  const follow = effectiveSuit(lead, trump);
  const matching = hand.filter((card) => effectiveSuit(card, trump) === follow);
  return matching.length > 0 ? matching : hand;
}

function trickWinner(trick: Play[], trump: Suit): number {
  const leadSuit = effectiveSuit(trick[0]!.card, trump);
  let best = trick[0]!;
  for (const play of trick.slice(1)) {
    const suit = effectiveSuit(play.card, trump);
    const bestSuit = effectiveSuit(best.card, trump);
    const playFollows = suit === leadSuit || suit === trump;
    const bestFollows = bestSuit === leadSuit || bestSuit === trump;
    if (!playFollows) continue;
    if (!bestFollows || strength(play.card, trump) > strength(best.card, trump)) best = play;
  }
  return best.seat;
}

export function payoutFor(yourTricks: number): number {
  if (yourTricks >= 5) return 8;
  if (yourTricks >= 3) return 4;
  return 0;
}

function team(seat: number): number {
  return seat % 2;
}

export function cpuChoose(state: HandState): EuchreCard {
  const hand = state.hands[state.turn] ?? [];
  const lead = state.trick[0]?.card ?? null;
  const legal = legalPlays(hand, lead, state.trump);
  if (!lead) {
    const trumps = legal.filter((card) => effectiveSuit(card, state.trump) === state.trump);
    const pool = trumps.length > 0 ? trumps : legal;
    return pool.reduce((best, card) => (strength(card, state.trump) > strength(best, state.trump) ? card : best));
  }
  const winning = trickWinner(state.trick, state.trump);
  const partnerWinning = team(winning) === team(state.turn);
  const leadSuit = effectiveSuit(lead, state.trump);
  const beaters = legal.filter((card) => {
    const suit = effectiveSuit(card, state.trump);
    if (suit !== trumpFollow(leadSuit, state.trump) && suit !== state.trump && suit !== leadSuit) return false;
    return strength(card, state.trump) > strength(cardAt(state, winning), state.trump) && canBeat(card, state);
  });
  if (!partnerWinning && beaters.length > 0) {
    return beaters.reduce((low, card) => (strength(card, state.trump) < strength(low, state.trump) ? card : low));
  }
  return legal.reduce((low, card) => (strength(card, state.trump) < strength(low, state.trump) ? card : low));
}

function trumpFollow(leadSuit: Suit, trump: Suit): Suit {
  return leadSuit === trump ? trump : leadSuit;
}

function cardAt(state: HandState, seat: number): EuchreCard {
  return state.trick.find((play) => play.seat === seat)!.card;
}

function canBeat(card: EuchreCard, state: HandState): boolean {
  const winning = trickWinner(state.trick, state.trump);
  const lead = state.trick[0]!.card;
  const leadSuit = effectiveSuit(lead, state.trump);
  const suit = effectiveSuit(card, state.trump);
  if (suit !== leadSuit && suit !== state.trump) return false;
  return strength(card, state.trump) > strength(cardAt(state, winning), state.trump);
}

export function cpuCall(hands: EuchreCard[][], avoid: Suit): Suit {
  const hand = hands[1] ?? [];
  let best: Suit = SUITS.find((suit) => suit !== avoid) ?? "spades";
  let score = -1;
  for (const suit of SUITS) {
    if (suit === avoid) continue;
    const value = hand.reduce((sum, card) => sum + (effectiveSuit(card, suit) === suit ? strength(card, suit) : 0), 0);
    if (value > score) {
      score = value;
      best = suit;
    }
  }
  return best;
}

export function openHand(trump: Suit, hands: EuchreCard[][]): HandState {
  const state: HandState = {
    hands: hands.map((hand) => hand.slice()),
    trump,
    turn: 0,
    leader: 0,
    trick: [],
    yourTricks: 0,
    theirTricks: 0,
    played: 0,
    done: false,
    payout: 0,
  };
  return pump(state);
}

export function playCard(state: HandState, card: EuchreCard): HandState {
  if (state.done || state.turn !== 0) return state;
  const legal = legalPlays(state.hands[0] ?? [], state.trick[0]?.card ?? null, state.trump);
  if (!legal.some((item) => item.id === card.id)) return state;
  return pump(applyPlay(state, card));
}

function applyPlay(state: HandState, card: EuchreCard): HandState {
  const hands = state.hands.map((hand, seat) => (seat === state.turn ? hand.filter((item) => item.id !== card.id) : hand));
  const trick = [...state.trick, { seat: state.turn, card }];
  const next: HandState = { ...state, hands, trick, turn: (state.turn + 1) % 4 };
  if (trick.length < 4) return next;
  const winner = trickWinner(trick, state.trump);
  const yours = team(winner) === 0;
  const played = state.played + 1;
  const yourTricks = state.yourTricks + (yours ? 1 : 0);
  const theirTricks = state.theirTricks + (yours ? 0 : 1);
  const done = played >= 5;
  return {
    ...next,
    trick: done ? trick : [],
    leader: winner,
    turn: winner,
    played,
    yourTricks,
    theirTricks,
    done,
    payout: done ? payoutFor(yourTricks) : 0,
  };
}

function pump(state: HandState): HandState {
  let next = state;
  while (!next.done && next.turn !== 0) {
    const card = cpuChoose(next);
    next = applyPlay(next, card);
  }
  return next;
}
