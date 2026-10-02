/**
 * Job 8: the house of cards. A timer that can fall. Pure rules only.
 */
export type HouseState = {
  standing: boolean;
  time: number;
  elapsed: number;
  fell: boolean;
};

export const HOUSE_TIME_MS = 3600;
export const HOUSE_BUMP_MS = 600;

export function startHouse(timeMs = HOUSE_TIME_MS): HouseState {
  return { standing: true, time: timeMs, elapsed: 0, fell: false };
}

/** Bump the table. Too many bumps and the house falls. */
export function bumpHouse(state: HouseState, amount = HOUSE_BUMP_MS): HouseState {
  if (!state.standing || state.fell) return state;
  const elapsed = state.elapsed + amount;
  if (elapsed >= state.time) {
    if (elapsed >= state.time + amount * 2) {
      return { ...state, elapsed, fell: true, standing: false };
    }
    if (elapsed > state.time) {
      return { ...state, elapsed, fell: true, standing: false };
    }
    return { ...state, elapsed, fell: false, standing: true };
  }
  return { ...state, elapsed };
}

export function houseSettled(state: HouseState): boolean {
  return state.standing && !state.fell && state.elapsed >= state.time;
}

export function houseReward(state: HouseState, boons: string[]): string[] {
  if (houseSettled(state) && !boons.includes("column")) {
    return [...boons, "column"];
  }
  if (houseSettled(state)) return boons;
  return boons;
}