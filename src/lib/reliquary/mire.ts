/**
 * The stretch from the well to Nix. Pure rules only: no React, no storage,
 * no DOM. `Board` owns the save fields, these functions own the decisions.
 */

export type PocketItem = "black-ace" | string;

export const WELL_SQUARE = 17;
export const TILE_SQUARES = [19, 21] as const;
export const YARD_SQUARE = 20;
export const NIX_SQUARE = 23;
export const LEDGE_LANDING = 22;

/** Falling cards for the well. Ranks one through thirteen, one suit. */
export type WellCard = { rank: number };
export type WellState = {
  you: number;
  drop: number[];
  caught: number[];
  fallen: boolean;
  cleared: boolean;
  bumps: number;
};

const WELL_TOP = 13;
export const WELL_MISSES_BEFORE_CLEAR = 3;

/**
 * Start a fall. `drop` is the ladder of ledges, dealt top-down: the first
 * ledge is the one that arrives first.
 */
export function startWell(rank = 1): WellState {
  const drop = [rank, 2, 3, 4, 5].map((step) => WELL_TOP - step + rank);
  return { you: drop[0], drop: drop.slice(1), caught: [], fallen: false, cleared: false, bumps: 0 };
}

/** A catch is legal when it does not overshoot the next ledge. */
export function wellCatch(state: WellState, rank: number): boolean {
  if (state.fallen || state.cleared) return false;
  if (!state.drop.length) return false;
  const next = state.drop[0];
  return rank <= next;
}

/** A miss costs a bump. Three bumps and you are down the well. */
export function wellMiss(state: WellState): WellState {
  if (state.fallen || state.cleared) return state;
  const bumps = state.bumps + 1;
  if (bumps >= WELL_MISSES_BEFORE_CLEAR) {
    return { ...state, bumps, fallen: true };
  }
  return { ...state, bumps };
}

export function wellCatchOk(state: WellState, rank: number): WellState {
  if (!wellCatch(state, rank)) return state;
  const drop = state.drop.slice(1);
  const caught = [...state.caught, rank];
  const cleared = drop.length === 0;
  return { ...state, you: rank, drop, caught, cleared, fallen: false };
}

/** The well is the only place the Black Ace is picked up. */
export function wellClears(state: WellState, pocket: PocketItem[]): PocketItem[] {
  if (!state.cleared || pocket.includes("black-ace")) return pocket;
  return [...pocket, "black-ace"];
}

/* ------------------------------------------------------------------ tiles */

export const TILE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const WORD_LENGTH = 3;

/** One tile per stop, drawn without repeats from the saved letters. */
export function tileLetter(held: string[]): string {
  const free = TILE_ALPHABET.filter((letter) => !held.includes(letter));
  const pool = free.length ? free : TILE_ALPHABET;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function addTile(held: string[]): string[] {
  return [...held, tileLetter(held)];
}

/* ------------------------------------------------------------------- yard */

export function canSetWord(held: string[]): boolean {
  return held.length >= WORD_LENGTH;
}

/**
 * Spend exactly three held letters into a word. The letters must all be
 * held, the word must be three long, and it may not repeat a letter.
 */
export function setWord(held: string[], picked: string[], word: string): { word: string; left: string[] } | null {
  if (picked.length !== WORD_LENGTH) return null;
  if (word.length !== WORD_LENGTH) return null;
  if (new Set(picked).size !== picked.length) return null;
  if (new Set(word).size !== word.length) return null;
  const up = word.toUpperCase();
  if (picked.some((letter, i) => letter.toUpperCase() !== up[i])) return null;
  const spent = new Set(picked.map((letter) => letter.toUpperCase()));
  if (held.length < WORD_LENGTH) return null;
  const left = [...held];
  for (const letter of spent) {
    const at = left.findIndex((held) => held.toUpperCase() === letter);
    if (at < 0) return null;
    left.splice(at, 1);
  }
  return { word: up, left };
}

/* -------------------------------------------------------------------- Nix */

export type NixPass = "ace" | "word" | "lamp";

/** Ace first, then word, then the hard game. One thing is spent, never two. */
export function nixRoute(pocket: PocketItem[], word: string | null): NixPass {
  if (pocket.includes("black-ace")) return "ace";
  if (word) return "word";
  return "lamp";
}

export function nixSpend(pocket: PocketItem[], word: string | null): { pocket: PocketItem[]; word: string | null; route: NixPass } {
  const route = nixRoute(pocket, word);
  if (route === "ace") return { pocket: pocket.filter((item) => item !== "black-ace"), word, route };
  if (route === "word") return { pocket, word: null, route };
  return { pocket, word, route };
}

/**
 * The high ledge skips the tiles. It must not skip Nix, so every path into
 * 24 and past must have offered square 23.
 */
export function nixReached(prev: number, next: number): boolean {
  if (next > NIX_SQUARE && prev < NIX_SQUARE) return false;
  return true;
}