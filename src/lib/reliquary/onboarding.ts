/**
 * First-win onboarding nudge.
 *
 * The first table game of the session is gently rigged so the player wins
 * fast and the mark lands within minutes. One nudge per session — whichever
 * game claims it first gets it, and it is consumed. Resets on page load;
 * deliberately not saved (a returning player has already won).
 */
let nudgeAvailable = true;

/** Claim the first-game nudge. Returns true only for the first caller. */
export function takeFirstGameNudge(): boolean {
  if (!nudgeAvailable) return false;
  nudgeAvailable = false;
  return true;
}
