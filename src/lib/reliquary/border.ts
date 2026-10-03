export type BorderResult = "win" | "lose" | "tie";

/**
 * Square 15, the Far Bank, and onward. The dice only start rolling from
 * square 16, so a loss here can still walk the player back into the bank.
 * `next` is the square the roll landed on. Nothing else may be returned.
 */
export function borderAfter(next: number, result: BorderResult): number {
  if (result === "win" || result === "tie") return next;
  return Math.max(15, next - 1);
}

/**
 * The silver only runs if the bridge was already lit. The mark is paid
 * either way: taking the border is worth a mark even over dark water.
 */
export function borderSpreadsSilver(spadesLit: boolean, result: BorderResult): boolean {
  return spadesLit && result === "win";
}

/** Won marks are one. A tie pays nothing. */
export function borderPay(result: BorderResult): number {
  return result === "win" ? 1 : 0;
}

/** First to two throws takes the series. Ties throw again and score nothing. */
export function borderSeriesDone(you: number, them: number): boolean {
  return you >= 2 || them >= 2;
}

/** The series result once it is done, null while throws remain. */
export function borderSeriesResult(you: number, them: number): BorderResult | null {
  if (you >= 2) return "win";
  if (them >= 2) return "lose";
  return null;
}