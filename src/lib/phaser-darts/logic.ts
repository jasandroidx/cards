// Exact port of the Darts game logic from
// ~/workspace/cards-rewrite/src/components/reliquary/Sides.tsx

export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export interface Throw {
  label: string;
  score: number;
}

/** dx, dy in board units where the board radius is 150 (matches the original viewBox). */
export function scoreFrom(dx: number, dy: number): Throw {
  const radius = Math.hypot(dx, dy);
  if (radius > 150) return { label: "Miss", score: 0 };
  if (radius < 10) return { label: "Bull", score: 50 };
  if (radius < 22) return { label: "Outer bull", score: 25 };
  const step = (Math.PI * 2) / 20;
  let fromTop = Math.atan2(dy, dx) + Math.PI / 2 + step / 2;
  if (fromTop < 0) fromTop += Math.PI * 2;
  const number = ORDER[Math.floor(fromTop / step) % 20] ?? 20;
  const mult = radius >= 136 ? 2 : radius >= 96 && radius < 112 ? 3 : 1;
  const word = mult === 2 ? "Double " : mult === 3 ? "Triple " : "";
  return { label: `${word}${number}`, score: number * mult };
}

/** The house aims at triple twenty with a steady-but-human arm. Returns dx, dy in board units. */
export function cpuAim(): { dx: number; dy: number } {
  const step = (Math.PI * 2) / 20;
  const aimAngle = ORDER.indexOf(20) * step - Math.PI / 2;
  const wobble = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 55;
  const wobbleAngle = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 0.5;
  const radius = 104 + wobble;
  const angle = aimAngle + wobbleAngle;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

/** Player scatter: about ±26 board-units on every throw. */
export function playerScatter(x: number, y: number): { dx: number; dy: number } {
  return {
    dx: x + (Math.random() - 0.5) * 52,
    dy: y + (Math.random() - 0.5) * 52,
  };
}
