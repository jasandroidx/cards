export interface MysteryEvent {
  id: string;
  text: string;
  effect: "dialogue" | "lock" | "unlock" | "swap";
  targetSquareId?: number;
  dialogue?: string[];
}

export const MYSTERIES: MysteryEvent[] = [
  {
    id: "m1",
    text: "The fog thickens. A whisper echoes from the dead seat.",
    effect: "dialogue",
    dialogue: ["The skeleton warns of a hidden trap ahead."],
  },
  {
    id: "m2",
    text: "The lantern flickers. The ghost’s presence lingers.",
    effect: "lock",
    targetSquareId: 12,
  },
  {
    id: "m3",
    text: "A shadow moves across the table. Something is watching.",
    effect: "dialogue",
    dialogue: ["The ghost suggests you look under the table."],
  },
  {
    id: "m4",
    text: "The air grows colder. The dead seat feels heavier.",
    effect: "unlock",
    targetSquareId: 5,
  },
  {
    id: "m5",
    text: "A rustling sound comes from the dead seat.",
    effect: "swap",
    targetSquareId: 2,
  },
  {
    id: "m6",
    text: "The cards shuffle on their own. A hidden message appears.",
    effect: "dialogue",
    dialogue: ["The cards whisper: 'Find the black diamond.'"]
  },
  {
    id: "m7",
    text: "The fog rolls back. The dead seat is empty.",
    effect: "lock",
    targetSquareId: 15,
  },
  {
    id: "m8",
    text: "A voice calls from the darkness: 'You are not alone.'",
    effect: "dialogue",
    dialogue: ["The ghost offers a cryptic clue about the bridge."]
  },
  {
    id: "m9",
    text: "The lantern burns out. The ghost’s form flickers.",
    effect: "unlock",
    targetSquareId: 10,
  },
  {
    id: "m10",
    text: "The cards shift. A new clue appears on the table.",
    effect: "dialogue",
    dialogue: ["The cards reveal: 'The bridge is guarded by a trap.'"]
  }
];

export function randomMystery(): MysteryEvent {
  const totalWeight = MYSTERIES.reduce((sum, m) => sum + 1, 0);
  let roll = Math.random() * totalWeight;
  let mysteryIndex = 0;
  for (const mystery of MYSTERIES) {
    roll -= 1;
    if (roll <= 0) {
      return mystery;
    }
    mysteryIndex++;
  }
  return MYSTERIES[0];
}