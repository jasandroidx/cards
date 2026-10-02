export function face(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function yachtScore(dice: number[]): { name: string; score: number } {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const die of dice) counts[die] = (counts[die] ?? 0) + 1;
  const sum = dice.reduce((total, die) => total + die, 0);
  const best = Math.max(...counts);
  const low = [1, 2, 3, 4, 5].every((n) => (counts[n] ?? 0) > 0);
  const high = [2, 3, 4, 5, 6].every((n) => (counts[n] ?? 0) > 0);
  const full = counts.includes(3) && counts.includes(2);
  if (best >= 5) return { name: "All five", score: 50 };
  if (full) return { name: "Full house", score: 25 };
  if (low || high) return { name: "Straight", score: 30 };
  if (best === 4) return { name: "Four of a kind", score: sum };
  if (best === 3) return { name: "Three of a kind", score: sum };
  return { name: "Chance", score: sum };
}

export function mabelThrow(): number[] {
  let dice = [face(), face(), face(), face(), face()];
  for (let round = 0; round < 2; round++) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const die of dice) counts[die] = (counts[die] ?? 0) + 1;
    let keep = 0;
    for (let value = 1; value <= 6; value++) if ((counts[value] ?? 0) >= 2) keep = value;
    dice = dice.map((die) => (keep > 0 && die === keep ? die : face()));
  }
  return dice;
}
