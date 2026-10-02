import { beats, shuffleDeck, type Card } from "./sitting.ts";

/**
 * Square 28, the Queen. She plays a card and you have to beat it, several
 * times, and once she tries to cast you off. Pure rules: no React, no storage.
 * Reuses `beats` from `sitting.ts` rather than inventing a second ranking.
 */

export const QUEEN_ROUNDS = 4;
/**
 * One more card than there are rounds. She takes one on the way, so a hand
 * the same size as the round count could never be finished.
 */
export const QUEEN_HAND = QUEEN_ROUNDS + 2;
/** The round on which she throws a card out of your hand. */
export const QUEEN_THROW_ROUND = 2;

/** Ace is high, the same as `beats`. */
function power(rank: number): number {
  return rank === 1 ? 14 : rank;
}

export type QueenState = {
  /** Rounds already won. */
  round: number;
  /** The card she is laying down this round. */
  top: Card | null;
  /** What she still holds. */
  herLeft: Card[];
  /** What you still hold. */
  mine: Card[];
  /** Cards she has cast off your hand. */
  thrown: Card[];
  /** True once she has cast you off this round. */
  tried: boolean;
  over: boolean;
  won: boolean;
};

export function startQueen(deck: Card[] = shuffleDeck()): QueenState {
  const herLeft = deck.slice(0, QUEEN_HAND);
  const mine = deck.slice(QUEEN_HAND, QUEEN_HAND * 2);
  return {
    round: 0,
    top: null,
    herLeft,
    mine,
    thrown: [],
    tried: false,
    over: false,
    won: false,
  };
}

export function queenCanBeat(state: QueenState, card: Card): boolean {
  if (state.over || !state.top) return false;
  return beats(card, state.top);
}

export function queenLegal(state: QueenState): Card[] {
  return state.mine.filter((card) => queenCanBeat(state, card));
}

/**
 * She lays down a card that you can actually answer. A card nothing in your
 * hand can beat would be a contest you cannot play, which is not a contest.
 * Answerability is measured against the hand directly, not against `top`,
 * which is null at the moment this runs.
 */
export function queenLead(state: QueenState): QueenState {
  if (state.over) return state;
  const answerable = state.herLeft.filter((card) => state.mine.some((mine) => beats(mine, card)));
  if (answerable.length) {
    // Strongest answerable card first. Your hand only gets smaller as the
    // contest runs, so she spends her hard cards while you can still answer
    // them and holds her soft ones for the last round, when you have one card
    // left. The other order strands you almost every time.
    const hardest = answerable.reduce((hi, card) => (power(card.rank) > power(hi.rank) ? card : hi));
    return { ...state, top: hardest };
  }
  // Nothing in your hand can answer anything she holds. Lead her weakest card,
  // which is the only one with any chance, rather than an arbitrary one.
  const weakest = state.herLeft.reduce<Card | null>((low, card) => (!low || power(card.rank) < power(low.rank) ? card : low), null);
  return { ...state, top: weakest };
}

/** Play a card at her. Illegal plays are refused, so the hand cannot stall. */
export function queenPlay(state: QueenState, card: Card): QueenState {
  if (state.over || !queenCanBeat(state, card)) return state;
  const mine = state.mine.filter((held) => held.id !== card.id);
  const herLeft = state.top ? state.herLeft.filter((held) => held.id !== state.top!.id) : state.herLeft;
  const round = state.round + 1;
  if (round >= QUEEN_ROUNDS) {
    return { ...state, round, top: null, herLeft, mine, over: true, won: true };
  }
  // She tries once, on her own schedule, to take a card out of your hand.
  // She still lays a fresh card afterwards; `top` must never keep pointing
  // at the card you just answered, or the round reads as unbeatable.
  let nextMine = mine;
  let tried = state.tried;
  const thrown = state.thrown;
  if (round + 1 === QUEEN_THROW_ROUND && !tried && mine.length > 0) {
    const [lost, ...kept] = mine;
    nextMine = kept;
    tried = true;
    return queenLead({ ...state, round, herLeft, mine: nextMine, thrown: [...thrown, lost], tried });
  }
  return queenLead({ ...state, round, herLeft, mine: nextMine, thrown, tried });
}

/** A hand with nothing left to answer is a loss, not a stall. */
export function queenStalled(state: QueenState): boolean {
  return !state.over && !!state.top && queenLegal(state).length === 0;
}

export function queenOutcome(state: QueenState): "won" | "lost" | "open" {
  if (!state.over) return "open";
  return state.won ? "won" : "lost";
}