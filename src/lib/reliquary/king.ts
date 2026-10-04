/**
 * Square 26, the King on a burnt square. He moves once, in the note: the
 * walk does not restart and the player does not advance. Pure rules only.
 */

export type KingCall = "passed" | "card" | "roll";

/**
 * One die. Even, you stepped past him and stay where you are. Odd, he takes
 * a card out of your hand, or, with an empty hand, the next roll instead.
 */
export function kingCalls(die: number, hasCard: boolean): KingCall {
  if (die % 2 === 0) return "passed";
  return hasCard ? "card" : "roll";
}

/** The die is one through six. Anything else is not a die. */
export function isKingDie(die: number): boolean {
  return Number.isInteger(die) && die >= 1 && die <= 6;
}

export function kingSpares(die: number): boolean {
  return kingCalls(die, true) === "passed";
}