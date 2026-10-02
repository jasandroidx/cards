export type Surprise =
  | { kind: "none" }
  | { kind: "wick"; seconds: number }
  | { kind: "voice"; line: string }
  | { kind: "gift" };

const VOICES = [
  "Don't look at the door.",
  "Hurry. Something in the hall is counting.",
  "The lamp leaned toward you.",
  "That was not the wind.",
];

export function drawSurprise(): Surprise {
  const roll = Math.random();
  if (roll < 0.5) return { kind: "none" };
  if (roll < 0.74) return { kind: "wick", seconds: 18 + Math.floor(Math.random() * 16) };
  if (roll < 0.9) return { kind: "voice", line: VOICES[Math.floor(Math.random() * VOICES.length)] ?? VOICES[0] };
  return { kind: "gift" };
}
