/**
 * The candle: the Maw's attention rendered as a resource.
 *
 * Light is kindled at the chapel (needs heartsLit) and spent in the wood:
 * perils take your light instead of your life, and the Maw's own game burns
 * one per trick. Arrive dark and the squares can't be glimpsed; play the Maw
 * dark and it loses interest (forfeit, not death). Only the chipless approach
 * kills — every wipe stays attributable to exactly one rule.
 */

export const MAX_LIGHT = 5;

/** A fresh candle, kindled at the chapel hearth. */
export function kindle(): number {
  return MAX_LIGHT;
}

/** Spend light, floored at dark. */
export function spendLight(light: number, n = 1): number {
  return Math.max(0, light - n);
}

/** No wax left: squares can't be glimpsed, the Maw won't play. */
export function isDark(light: number): boolean {
  return light <= 0;
}

/** The wood stretch where the candle matters: false queen to ash wood. */
export function isWood(id: number): boolean {
  return id >= 24 && id <= 27;
}
