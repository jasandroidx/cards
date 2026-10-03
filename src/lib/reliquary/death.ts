/**
 * The Maw's tribute and the price of approaching without it.
 *
 * The Maw loves poker chips. Approach with one in your pocket and it will
 * play you. Approach without one and it eats you — a full wipe, per the
 * standing rule that every death must be telegraphed and learnable.
 */

export const MAW_ITEM = "Poker chip";

export type MawApproach = "eaten" | "plays";

/** With the tribute it plays; without it, it eats. No other outcome. */
export function mawApproach(pocket: string[]): MawApproach {
  return pocket.includes(MAW_ITEM) ? "plays" : "eaten";
}
