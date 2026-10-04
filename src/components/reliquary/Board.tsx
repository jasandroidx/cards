import { useEffect, useRef, useState } from "react";
import { cellOf, COLS, lightCopy, SQUARES, type Square } from "@/lib/reliquary/road";
import { MAW_ITEM } from "@/lib/reliquary/death";
import { MAX_LIGHT, isDark, isWood, kindle, spendLight } from "@/lib/reliquary/light";
import { nextGate, roadOpen, type Gate, type Mode } from "@/lib/reliquary/sitting";
import { Table } from "@/components/reliquary/Table";
import { Euchre } from "@/components/reliquary/Euchre";
import { Border, Yacht } from "@/components/reliquary/Games";
import { Shout } from "@/components/reliquary/Shout";
import { borderAfter, borderPay, borderSpreadsSilver, type BorderResult } from "@/lib/reliquary/border";
import { Scaffold } from "@/components/reliquary/Scaffold";
import { Finale } from "@/components/reliquary/Finale";
import { Queen } from "@/components/reliquary/Queen";
import { Well } from "@/components/reliquary/Well";
import { Tafl } from "@/components/reliquary/Tafl";
import { Nix, NixLamp, Tiles, Yard } from "@/components/reliquary/Mire";
import { addTile, nixSpend, NIX_SQUARE, WELL_SQUARE, YARD_SQUARE } from "@/lib/reliquary/mire";
import { kingCalls } from "@/lib/reliquary/king";
import { rankLabel, suitMark, isRed, type Suit } from "@/lib/reliquary/klondike";
import { signSound, lossSound, gateSound, winSting, resetSting, markTick } from "@/lib/reliquary/atmosphere";
import { logEvent, getEvents, clearTelemetry, type TelemetryEvent } from "@/lib/reliquary/telemetry";

const AGES = [
  {
    at: 0,
    key: "hall",
    name: "The Hall",
    src: "/hall.jpg",
    alt: "A quiet solitaire table under a single lamp",
    line: "The lamp is still lit. The cards have not moved.",
  },
  {
    at: 0,
    key: "hole",
    name: "The Hole",
    src: "/plates/road-lamp.jpg",
    alt: "A lamp on the cobbled road under the table",
    line: "You fell. Under the table is every game that broke.",
  },
  {
    at: 10,
    key: "chapel",
    name: "The Chapel",
    src: "/plates/dice-fireplace.jpg",
    alt: "Five dice kept by the hearth fire",
    line: "Someone kept five dice, and the fire.",
  },
  {
    at: 14,
    key: "bridge",
    name: "The Bridge",
    src: "/river.jpg",
    alt: "A black river under a broken bridge",
    line: "The far bank is one bid away.",
  },
  {
    at: 20,
    key: "yard",
    name: "The Yard",
    src: "/yard.jpg",
    alt: "Stone tiles standing in the mire",
    line: "Three letters would be enough.",
  },
  {
    at: 27,
    key: "maw",
    name: "The Maw",
    src: "/plates/maw-portrait.jpg",
    alt: "The Maw — a faceless thing of cards and bone blocking the mountain road",
    line: "Flesh of cards. Bone of dice. It does not want poker chips.",
  },
  {
    at: 28,
    key: "queen",
    name: "The Queen",
    src: "/queen.jpg",
    alt: "The queen, face in shadow, coat a broken window",
    line: "Her face has not come back.",
  },
  {
    at: 29,
    key: "reliquary",
    name: "The Reliquary",
    src: "/plates/reliquary.jpg",
    alt: "The reliquary, waiting",
    line: "The same room. But the seat is warm now.",
  },
] as const;

const GAP_X = 118;
const GAP_Y = 132;
const ORIGIN_X = 78;
const ORIGIN_Y = 36;

function xy(id: number) {
  const { col, rowFromTop } = cellOf(id);
  return { x: ORIGIN_X + col * GAP_X, y: ORIGIN_Y + rowFromTop * GAP_Y };
}

function ageIndexFor(id: number): number | null {
  const index = AGES.findIndex((age) => age.key !== "hall" && age.at === id);
  return index >= 0 ? index : null;
}

function vistaIndex(id: number): number {
  let index = 1;
  for (let i = 0; i < AGES.length; i++) {
    const age = AGES[i];
    if (age && age.key !== "hall" && age.at <= id) index = i;
  }
  return index;
}

const ROLL = ["", "one", "two", "three", "four", "five", "six"];

/** The empty squares are not empty. sift = gamble a card against a roll;
 *  glimpse = look ahead at the next named square for free. */
const WAYLAY: Record<number, "sift" | "glimpse"> = {
  1: "sift",
  2: "sift",
  5: "sift",
  7: "sift",
  9: "glimpse",
  11: "sift",
  13: "sift",
  15: "glimpse",
  22: "glimpse",
  27: "sift",
};

const JOKER = [
  "The air of light is gone. The fall was a silence. You are nothing now. A face without a suit.",
  "We are Under the Table. I'm the Joker. I wasn't in that deck.",
  "A new fool. Win one hand at the lamp. It pays a poker chip.",
  "Spend the poker chip and the chapel opens. Then take the road. I'm leaving.",
];

/** One line for the player who has signed before. The table remembers. */
const JOKER_SHORT = ["Back again. The table remembers you."];

/** Things the dark says when you are not looking at it. */
const WHISPERS = [
  "It knows your name.",
  "The cards have not moved.",
  "Something dealt here, and left.",
  "The wax is thin. You are thin.",
  "Do not count the chairs.",
  "She is dreaming of a face.",
  "The road remembers your feet.",
  "Ante up. Ante up. Ante up.",
];

/** The Joker drops by, uninvited. Taunts follow your progress. */
function jokerTaunt(owned: string[], mawBeaten: boolean, queenFaced: boolean): string {
  if (queenFaced) return "She sees you now. I do too. The seat is warm, Dealer.";
  if (mawBeaten) return "You fed the guard. Kind. It had a name, once. I ate the name.";
  if (owned.includes("yard")) return "Three letters. You spell like a child. Keep walking.";
  if (owned.includes("bridge")) return "The river took your bid and kept the change.";
  if (owned.includes("chapel")) return "Kindled, are we? Burn brightly. It makes the dark darker.";
  return "Still at the lamp, little fool? The poker chips won't spend themselves.";
}

/** The Joker reacts to what you DO, not just where you are. Session-scoped — he forgets nothing, but he paces himself. */
const JOKER_LOSS_FIRST = "First blood. The lamp keeps the poker chip; I keep the memory.";
const JOKER_LOSS_AGAIN = [
  "Again? The lamp is patient. I am not.",
  "You lose the way the river flows. Naturally.",
  "Shall I deal your hands for you? It would be kinder.",
];
const JOKER_IDLE = "The road does not wait, fool. Only I wait, and I am bored.";
const JOKER_FEED3 = "Three wax for the flames. You burn your life to see by it. Apt.";
const JOKER_QUEEN_ROUND = "One finger moves. She is waking, and it is your fault.";
const JOKER_FIRST_BUY = "Paid. The chain breaks, the dark deepens. You bought a longer road.";
const JOKER_RETURNING = "Back again. The dirt remembers you, even if you don't.";
const JOKER_BROKE = "Empty. The lamp looks at your empty hands and laughs.";

/** The rite spoken when a gate's chain breaks. Not a transaction — a ritual. */
const GATE_RITE: Record<string, string> = {
  chapel: "One debt paid. A chain breaks. The rules loosen. Enter the chapel and find what is broken.",
  bridge: "Two poker chips spent. Another chain falls. The river remembers being crossed.",
  yard: "Two poker chips spent. Another chain falls. The mud keeps what it is given.",
  queen: "Three poker chips. The last lock. The heart of the Table waits — throne and dungeon. Give her a suit. Give her a law. Restore her.",
  reliquary: "Three poker chips. The final chain. It opens.",
};

/** The current directive, in plain language. Answers "what do I do now." */
function objective(
  signed: boolean,
  marks: number,
  owned: string[],
  mawBeaten: boolean,
  position: number,
  sat: number,
): string | null {
  if (!signed) return "Sign the paper.";
  const gate = nextGate(owned, mawBeaten);
  if (position < 0 && !owned.includes("chapel")) {
    if (marks < 1) return "Win a poker chip at the lamp — the flame is all that says you are here. Sit at any table game.";
    return "Open the chapel.";
  }
  if (position < 0) return "Take the road. That's outside — open the map, click a square, step in.";
  if (position >= 27 && position < 28 && !mawBeaten) return "Face the Maw. It loves poker chips.";
  if (sat >= 3 && position < 10) return "Walk the road — map, square, step in. The lamp won't deal again — come back when you need poker chips.";
  if (!gate) return "Walk to the reliquary at square 29.";
  if (marks < gate.cost)
    return `Earn ${gate.cost} ${gate.cost === 1 ? "poker chip" : "poker chips"} to open ${gate.opens}. Play hands back in the hall.`;
  return `Open ${gate.opens}. Then walk — map, square, step in.`;
}

function where(marks: number, owned: string[], mawBeaten: boolean, position: number, sat: number): string {
  const gate = nextGate(owned, mawBeaten);
  const purse = `${marks} ${marks === 1 ? "poker chip" : "poker chips"}.`;
  if (position >= 27 && position < 28 && !mawBeaten) {
    return "It is lying in the road. It loves poker chips. Yours will not move it.";
  }
  if (position === 26 && !mawBeaten) {
    return "The king's square. Beyond him the dark has teeth: it loves a poker chip, and it eats the empty-handed. Go back kindled, or don't go.";
  }
  if (position < 0 && !owned.includes("chapel")) {
    if (marks < 1) return "The lamp is all that stands between you and the dark. Play one hand. A win pays a poker chip.";
    return `${purse} Open the chapel. Then take the road.`;
  }
  if (position < 0) return `${purse} The chapel is open. Take the road — map, square, step in.`;
  if (sat >= 3 && position < 10) {
    return `${purse} The lamp will not deal a fourth hand. Walk the road. Then you can come back.`;
  }
  if (!gate) return `${purse} The way back is open.`;
  if (marks < gate.cost) {
    return `${purse} ${gate.opens} costs ${gate.cost}. Go back to the hall and play a hand.`;
  }
  return `${purse} Click a square on the map and step in. ${gate.opens} costs ${gate.cost}, and you can pay.`;
}

function linesFor(
  marks: number,
  owned: string[],
  mawBeaten: boolean,
  position: number,
  pocket: string[],
  blankSpent: boolean,
  cupboard: boolean,
  hearthFed: boolean,
): string[] {
  const lines = ["These came down with you. The rest are still in the dark."];
  if (position > 0) lines.push("Someone went down first.");
  if (marks > 0) lines.push("A place will agree, if you play it.");
  if (pocket.includes("Blank card")) lines.push("One card has no face. A gate will take it instead of poker chips.");
  if (blankSpent) lines.push("The blank card is gone. A way opened without poker chips.");
  if (pocket.includes("Bent key") && !cupboard) lines.push("A bent key. The cupboard in the room will take it.");
  if (cupboard) lines.push("Inside the cupboard, scratched in the wood: 4, 1, 8.");
  if (pocket.includes("Cracked cup")) lines.push("The cracked cup looks through the far wall of the cell.");
  if (pocket.includes("Torn half")) lines.push("Half a two of spades. The other half is somewhere.");
  if (pocket.includes("Mended two")) lines.push("A mended two of spades. Across the tear: he deals last.");
  if (pocket.includes("Folded scrap")) lines.push("A folded scrap. 'Don't let him deal.'");
  if (hearthFed) lines.push("You fed the chapel hearth. It showed you her hands.");
  if (pocket.some((item) => item !== "Blank card" && item !== "Bent key" && item !== "Cracked cup")) lines.push("The games you win leave a piece behind.");
  if (owned.includes("chapel")) lines.push("The houses walked off. A room can only keep one rule.");
  if (owned.includes("bridge")) lines.push("He deals, and then he tells you what the hand meant.");
  if (mawBeaten) lines.push("It was never a place. It moved.");
  if (pocket.includes(MAW_ITEM)) lines.push("A poker chip. The liar's. It loves these.");
  if (owned.includes("queen")) lines.push("Through the glass, the lamp is yours.");
  return lines;
}

type Save = {
  marks: number;
  owned: string[];
  mawBeaten: boolean;
  heartsLit?: boolean;
  spadesLit?: boolean;
  silver?: boolean;
  queenFaced?: boolean;
  taflWon?: boolean;
  letters?: string[];
  word?: string | null;
  boons?: string[];
  position: number;
  carried?: { rank: number; suit: string }[];
  fallen?: boolean;
  heard?: boolean;
  signed?: boolean;
  sat?: number;
  met?: boolean;
  pocket?: string[];
  light?: number;
  blankSpent?: boolean;
  cupboard?: boolean;
  door?: boolean;
  scratchDone?: boolean;
  stoneOut?: boolean;
  hearthFed?: boolean;
  skipRoll?: boolean;
  pipOwed?: boolean;
  kingOwed?: boolean;
};

export function Board({ onReturn }: { onReturn?: (marks: number, boons: string[]) => void }) {
  const [ageIndex, setAgeIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(false);
  const [dead, setDead] = useState(false);
  const [light, setLight] = useState(0);
  const [euchreOpen, setEuchreOpen] = useState(false);
  const [playing, setPlaying] = useState<"yacht" | "border" | "scaffold" | "well" | "tile" | "yard" | "nix" | "nixlamp" | "queen" | "finale" | "tafl" | null>(null);
  const [shouting, setShouting] = useState(false);
  const [picked, setPicked] = useState(0);
  const [marks, setMarks] = useState(0);
  const [burst, setBurst] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [mawBeaten, setMawBeaten] = useState(false);
  const [heartsLit, setHeartsLit] = useState(false);
  const [spadesLit, setSpadesLit] = useState(false);
  const [silver, setSilver] = useState(false);
  const [queenFaced, setQueenFaced] = useState(false);
  const [taflWon, setTaflWon] = useState(false);
  const [letters, setLetters] = useState<string[]>([]);
  const [word, setWord] = useState<string | null>(null);
  const [boons, setBoons] = useState<string[]>([]);
  const [position, setPosition] = useState(-1);
  const [lastRoll, setLastRoll] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Returning player: a signed save exists, so the Joker skips his speech.
  const [returning] = useState(() => {
    try {
      const raw = localStorage.getItem("reliquary-v3");
      if (!raw) return false;
      return (JSON.parse(raw) as { signed?: boolean }).signed === true;
    } catch {
      return false;
    }
  });
  const [note, setNote] = useState<string | null>(null);
  const [gateCeremony, setGateCeremony] = useState<Gate | null>(null);
  const [riteStage, setRiteStage] = useState<"strain" | "broken">("strain");
  const riteTimer = useRef<number>(0);
  /** Consecutive wins — drives the escalating win sting. Resets on any loss. */
  const streakRef = useRef(0);
  /** Telemetry: first mark earned this session (write-only observation). */
  const wonOnceRef = useRef(false);
  /** Telemetry: triple-click times on the objective banner (debug overlay). */
  const bannerClicks = useRef<number[]>([]);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  /** Pause menu: Esc or the corner button. Works from every game state. */
  const [paused, setPaused] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  // First click anywhere in the game.
  useEffect(() => {
    const onFirst = () => logEvent("first_interaction");
    window.addEventListener("click", onFirst, { once: true });
    return () => window.removeEventListener("click", onFirst);
  }, []);
  // Esc toggles the pause menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmWipe(false);
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);  /** The Joker watches what you do. Session counters only — he forgets when you die. */
  const jokerAt = useRef(0);
  const lossCount = useRef(0);
  const feedCount = useRef(0);
  const lastRollAt = useRef(Date.now());
  const idleNoted = useRef(false);
  const jokerTimers = useRef<number[]>([]);
  /** A behavior remark through the note channel. 3-minute cooldown; optional delay so game feedback lands first. */
  function jokerSays(line: string, delayMs = 0) {
    if (Date.now() - jokerAt.current < 180000) return;
    jokerAt.current = Date.now();
    if (delayMs <= 0) { setNote(line); return; }
    const id = window.setTimeout(() => setNote(line), delayMs);
    jokerTimers.current.push(id);
  }
  useEffect(() => () => { jokerTimers.current.forEach((t) => window.clearTimeout(t)); }, []);  /** Displayed purse — counts up toward `marks` with pitched ticks. Logic always reads `marks`. */
  const [shownMarks, setShownMarks] = useState(marks);
  const shownRef = useRef(marks);
  useEffect(() => {
    if (marks === shownRef.current) return;
    const from = shownRef.current;
    const total = Math.abs(marks - from);
    // Losses and purchases snap — only wins count up.
    if (marks < from) { shownRef.current = marks; setShownMarks(marks); return; }
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      shownRef.current = from + step;
      setShownMarks(shownRef.current);
      markTick(step, total);
      if (step >= total) clearInterval(id);
    }, 90);
    return () => clearInterval(id);
  }, [marks]);
  const [ended, setEnded] = useState(false);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [jokerVisit, setJokerVisit] = useState<{ x: number; y: number } | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [carried, setCarried] = useState<{ rank: number; suit: string }[]>([]);
  const [fallen, setFallen] = useState(false);
  const [heard, setHeard] = useState(false);
  const [signed, setSigned] = useState(false);
  const [sat, setSat] = useState(0);
  const [met, setMet] = useState(false);
  const [pocket, setPocket] = useState<string[]>([]);
  const [blankSpent, setBlankSpent] = useState(false);
  const [view, setView] = useState<"table" | "room" | "cell" | "glass" | "burn">("table");
  // Myst slice 2: the chapel has its own views — hearth, pews, altar.
  const [chapelView, setChapelView] = useState<"hearth" | "pews" | "altar">("hearth");
  const [hearthFed, setHearthFed] = useState(false);
  const bowlCount = useRef(0);
  const [cupboard, setCupboard] = useState(false);
  const [door, setDoor] = useState(false);
  // Myst slice: the world remembers being touched.
  const [seated, setSeated] = useState(false); // session only — you stand when you leave
  const [chairKnown, setChairKnown] = useState(false); // session only
  const [scratchDone, setScratchDone] = useState(false); // saved — the count was finished
  const [stoneOut, setStoneOut] = useState(false); // saved — the stone stays out
  const [skipRoll, setSkipRoll] = useState(false);
  const [pipOwed, setPipOwed] = useState(false);
  const [kingOwed, setKingOwed] = useState(false);
  const [waylay, setWaylay] = useState<number | null>(null);
  const [pad, setPad] = useState(false);
  const [code, setCode] = useState("");
  const [grave, setGrave] = useState<{ marks: number; position: number; when: number } | null>(null);
  const age = AGES[ageIndex] ?? AGES[0];
  const here = position;
  const square: Square | undefined = SQUARES[picked];
  const vista = ageIndexFor(picked);
  const standing = position >= 0 ? SQUARES[position] : undefined;
  // Leaving the table means standing up. The seat does not follow you.
  useEffect(() => {
    if (seated && (age.key !== "hall" || view !== "table")) setSeated(false);
  }, [seated, age.key, view]);

  function canEnter(id: number) {
    if (id >= 29) return roadOpen("reliquary", owned, mawBeaten);
    if (id >= 28) return roadOpen("queen", owned, mawBeaten);
    if (id >= 20) return roadOpen("yard", owned, mawBeaten);
    if (id >= 14) return roadOpen("bridge", owned, mawBeaten);
    if (id >= 10) return roadOpen("chapel", owned, mawBeaten);
    return true;
  }

  function look(index: number) {
    const nextAge = AGES[index];
    if (!nextAge) return;
    setView("table");
    setChapelView("hearth");
    if (nextAge.key === "hall") {
      setAgeIndex(0);
      setNote(null);
      return;
    }
    if (position < nextAge.at || !roadOpen(nextAge.key, owned, mawBeaten)) {
      setNote("You have not walked that far.");
      return;
    }
    setNote(null);
    setAgeIndex(index);
    setPicked(nextAge.at);
  }

  // The dark whispers, every minute or so.
  useEffect(() => {
    if (!signed) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.6) {
        setWhisper(WHISPERS[Math.floor(Math.random() * WHISPERS.length)] ?? null);
        window.setTimeout(() => setWhisper(null), 8000);
      }
    }, 75000);
    return () => window.clearInterval(id);
  }, [signed]);

  // The Joker drops by, rarely, uninvited.
  useEffect(() => {
    if (!signed || !met) return;
    const id = window.setInterval(() => {
      if (!jokerVisit && Math.random() < 0.25) {
        setJokerVisit({ x: 8 + Math.random() * 84, y: 12 + Math.random() * 40 });
        window.setTimeout(() => setJokerVisit(null), 20000);
      }
    }, 120000);
    return () => window.clearInterval(id);
  }, [signed, met, jokerVisit]);

  // The Joker notices when you stop walking. Ninety seconds of stillness on the road.
  useEffect(() => {
    if (!signed) return;
    const id = window.setInterval(() => {
      if (
        position >= 0 &&
        playing === null &&
        !dead &&
        !idleNoted.current &&
        Date.now() - lastRollAt.current > 90000
      ) {
        idleNoted.current = true;
        jokerSays(JOKER_IDLE);
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [signed, position, playing, dead]);

  // Card hover tilt: hand cards lean toward the cursor. Visual only — writes
  // CSS custom properties directly, no React state involved.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const MAX = 8; // degrees
    let current: HTMLElement | null = null;
    const clear = () => {
      if (current) {
        current.style.removeProperty("--tx");
        current.style.removeProperty("--ty");
        current = null;
      }
    };
    const onMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest?.(".card:not(.empty)") as HTMLElement | null;
      const usable = card && !card.closest(".card-btn:disabled") ? card : null;
      if (usable !== current) clear();
      if (!usable) return;
      current = usable;
      const rect = usable.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      usable.style.setProperty("--ty", `${(px * 2 * MAX).toFixed(2)}deg`);
      usable.style.setProperty("--tx", `${(-py * 2 * MAX).toFixed(2)}deg`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", clear);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", clear);
      clear();
    };
  }, []);

  /** Start over: wipes the run and telemetry, keeps the grave (the road remembers), reloads fresh. */
  function startOver() {
    try {
      localStorage.removeItem("reliquary-v3");
      localStorage.removeItem("reliquary-telemetry");
    } catch {
      /* keep a new game */
    }
    window.location.reload();
  }

  function fall() {    setPosition(0);
    logEvent("road_entered");
    setPicked(0);
    setAgeIndex(vistaIndex(0));
    setNote(null);
  }

  function roll() {
    lastRollAt.current = Date.now();
    idleNoted.current = false;
    if (waylay !== null) {
      setNote("The ash is waiting on your answer. Take the chance, or walk on.");
      return;
    }
    if (kingOwed) {
      setNote("The king is waiting. Give him a card from your hand, or give him your next roll.");
      return;
    }
    if (pipOwed) {
      setNote("Pip is waiting. Cut the deck.");
      return;
    }
    if (skipRoll) {
      setSkipRoll(false);
      setNote("This roll is taken. You stay where you are.");
      return;
    }
    // Later: roll two dice. Doubles should pay something. One die for now.
    const n = 1 + Math.floor(Math.random() * 6);
    let next = Math.max(0, position);
    let stopped = false;
    let jumped = "";
    for (let step = 0; step < n; step++) {
      const dest = next + 1;
      if (dest > 29 || !canEnter(dest)) {
        stopped = true;
        break;
      }
      next = dest;
      if (next === 4 && canEnter(9)) {
        next = 9;
        jumped = "The low stair takes you up.";
        break;
      }
      if (next === 18 && canEnter(22)) {
        next = 22;
        jumped = "The high ledge takes you across.";
        break;
      }
    }
    setLastRoll(n);
    setPosition(next);
    setPicked(next);
    setAgeIndex(vistaIndex(next));
    setSat(0);
    const place = SQUARES[next];
    if (next === 3 && !jumped) {
      setPipOwed(true);
      setNote(`A ${ROLL[n]}. Pip calls a rank. Cut the deck.`);
      return;
    }
    if (next === 6) {
      setSkipRoll(true);
      setNote(`A ${ROLL[n]}. The cracked cup takes your next roll.`);
      return;
    }
    if (next === 8) {
      const lost = carried[0];
      if (lost) {
        setCarried(carried.slice(1));
        setNote(`A ${ROLL[n]}. The row takes the ${rankLabel(lost.rank)} from your hand.`);
      } else {
        setSkipRoll(true);
        setNote(`A ${ROLL[n]}. The row finds no card, so it takes your next roll.`);
      }
      return;
    }
    if (next === 10) {
      setNote(`A ${ROLL[n]}. Mabel has five dice. Beat her.`);
      return;
    }
    if (next === 26) {
      // The King moves once, in the note. No second walk: he never calls
      // setPosition, so the player stays on 26 either way.
      const k = 1 + Math.floor(Math.random() * 6);
      const call = kingCalls(k, carried.length > 0);
      if (call === "passed") {
        setNote(`A ${ROLL[n]}. The king throws ${ROLL[k]}. Even. You stepped past him.`);
        return;
      }
      if (call === "card") {
        if (light > 0) {
          setLight((value) => spendLight(value, 1));
          setNote(`A ${ROLL[n]}. The king throws ${ROLL[k]}. Odd. He takes your light instead of a card.`);
          return;
        }
        setKingOwed(true);
        setNote(`A ${ROLL[n]}. The king throws ${ROLL[k]}. Odd, and your candle is out. A card from your hand, or your next roll — choose.`);
        return;
      }
      setSkipRoll(true);
      setNote(`A ${ROLL[n]}. The king throws ${ROLL[k]}. Odd, and your hand is empty, so he takes your next roll.`);
      return;
    }
    // The empty squares are not empty. Each offers one small gamble.
    const way = WAYLAY[next];
    if (way) {
      setWaylay(next);
      setNote(
        way === "sift"
          ? `A ${ROLL[n]}. Ash and bone underfoot. Sift it, or walk on.`
          : `A ${ROLL[n]}. ${place?.name ?? "Still road"}. Look ahead, or walk on.`,
      );
      return;
    }
    if (jumped) setNote(`${jumped} ${place?.name ?? ""}.`.trim());
    else if (stopped) setNote(`A ${ROLL[n]}. The way ahead is shut.`);
    else setNote(place?.labeled ? `A ${ROLL[n]}. ${place.name}.` : `A ${ROLL[n]}.`);
  }

  function cutPip() {
    const his = 1 + Math.floor(Math.random() * 13);
    const yours = 1 + Math.floor(Math.random() * 13);
    setPipOwed(false);
    if (yours >= his) {
      setNote(`Pip called ${rankLabel(his)}. You cut ${rankLabel(yours)}. You pass.`);
      return;
    }
    setPosition(2);
    setPicked(2);
    setAgeIndex(vistaIndex(2));
    setNote(`Pip called ${rankLabel(his)}. You cut ${rankLabel(yours)}. You do not pass.`);
  }

  function payKingCard() {
    const lost = carried[0];
    if (!lost || !kingOwed) return;
    setCarried(carried.slice(1));
    setKingOwed(false);
    setNote(`You give the king the ${rankLabel(lost.rank)}. He does not move.`);
  }

  function payKingRoll() {
    if (!kingOwed) return;
    setKingOwed(false);
    setSkipRoll(true);
    setNote("You give the king your next roll. He does not move.");
  }

  function waylayTake() {
    if (waylay === null) return;
    const kind = WAYLAY[waylay];
    setWaylay(null);
    if (kind === "glimpse") {
      const ahead = SQUARES.find((s) => s.id > position && s.labeled);
      setNote(ahead ? `Beyond the ash: ${ahead.name} — ${ahead.game}.` : "Beyond the ash: nothing with a name.");
      return;
    }
    if (Math.random() < 0.5) {
      const rank = 1 + Math.floor(Math.random() * 10);
      const suit = Math.random() < 0.5 ? "hearts" : "spades";
      setCarried((held) => [...held, { rank, suit }]);
      setNote(`You sift the ash and find the ${rankLabel(rank)}. It goes in your hand.`);
      return;
    }
    setSkipRoll(true);
    setNote("You sift the ash and the ash takes your next roll.");
  }

  function waylayWalk() {
    if (waylay === null) return;
    setWaylay(null);
    setNote("You walk on.");
  }

  useEffect(() => {
    let hadSave = false;
    try {
      const raw = localStorage.getItem("reliquary-v3");
      if (raw) {
        const data = JSON.parse(raw) as Save;
        if (typeof data.position === "number") {
          hadSave = true;
          setMarks(data.marks ?? 0);
          setOwned(Array.isArray(data.owned) ? data.owned : []);
          setMawBeaten(Boolean(data.mawBeaten));
          setHeartsLit(Boolean(data.heartsLit));
          setSpadesLit(Boolean(data.spadesLit));
          setSilver(Boolean(data.silver));
          setQueenFaced(Boolean(data.queenFaced));
          setTaflWon(Boolean(data.taflWon));
          setLetters(Array.isArray(data.letters) ? data.letters : []);
          setWord(typeof data.word === "string" ? data.word : null);
          setBoons(Array.isArray(data.boons) ? data.boons : []);
          setPosition(data.position);
          const held = Array.isArray(data.carried) ? data.carried : [];
          setCarried(held);
          setFallen(data.fallen === true || data.position >= 0 || data.heard === true || held.length > 0);
          setHeard(Boolean(data.heard));
          setSigned(Boolean(data.signed));
          setSat(typeof data.sat === "number" ? data.sat : 0);
          setMet(Boolean(data.met));
          setPocket(Array.isArray(data.pocket) ? data.pocket : []);
          setLight(typeof data.light === "number" ? Math.max(0, Math.min(MAX_LIGHT, data.light)) : 0);
          setBlankSpent(Boolean(data.blankSpent));
          setCupboard(Boolean(data.cupboard));
          setDoor(Boolean(data.door));
          setScratchDone(Boolean(data.scratchDone));
          setStoneOut(Boolean(data.stoneOut));
          setHearthFed(Boolean(data.hearthFed));
          setSkipRoll(Boolean(data.skipRoll));
          setPipOwed(Boolean(data.pipOwed));
          setKingOwed(Boolean(data.kingOwed));
          if (data.position >= 0) {
            setAgeIndex(vistaIndex(data.position));
            setPicked(data.position);
          }
        }
      }
    } catch {
      /* keep a new game */
    }
    // The grave: the last one the Maw ate. It stays until the next death.
    // A grave with no save means you died and came back. He notices.
    try {
      const graw = localStorage.getItem("reliquary-grave");
      if (graw) {
        const g = JSON.parse(graw) as { marks?: unknown; position?: unknown; when?: unknown };
        if (typeof g.marks === "number" && typeof g.position === "number" && typeof g.when === "number") {
          setGrave({ marks: g.marks, position: g.position, when: g.when });
          if (!hadSave) jokerSays(JOKER_RETURNING);
        }
      }
    } catch {
      /* no grave, no grief */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const save: Save = { marks, owned, mawBeaten, heartsLit, spadesLit, silver, queenFaced, taflWon, letters, word, boons, position, carried, fallen: fallen || position >= 0 || heard, heard, signed, sat, met, pocket, light, blankSpent, cupboard, door, skipRoll, pipOwed, kingOwed, scratchDone, stoneOut, hearthFed };
    localStorage.setItem("reliquary-v3", JSON.stringify(save));
  }, [loaded, marks, owned, mawBeaten, heartsLit, spadesLit, silver, queenFaced, taflWon, letters, word, boons, position, carried, fallen, heard, signed, sat, met, pocket, light, blankSpent, cupboard, door, skipRoll, pipOwed, kingOwed, scratchDone, stoneOut, hearthFed]);

  function earn(amount: number) {
    if (marks === 0 && amount > 0 && !owned.includes("chapel")) {
      setNote("The lamp pays. Open the chapel.");
    }
    if (amount > 0) {
      streakRef.current += 1;
      winSting(streakRef.current);
      if (!wonOnceRef.current) { wonOnceRef.current = true; logEvent("first_win"); }
    }
    else if (amount < 0) { streakRef.current = 0; resetSting(); lossSound(); }    if (amount > 0) { streakRef.current += 1; winSting(streakRef.current); }
    else if (amount < 0) {
      streakRef.current = 0; resetSting(); lossSound();
      lossCount.current += 1;
      const n = lossCount.current;
      const broke = marks > 0 && marks + amount <= 0;
      if (n === 1) jokerSays(JOKER_LOSS_FIRST, 1500);
      else if (n % 3 === 0) jokerSays(JOKER_LOSS_AGAIN[(n / 3 - 1) % JOKER_LOSS_AGAIN.length], 1500);
      else if (broke) jokerSays(JOKER_BROKE, 1500);
    }    if (amount > 0) setBurst((b) => b + 1);
    setMarks((value) => Math.max(0, value + amount));
  }

  /** Mark changes that bypass earn's first-mark note (road games). */
  function award(amount: number) {
    if (amount > 0) {
      streakRef.current += 1;
      winSting(streakRef.current);
      if (!wonOnceRef.current) { wonOnceRef.current = true; logEvent("first_win"); }
    }
    else if (amount < 0) { streakRef.current = 0; resetSting(); lossSound(); }    if (amount > 0) { streakRef.current += 1; winSting(streakRef.current); }
    else if (amount < 0) {
      streakRef.current = 0; resetSting(); lossSound();
      lossCount.current += 1;
      const n = lossCount.current;
      const broke = marks > 0 && marks + amount <= 0;
      if (n === 1) jokerSays(JOKER_LOSS_FIRST, 1500);
      else if (n % 3 === 0) jokerSays(JOKER_LOSS_AGAIN[(n / 3 - 1) % JOKER_LOSS_AGAIN.length], 1500);
      else if (broke) jokerSays(JOKER_BROKE, 1500);
    }    if (amount > 0) setBurst((b) => b + 1);
    setMarks((value) => Math.max(0, value + amount));
  }

  function buy(gate: Gate) {
    const upcoming = nextGate(owned, mawBeaten);
    if (!upcoming || upcoming.key !== gate.key || marks < gate.cost) return;
    const firstBuy = owned.length === 0;
    setMarks((value) => value - gate.cost);
    setOwned((value) => [...value, gate.key]);
    gateSound();
    logEvent(`gate_bought:${gate.key}`);
    if (gate.key === "chapel") logEvent("chapel_opened");
    // The chain strains before it breaks — a held beat, not an instant.
    if (riteTimer.current) window.clearTimeout(riteTimer.current);
    setRiteStage("strain");
    setGateCeremony(gate);
    riteTimer.current = window.setTimeout(() => setRiteStage("broken"), 600);
    setNote(`${gate.opens} is open.`);
    if (firstBuy) jokerSays(JOKER_FIRST_BUY, 2000);
  }

  function spendBlank(gate: Gate) {
    const upcoming = nextGate(owned, mawBeaten);
    if (!upcoming || upcoming.key !== gate.key || !pocket.includes("Blank card")) return;
    setPocket((value) => value.filter((item) => item !== "Blank card"));
    setBlankSpent(true);
    setOwned((value) => [...value, gate.key]);
    gateSound();
    setNote(`${gate.opens} took the blank card.`);
  }

  function keep(kind: string) {
    const name =
      kind === "war"
        ? "Torn card"
        : kind === "fish"
          ? "Fishhook"
          : kind === "memory"
            ? "Matched pair"
            : kind === "darts"
              ? "A flight"
              : kind === "four"
                ? "A red disc"
                : kind === "checkers"
                  ? "A red king"
                  : kind === "liars"
                    ? MAW_ITEM
                    : "";
    if (!name) return;
    setPocket((value) => (value.includes(name) ? value : [...value, name]));
    setNote(
      name === MAW_ITEM ? "You kept a poker chip. Something down the road loves these." : `You kept a ${name.toLowerCase()}.`,
    );
  }

  function findBlank() {
    if (blankSpent || pocket.includes("Blank card")) return;
    setPocket((value) => [...value, "Blank card"]);
    setNote("That card has no face.");
  }

  function takeKey() {
    if (seated) {
      setNote("From the chair, the lamp leans its light away. It will not come closer.");
      return;
    }
    if (pocket.includes("Bent key")) {
      setNote("The key is already in your pocket.");
      return;
    }
    setPocket((value) => [...value, "Bent key"]);
    setNote("A bent key was caught under the lamp.");
  }

  function openCupboard() {
    if (!pocket.includes("Bent key")) {
      setNote("The cupboard is shut. The keyhole is small.");
      return;
    }
    setCupboard(true);
    setNote("The cupboard opens. Inside, scratched in the wood: 4, 1, 8.");
  }

  function enterDigit(digit: string) {
    const next = (code + digit).slice(0, 3);
    if (next === "418") {
      setDoor(true);
      setPad(false);
      setCode("");
      setView("cell");
      setNote("The door opens.");
      return;
    }
    if (next.length === 3) {
      setCode("");
      setNote("The lock does not turn.");
      return;
    }
    setCode(next);
  }

  function takeCup() {
    if (pocket.includes("Cracked cup")) {
      setNote("The shelf is empty. You already took the cup.");
      return;
    }
    setPocket((value) => [...value, "Cracked cup"]);
    setNote("A cracked cup. Hold it up to the far wall.");
  }

  function farWall() {
    if (pocket.includes("Cracked cup")) {
      setView("glass");
      setNote("The cup catches the light. The wall gives way to glass.");
      return;
    }
    setView("burn");
    setNote("The far wall is on fire. You have nothing that can look through it.");
  }

  // --- The rooms are alive: examinations that change with your progress. ---

  function examineDeck() {
    if (seated) {
      setNote("From the Dealer's seat, the backs of the cards are blank. Every one. You do not turn any over.");
      return;
    }
    if (queenFaced) {
      setNote("Your deck. Every card is accounted for — except one. There is a blank card that was not there before.");
    } else if (owned.length >= 3) {
      setNote("Your deck, worn soft at the edges. It has carried you this far. It will carry you further.");
    } else {
      setNote("A deck of cards on the table. Yours. The backs are black and gold. You do not remember picking it up.");
    }
  }

  function examineChair() {
    if (queenFaced) {
      setNote("The Dealer's chair. It is empty. It will not always be.");
    } else if (ended) {
      setNote("Your chair.");
    } else {
      setNote("A tall chair at the head of the table. No one sits in it. No one has ever sat in it. The wood is warm.");
    }
  }

  /** The Dealer's chair can be sat in. From that seat, the room reads wrong. */
  function chairAct() {
    if (seated) {
      setSeated(false);
      setNote("You stand. The room is the room again.");
      return;
    }
    if (!chairKnown) {
      setChairKnown(true);
      examineChair();
      return;
    }
    setSeated(true);
    setNote("You sit in the Dealer's chair. The wood is warm. It knows the shape of you.");
  }

  function examineWindow() {
    if (position >= 0) {
      setNote("The window shows the road you are standing on. From inside, it looked further away.");
    } else if (owned.includes("chapel")) {
      setNote("Rain on the glass. The road is out there, waiting. You can see your own footprints — but you have not left yet.");
    } else {
      setNote("A window, black with rain. Nothing beyond it. Not yet.");
    }
  }

  /** The torn two of spades: one half under the floorboards, the other in the ash.
   *  Either half taken alone is "Torn half"; holding one and taking the other
   *  mends it — and the rejoined card carries something across the tear. */
  function mendHalves(fromNote: string) {
    setPocket((value) => [...value.filter((item) => item !== "Torn half"), "Mended two"]);
    setNote(fromNote);
  }

  function floorHalf() {
    if (pocket.includes("Mended two")) {
      setNote("The loose board. Dust, and a bent nail.");
      return;
    }
    if (pocket.includes("Torn half")) {
      mendHalves("You fit the halves together. The tear closes like a wound. Across it, in ink that was not there before: he deals last.");
      return;
    }
    setPocket((value) => [...value, "Torn half"]);
    setNote("A loose board under the table. Beneath it: dust, a bent nail, and half a playing card — the two of spades, torn down the middle. You take the torn half.");
  }

  function ashHalf() {
    if (pocket.includes("Mended two")) {
      setNote("Only ash.");
      return;
    }
    if (pocket.includes("Torn half")) {
      mendHalves("You fit the halves together. The tear closes like a wound. Across it, in ink that was not there before: he deals last.");
      return;
    }
    setPocket((value) => [...value, "Torn half"]);
    setNote("In the ash at the fire's edge, half a playing card. The two of spades, singed black at the edges. The fire would not take it. You take the singed half.");
  }

  function rattleChains() {
    if (scratchDone) {
      setNote("The chains are still now. They are listening.");
      return;
    }
    setNote("Chains bolted to the cell wall. They are empty. They were not always empty — the links are worn smooth where wrists were.");
  }

  const [scratchCount, setScratchCount] = useState(0);
  function readScratches() {
    if (scratchDone) {
      setNote("Forty-two. You do not count again.");
      return;
    }
    const next = scratchCount + 1;
    setScratchCount(next);
    if (next === 1) setNote("Scratch marks on the cell wall. Someone was counting days. Or hands. Or heartbeats.");
    else if (next === 2) setNote("You count the marks. Forty-one. They stop mid-stroke, as if the hand was taken away.");
    else if (next === 3) setNote("Forty-one and a half. You stop counting. Some things should not be finished.");
    else {
      // The irreversible beat: no warning, no fanfare. The world notices.
      setScratchDone(true);
      setNote("Your nail finds the groove and finishes the stroke before you tell it to. Forty-two. In the corner, the chains shift their weight.");
    }
  }

  /** A loose stone, low in the cell wall. Worked free, it gives up a hollow. */
  function workStone() {
    if (pocket.includes("Folded scrap")) {
      setNote("The hollow behind the stone is empty.");
      return;
    }
    if (!stoneOut) {
      setStoneOut(true);
      setNote("You work the loose stone free. Behind it, a hollow — and in the hollow, a folded scrap of paper.");
      return;
    }
    setPocket((value) => [...value, "Folded scrap"]);
    setNote("The scrap, unfolded: 'don't let him deal' — the hand is hurried, the ink is old.");
  }

  function peerGlass() {
    if (queenFaced) {
      setNote("Through the glass: the Queen's hall. She is sitting upright now. She is looking back.");
    } else if (taflWon) {
      setNote("Through the glass: the Queen's hall. She is sitting upright now. She is looking back. She remembers the glass.");
    } else {
      setNote("Through the glass: a vast hall, and a throne. Something sits on it, faceless. It does not move. Yet.");
    }
  }

  function feedFire() {
    if (light < 1) {
      setNote("The fire is hungry, but your candle is out. Kindle at the chapel first.");
      return;
    }
    const gate = nextGate(owned, mawBeaten);
    setLight((value) => spendLight(value, 1));
    feedCount.current += 1;
    if (feedCount.current === 3) { jokerSays(JOKER_FEED3); return; }
    if (!gate) {
      setNote("You feed the fire a wax. The flames lean toward the reliquary. It is waiting.");
    } else if (gate.key === "chapel") {
      setNote("You feed the fire a wax. In the flames: a chapel door, and a chain. One poker chip breaks it.");
    } else if (gate.key === "maw" || (position >= 26 && !mawBeaten)) {
      setNote("You feed the fire a wax. In the flames: teeth. Cards. Bone. It does not want poker chips.");
    } else {
      const name = gate.opens.charAt(0).toLowerCase() + gate.opens.slice(1);
      setNote(`You feed the fire a wax. In the flames: ${name}, and a chain. ${gate.cost} poker chips break it.`);
    }
  }

  /** Myst slice 2: the chapel. Mabel's kept dice, her hearth, her altar. */

  function examineChapelDice() {
    if (mawBeaten) {
      setNote("Five bone dice. The sixes are worn soft — someone favored them. She is gone, and the dice are still warm.");
    } else if (queenFaced) {
      setNote("Five bone dice, kept by the fire. You have seen what the house does with dice. These were thrown by kinder hands.");
    } else if (heartsLit) {
      setNote("Five bone dice on the cloth. Warm, as if thrown recently. Someone was just here.");
    } else {
      setNote("Five bone dice, kept by the hearth fire. The pips are worn soft on the sixes. Someone favored them.");
    }
  }

  function feedHearth() {
    if (light < 1) {
      setNote("The hearth is hungry, but your candle is out. Kindle first.");
      return;
    }
    setLight((value) => spendLight(value, 1));
    if (!hearthFed) {
      setHearthFed(true);
      setNote("You feed the hearth a wax. The flames rise — and in them: five dice, mid-throw, and a woman's hands. Then only fire.");
      return;
    }
    setNote("You feed the hearth another wax. The flames lean toward the altar, listening.");
  }

  function examinePrayerBook() {
    if (mawBeaten) {
      setNote("The prayer book lies open where it lay. The tallies in the margins have not grown. Nothing here counts anymore.");
    } else {
      setNote("A worn book on a fallen pew, open, a page corner turned down. The margins are full of tallies — someone was counting here too.");
    }
  }

  function examinePews() {
    setNote("The pews lie in broken rows. The dust is disturbed along one of them, and the stone is still warm where someone knelt.");
  }

  function offerBowl() {
    if (marks < 1) {
      setNote("The offering bowl is empty. So is your purse.");
      return;
    }
    setMarks((value) => value - 1);
    bowlCount.current += 1;
    if (bowlCount.current === 1) {
      setNote(
        hearthFed
          ? "You lay a poker chip in the bowl. The chip blackens. In the soot: five pips, staring up."
          : "You lay a poker chip in the bowl. The fire leans toward it. Nothing gives it back."
      );
      return;
    }
    setNote("Another chip in the bowl. The chapel keeps what it is given.");
  }

  function behindAltar() {
    setNote("Behind the altar, a niche in the stone. It is empty — and exactly the size of five dice. They are not in it. Someone took them out. Someone was playing.");
  }

  function riverTakes() {
    const lost = carried[0];
    if (!lost) {
      setNote("The river reaches for a card and there is nothing left to give.");
      return;
    }
    setCarried(carried.slice(1));
    setNote(`The river takes the ${rankLabel(lost.rank)} you were carrying.`);
  }

  function riverCleared() {
    if (!boons.includes("heart")) setBoons((value) => [...value, "heart"]);
    setNote("You reach the far side. The Heart boon is yours. At the reliquary you will draw one, not three.");
  }

  function bidMade(made: boolean) {
    if (!made) {
      setNote("You did not make the bid. The river pays nothing and the span stays where it is.");
      return;
    }
    if (spadesLit) {
      setNote("You made it again. The bridge stays down.");
      return;
    }
    setSpadesLit(true);
    setNote("The span settles. The water goes silver, and it stays silver.");
  }

  function face(won: boolean) {
    if (won) {
      setMawBeaten(true);
      setNote("The ante is accepted. The cards fall. The Maw was a royal guard — once, it had a name. It is free now. Remember it.");
    } else {
      streakRef.current = 0; resetSting(); lossSound();
      setMarks((value) => Math.max(0, value - 1));
      setNote("It does not move. It takes a poker chip.");
    }
  }

  function borderEnd(result: BorderResult) {
    award(borderPay(result));
    if (borderSpreadsSilver(spadesLit, result)) {
      setSilver(true);
      setNote("You took the border. The silver runs past the bank and does not stop.");
      return;
    }
    if (result === "win") {
      setNote("You took the border, and a poker chip for it. The water is not silver yet.");
      return;
    }
    if (result === "lose") {
      const next = borderAfter(position, result);
      setPosition(next);
      setPicked(next);
      setAgeIndex(vistaIndex(next));
      setNote("The border pushes you back.");
      return;
    }
    setNote("A tie. Nobody moves.");
  }

  const mode: Mode | null =
    age.key === "hall"
      ? "lamp"
      : position >= 10 && position < 14 && owned.includes("chapel") && age.key === "chapel"
        ? "cut"
        : position >= 14 && position < 20 && owned.includes("bridge") && age.key === "bridge"
          ? "bid"
          : position >= 27 && position < 28 && age.key === "maw"
            ? "maw"
            : null;
  const rows = Math.ceil(SQUARES.length / COLS);
  const width = ORIGIN_X * 2 + (COLS - 1) * GAP_X;

  // Telemetry: milestone faces. Write-only; never feeds back into rules.
  useEffect(() => {
    if (playing === "queen") logEvent("queen_faced");
    if (playing === "finale") logEvent("run_ended");
    if (mode === "maw") logEvent("maw_faced");
  }, [playing, mode]);

  /** Triple-click the objective banner: dev-only telemetry readout. */
  function onBannerClick() {
    const now = Date.now();
    bannerClicks.current = [...bannerClicks.current.filter((t) => now - t < 600), now];
    if (bannerClicks.current.length >= 3) {
      bannerClicks.current = [];
      setTelemetryEvents(getEvents());
      setTelemetryOpen((v) => !v);
    }
  }

  /** The one visually dominant next action. Pending choices take the dock;
   *  otherwise the single action that moves the game forward. */
  const primary: { label: string; onClick: () => void } | null = (() => {
    if (waylay !== null || kingOwed || pipOwed) return null;
    // Location games that ARE the story beat keep priority.
    if (mode && mode !== "lamp" && (position >= 0 || heard)) {
      return {
        label: mode === "maw" ? "Play it" : mode === "bid" ? "The bid" : "The cut",
        onClick: () => setTable(true),
      };
    }
    // The affordable gate is always the next beat — never bury it under "Play a hand".
    const gate = nextGate(owned, mawBeaten);
    if (gate && marks >= gate.cost) {
      return {
        label:
          gate.key === "chapel"
            ? "Open the chapel"
            : `Open ${gate.opens.charAt(0).toLowerCase() + gate.opens.slice(1)}`,
        onClick: () => buy(gate),
      };
    }
    // Chapel open: the road is the move. Never before the chapel — a fresh
    // player with no marks needs the lamp, not the road.
    if (heard && owned.includes("chapel") && (position < 0 || age.key === "hall")) {
      return {
        label: "Take the road",
        onClick: () => (position < 0 ? fall() : look(vistaIndex(position))),
      };
    }
    // Outside: roll.
    if (position >= 0 && age.key !== "hall") {
      return { label: "Roll", onClick: roll };
    }
    // The lamp only when marks are the need — never over a gate or the road.
    if (mode === "lamp" && sat < 3 && heard) {
      return { label: "Play a hand", onClick: () => setTable(true) };
    }
    if (position < 0 && !owned.includes("chapel") && marks < 1) {
      return { label: "Play a hand", onClick: () => setTable(true) };
    }
    return null;
  })();  const height = ORIGIN_Y + (rows - 1) * GAP_Y + 78;
  const d = SQUARES.map((s) => {
    const p = xy(s.id);
    return `${s.id === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }).join(" ");
  const stairA = xy(4);
  const stairB = xy(9);
  const ledgeA = xy(18);
  const ledgeB = xy(22);

  const picture =
    age.key === "hall" && view === "room"
      ? "/room.jpg"
      : age.key === "hall" && view === "cell"
        ? "/cell.jpg"
        : age.key === "hall" && view === "glass"
          ? "/glass.jpg"
          : age.key === "hall" && view === "burn"
            ? "/burn.jpg"
            : // Myst slice 2: the chapel's inner views.
              age.key === "chapel" && chapelView === "pews"
              ? "/chapel.jpg"
              : age.key === "chapel" && chapelView === "altar"
                ? "/plates/chapel-altar.jpg"
                : // The climb past the yard to the Maw: mist over the hill road.
                  age.key === "yard" && position >= 21 && position < 27
                  ? "/plates/hill-road.jpg"
                  : age.src;

  const warm = heartsLit && age.key === "chapel";
  const cool = spadesLit && age.key === "bridge";
  const litClass = warm ? " warm" : cool ? (silver ? " cool silver" : " cool") : queenFaced ? " faced" : "";
  const darkWood = isWood(position) && isDark(light);
  const guttered = signed && isDark(light);

  return (
    <section className={`scene${litClass}${guttered ? " guttered" : ""}${seated ? " seated" : ""}`} aria-label={age.name}>
      <button
        type="button"
        className="pause-btn"
        onClick={() => { setConfirmWipe(false); setPaused(true); }}
        aria-label="Pause"
      >
        <span aria-hidden="true">&#10074;&#10074;</span>
      </button>
      <img key={picture} className="scene-img" src={picture} alt={age.alt} />
      <div className="scene-vignette" />
      <div className="scene-fog" aria-hidden="true" />
      {guttered && (
        <div className="gutter-eyes" aria-hidden="true">
          &#9679;&#8195;&#9679;
        </div>
      )}
      <div className="dust" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="grain" aria-hidden="true" />
      {burst > 0 && (
        <div key={burst} className="poker chip-burst" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      {signed && met && age.key === "hall" && view === "table" && (
        <button type="button" className="hot hot-lamp" onClick={takeKey} aria-label="The lamp" />
      )}
      {signed && met && age.key === "hall" && view === "table" && (
        <>
          <button type="button" className="hot hot-deck" onClick={examineDeck} aria-label="The deck" />
          <button type="button" className="hot hot-chair" onClick={chairAct} aria-label={seated ? "Stand up" : "The chair"} />
        </>
      )}
      {jokerVisit && (
        <button
          type="button"
          className="joker-visit"
          style={{ left: `${jokerVisit.x}%`, top: `${jokerVisit.y}%` }}
          aria-label="Something in the corner"
          onClick={() => {
            setNote(jokerTaunt(owned, mawBeaten, queenFaced));
            setJokerVisit(null);
          }}
        >
          <img className="joker-visit-img" src="/plates/joker.jpg" alt="" aria-hidden="true" />
        </button>
      )}
      {signed && met && age.key === "hall" && view === "room" && (
        <>
          <button type="button" className="hot hot-cupboard" onClick={openCupboard} aria-label="The cupboard" />
          <button
            type="button"
            className="hot hot-door"
            onClick={() => (door ? setView("cell") : setPad(true))}
            aria-label="The door"
          />
          <button type="button" className="hot hot-window" onClick={examineWindow} aria-label="The window" />
          <button type="button" className="hot hot-floor" onClick={floorHalf} aria-label="The floorboards" />
        </>
      )}
      {signed && met && age.key === "hall" && view === "cell" && (
        <>
          <button type="button" className="hot hot-shelf" onClick={takeCup} aria-label="The shelf" />
          <button type="button" className="hot hot-wall" onClick={farWall} aria-label="The far wall" />
          <button type="button" className="hot hot-chains" onClick={rattleChains} aria-label="The chains" />
          <button type="button" className="hot hot-scratches" onClick={readScratches} aria-label="Scratch marks" />
          <button type="button" className="hot hot-stone" onClick={workStone} aria-label="A loose stone" />
        </>
      )}
      {signed && met && age.key === "hall" && view === "glass" && (
        <button type="button" className="hot hot-glass" onClick={peerGlass} aria-label="Peer through the glass" />
      )}
      {signed && met && age.key === "hall" && view === "burn" && (
        <>
          <button type="button" className="hot hot-fire" onClick={feedFire} aria-label="Feed the fire" />
          <button type="button" className="hot hot-ash" onClick={ashHalf} aria-label="Ash at the fire's edge" />
        </>
      )}
      {signed && met && age.key === "chapel" && chapelView === "hearth" && (
        <>
          <button type="button" className="hot hot-chdice" onClick={examineChapelDice} aria-label="Five bone dice" />
          <button type="button" className="hot hot-chfire" onClick={feedHearth} aria-label="The hearth fire" />
        </>
      )}
      {signed && met && age.key === "chapel" && chapelView === "pews" && (
        <>
          <button type="button" className="hot hot-chbook" onClick={examinePrayerBook} aria-label="A worn book" />
          <button type="button" className="hot hot-chpews" onClick={examinePews} aria-label="The pews" />
        </>
      )}
      {signed && met && age.key === "chapel" && chapelView === "altar" && (
        <>
          <button type="button" className="hot hot-chbowl" onClick={offerBowl} aria-label="The offering bowl" />
          <button type="button" className="hot hot-chniche" onClick={behindAltar} aria-label="Behind the altar" />
        </>
      )}
      {grave && age.key === "hole" && (
        <button
          type="button"
          className="hot hot-grave"
          aria-label="A grave"
          onClick={() =>
            setNote(
              `A grave. ${grave.marks} ${grave.marks === 1 ? "poker chip" : "poker chips"}. It got this far. The dirt is fresh.`
            )
          }
        />
      )}
      {pad && (
        <div className="pad">
          <p>{code.padEnd(3, "·")}</p>
          <div>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
              <button key={digit} type="button" onClick={() => enterDigit(digit)}>
                {digit}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setPad(false); setCode(""); }}>
            Close
          </button>
        </div>
      )}

      <div className="scene-caption">
        {signed ? (
          <>
            <strong>
              {darkWood
                ? "Dark."
                : view === "room"
                  ? "The room"
                : view === "cell"
                  ? "The cell"
                  : view === "glass"
                    ? "The glass"
                    : view === "burn"
                      ? "The burning wall"
                      : age.key === "hall"
                        ? "The Hall"
                        : standing && standing.short
                          ? standing.name
                          : age.name}
            </strong>
            <span>{where(shownMarks, owned, mawBeaten, position, sat)}</span>
            {darkWood && <em>Dark. You can't see the square. The chapel hearth kindles candles.</em>}
            {(heartsLit || spadesLit || queenFaced) && <em className="lit">{lightCopy(position)}</em>}
            {note && <em>{note}</em>}
            {whisper && (
              <em key={whisper} className="whisper">
                {whisper}
              </em>
            )}
          </>
        ) : (
          <strong>The Hall</strong>
        )}
      </div>

      {signed && (
      <div className="dock">
        {(() => {
          const goal = objective(signed, marks, owned, mawBeaten, position, sat);
          return goal ? <p className="objective" onClick={onBannerClick}>◎ {goal}</p> : null;
        })()}
        {telemetryOpen && (
          <div className="telemetry-overlay" role="dialog" aria-label="Progress telemetry">
            <div className="telemetry-head">
              <span>telemetry — {telemetryEvents.length} events</span>
              <button type="button" className="telemetry-btn" onClick={() => { clearTelemetry(); setTelemetryEvents([]); }}>clear</button>
              <button type="button" className="telemetry-btn" onClick={() => setTelemetryOpen(false)}>close</button>
            </div>
            <ul className="telemetry-list">
              {telemetryEvents.map((e, i) => (
                <li key={i}><code>{e.name}</code> <span>{new Date(e.at).toLocaleTimeString()}</span></li>
              ))}
            </ul>
          </div>
        )}
        {(waylay !== null || kingOwed || pipOwed || primary) && (
          <div className="dock-primary">
            {waylay !== null && (
              <>
                <button className="book-btn primary" type="button" onClick={waylayTake}>
                  {WAYLAY[waylay] === "sift" ? "Sift the ash" : "Look ahead"}
                </button>
                <button className="book-btn primary" type="button" onClick={waylayWalk}>
                  Walk on
                </button>
              </>
            )}
            {kingOwed && (
              <>
                <button className="book-btn primary" type="button" onClick={payKingCard}>
                  Give the king a card
                </button>
                <button className="book-btn primary" type="button" onClick={payKingRoll}>
                  Give the king your next roll
                </button>
              </>
            )}
            {pipOwed && (
              <button className="book-btn primary" type="button" onClick={cutPip}>
                Cut for Pip
              </button>
            )}
            {primary && waylay === null && !kingOwed && !pipOwed && (
              <button
                className={`book-btn primary${primary.label === "Play a hand" && marks === 0 ? " beckon" : ""}`}
                type="button"
                onClick={primary.onClick}
              >
                {primary.label}
              </button>
            )}
          </div>
        )}
        <div className="dock-rest">
        {/* The hall's rooms are open from the start — never gated behind the chapel. */}
        {age.key === "hall" && view === "table" && (
          <button className="book-btn" type="button" onClick={() => setView("room")}>
            Look around
          </button>
        )}
        {age.key === "hall" && view !== "table" && (
          <button className="book-btn" type="button" onClick={() => {
            setPad(false);
            setView(view === "glass" || view === "burn" ? "cell" : view === "cell" ? "room" : "table");
          }}>
            {view === "cell" ? "Back to the room" : view === "glass" || view === "burn" ? "Back to the cell" : "Back to the table"}
          </button>
        )}
        {signed && met && age.key === "hall" && view === "glass" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("tafl")}>
            Play her
          </button>
        )}
        {!(position < 0 && !owned.includes("chapel")) && (
          <>
        {age.key === "chapel" && position >= 10 && (
          <button className="book-btn" type="button" onClick={() => setPlaying("yacht")}>
            Yacht
          </button>
        )}
        {age.key === "bridge" && position >= 16 && (
          <button className="book-btn" type="button" onClick={() => setPlaying("border")}>
            Three dice
          </button>
        )}
        {position === 12 && !shouting && (
          <button className="book-btn" type="button" onClick={() => setShouting(true)}>
            The shout
          </button>
        )}
        {position === WELL_SQUARE && roadOpen("mire", owned, mawBeaten) && playing !== "well" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("well")}>
            The well
          </button>
        )}
        {(position === 19 || position === 21) && playing !== "tile" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("tile")}>
            A letter tile
          </button>
        )}
        {position === YARD_SQUARE && playing !== "yard" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("yard")}>
            The yard
          </button>
        )}
        {position === NIX_SQUARE && playing !== "nix" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("nix")}>
            Nix
          </button>
        )}
        {position === 25 && playing !== "scaffold" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("scaffold")}>
            The scaffold
          </button>
        )}
        {position === 28 && roadOpen("queen", owned, mawBeaten) && !queenFaced && playing !== "queen" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("queen")}>
            Her coat
          </button>
        )}
        {position === 29 && queenFaced && playing !== "finale" && (
          <button className="book-btn" type="button" onClick={() => setPlaying("finale")}>
            The last chair
          </button>
        )}
        {age.key === "chapel" && heartsLit && light < MAX_LIGHT && (
          <button
            className="book-btn"
            type="button"
            onClick={() => {
              setLight(kindle());
              setNote("This wax was his. His game is over. Take his flame and remember: you cannot escape the Table. You only burn. Burn brightly.");
            }}
          >
            Kindle the candle
          </button>
        )}
        {position === 29 && !queenFaced && (
          <p className="leaf-body">The chair is empty. Her face is still out there, somewhere behind you.</p>
        )}
        {mode === "bid" && (
          <button className="book-btn" type="button" onClick={() => setEuchreOpen(true)}>
            Euchre
          </button>
        )}
        {age.key !== "hall" && (
          <button className="book-btn" type="button" onClick={() => look(0)}>
            Back to the hall
          </button>
        )}
        {age.key === "chapel" && chapelView === "hearth" && (
          <>
            <button className="book-btn" type="button" onClick={() => setChapelView("pews")}>
              The pews
            </button>
            <button className="book-btn" type="button" onClick={() => setChapelView("altar")}>
              The altar
            </button>
          </>
        )}
        {age.key === "chapel" && chapelView !== "hearth" && (
          <button className="book-btn" type="button" onClick={() => setChapelView("hearth")}>
            Back to the hearth
          </button>
        )}
          <>
            <button className="book-btn" type="button" onClick={() => setDeckOpen(true)}>
              Deck
            </button>
            <button className="book-btn" type="button" onClick={() => setOpen(true)}>
              Map
            </button>
          </>
          </>
        )}
        </div>
      </div>
      )}

      {!met && <JokerMeet short={returning} onLeave={() => setMet(true)} />}

      {met && !signed && (
        <Paper
          onSign={() => {
            setSigned(true);
            setHeard(true);
            logEvent("signed");
          }}
        />
      )}

      {deckOpen && (
        <div className="journal-back" onClick={() => setDeckOpen(false)}>
          <div className="deck-sheet" role="dialog" aria-label="The deck" onClick={(event) => event.stopPropagation()}>
            <p className="leaf-kicker">In your hand</p>
            <h2>The deck</h2>
            {linesFor(marks, owned, mawBeaten, position, pocket, blankSpent, cupboard, hearthFed).map((line) => (
              <p key={line} className="leaf-body">
                {line}
              </p>
            ))}
            {pocket.length > 0 && <p className="leaf-relic">Pocket: {pocket.join(", ")}</p>}
            {light > 0 && (
              <p className="leaf-relic">
                Candle: {"●".repeat(light)}
                {"○".repeat(MAX_LIGHT - light)}
              </p>
            )}
            {isDark(light) && <p className="leaf-relic">Candle: out.</p>}
            {boons.length > 0 && <p className="leaf-relic">Carried forward: {boons.join(", ")}</p>}
            <div className="carried">
              {carried.map((card) => (
                <span key={`${card.suit}${card.rank}`} className={isRed(card.suit as Suit) ? "win-face red" : "win-face"}>
                  <b>
                    {rankLabel(card.rank)}
                    {suitMark(card.suit as Suit)}
                  </b>
                  <i>{suitMark(card.suit as Suit)}</i>
                </span>
              ))}
              {!blankSpent && (
                <button
                  type="button"
                  className="card-btn"
                  onClick={findBlank}
                  aria-label={pocket.includes("Blank card") ? "Blank card" : "A face-down card"}
                >
                  <span className={pocket.includes("Blank card") ? "win-face" : "card back"}>
                    {pocket.includes("Blank card") && <b>?</b>}
                  </span>
                </button>
              )}
            </div>
            <button className="close-book" type="button" onClick={() => setDeckOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="journal-back" onClick={() => setOpen(false)}>
          <div
            className="journal"
            role="dialog"
            aria-label="The map"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="page-leaf map-leaf">
              <p className="leaf-kicker">Your map</p>
              <p className="table-rule">Click a square, then step in.</p>
              <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="The road of games">
                <path d={d} className="map-roadbed" fill="none" stroke="#8d6b45" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                <path d={d} className="map-thread" fill="none" stroke="#5c2a26" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <path
                  d={`M ${stairA.x} ${stairA.y} Q ${(stairA.x + stairB.x) / 2} ${Math.min(stairA.y, stairB.y) - 48} ${stairB.x} ${stairB.y}`}
                  fill="none"
                  stroke="#6b3a32"
                  strokeDasharray="5 5"
                />
                <path
                  d={`M ${ledgeA.x} ${ledgeA.y} Q ${(ledgeA.x + ledgeB.x) / 2 + 36} ${(ledgeA.y + ledgeB.y) / 2} ${ledgeB.x} ${ledgeB.y}`}
                  fill="none"
                  stroke="#6b3a32"
                  strokeDasharray="5 5"
                />
                {SQUARES.map((s) => {
                  const p = xy(s.id);
                  const r = s.labeled ? 16 : 4;
                  const reached = here >= s.id;
                  const active = picked === s.id;
                  return (
                    <g key={s.id} className={`sq map-sq map-kind-${s.kind}${reached ? " map-reached" : ""}${active ? " map-active" : ""}`} onClick={() => setPicked(s.id)}>
                      <circle cx={p.x} cy={p.y} r="22" fill="transparent" />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill={reached && s.labeled ? "#6b3a32" : "#efe2c8"}
                        stroke={active ? "#2c241c" : "#6b5340"}
                        strokeWidth={active ? 2.4 : 1}
                      />
                      {s.labeled && (
                        <text
                          x={p.x}
                          y={p.y + r + 14}
                          textAnchor="middle"
                          className="map-name"
                        >
                          {s.short}
                        </text>
                      )}
                    </g>
                  );
                })}
                {here >= 0 && (
                  <rect
                    className="map-you"
                    x={xy(here).x - 6}
                    y={xy(here).y - 28}
                    width="12"
                    height="18"
                    rx="1"
                    fill="#f7f1e4"
                    stroke="#6b3a32"
                    pointerEvents="none"
                  />
                )}
              </svg>
            </div>
            <div className="page-leaf leaf-right">
              <p className="leaf-kicker">{square ? square.kind : "A square"}</p>
              <h2>{square?.name}</h2>
              {square?.game && <p className="leaf-game">{square.game}</p>}
              {square?.relic && <p className="leaf-relic">{square.relic}</p>}
              <p className="leaf-body">{square?.blurb}</p>
              {vista !== null && roadOpen(AGES[vista]?.key ?? "", owned, mawBeaten) && (
                <button
                  className="close-book go"
                  type="button"
                  onClick={() => {
                    if (vista !== null) look(vista);
                    setOpen(false);
                  }}
                >
                  Step into it
                </button>
              )}
              {vista !== null && !roadOpen(AGES[vista]?.key ?? "", owned, mawBeaten) && (
                <p className="leaf-body">This stretch is still shut. Sit at the hall and buy the way.</p>
              )}
              <button className="close-book" type="button" onClick={() => setOpen(false)}>
                Close the map
              </button>
            </div>
          </div>
        </div>
      )}

      {playing === "yacht" && (
        <Yacht onEarn={award} onWin={(won) => won && setHeartsLit(true)} onClose={() => setPlaying(null)} />
      )}
      {playing === "border" && <Border onResult={borderEnd} onClose={() => setPlaying(null)} />}

      {playing === "scaffold" && (
        <Scaffold
          onStand={() => {
            if (!boons.includes("column")) {
              setBoons((prev) => [...prev, "column"]);
              setNote("The house stands. You are carrying a column.");
            } else {
              setNote("The house stands again.");
            }
          }}
          onFall={() => {
            setLight((value) => spendLight(value, 1));
            setNote("The house of cards fell. The collapse gutters your candle.");
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {shouting && <Shout onLose={riverTakes} onClear={riverCleared} onClose={() => setShouting(false)} />}

      {playing === "well" && (
        <Well
          onClear={() => {
            setPocket((list) => (list.includes("black-ace") ? list : [...list, "black-ace"]));
            setNote("You caught the last ledge. You carry the Black Ace.");
          }}
          onFail={() => setNote("You went down the well. Nothing comes back up.")}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "tile" && (
        <Tiles
          letters={letters}
          onAddLetter={(letter) => {
            setLetters(addTile(letters));
            setNote(`A tile in the mud: ${letter}.`);
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "yard" && (
        <Yard
          letters={letters}
          word={word}
          onSetWord={(made) => {
            setLetters((left) => left.slice(0, Math.max(0, left.length - 3)));
            setWord(made);
            setNote(`You set the word ${made} in the mud.`);
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "nix" && (
        <Nix
          pocket={pocket}
          word={word}
          onPass={(route) => {
            const spent = nixSpend(pocket, word);
            setPocket(spent.pocket);
            setWord(spent.word);
            setNote(route === "ace" ? "The Black Ace goes into the mire. It drops. You pass Nix." : `You say the word ${word}. It drops. You pass Nix.`);
          }}
          onLamp={() => {
            setPlaying("nixlamp");
            setNote("Nix opens the lamp. Loose cards creep in at the edge of the light.");
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "nixlamp" && (
        <NixLamp
          onPass={() => {
            setPlaying(null);
            setNote("Two duels. Nix drops into the mire. You pass.");
          }}
          onFleece={() => {
            setPlaying(null);
            setMarks((value) => Math.max(0, value - 2));
            streakRef.current = 0; resetSting(); lossSound();
            setNote("Two duels. Nix takes two poker chips and stays in the road.");
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "tafl" && (
        <Tafl
          onEarn={(n) => {
            award(n);
            if (n > 0) setTaflWon(true);
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "queen" && (
        <Queen
          glassWon={taflWon}
          onWon={() => {
            setQueenFaced(true);
            setNote("Four rounds. The Queen has a face. The houses burn — and something in the dark is waiting for its Dealer.");
          }}
          onLost={() => setNote("Nothing left to answer. Her face is still gone, and you stay on the square.")}
          onFirstRound={() => jokerSays(JOKER_QUEEN_ROUND)}
          onClose={() => setPlaying(null)}
        />
      )}

      {playing === "finale" && (
        <Finale
          boons={boons}
          onClose={() => setPlaying(null)}
          onWin={() => {
            setPlaying(null);
            setEnded(true);
          }}
        />
      )}

      {euchreOpen && (
        <Euchre onEarn={award} onClose={() => setEuchreOpen(false)} />
      )}

      {table && (
        <Table
          mode={mode ?? "lamp"}
          marks={marks}
          displayMarks={shownMarks}
          owned={owned}
          mawBeaten={mawBeaten}
          pocket={pocket}
          light={light}
          onEarn={earn}
          onBuy={buy}
          onSpendBlank={spendBlank}
          hasBlank={pocket.includes("Blank card")}
          onKeep={keep}
          onMaw={face}
          onBid={bidMade}
          onSat={() => setSat((value) => Math.min(3, value + 1))}
          onOfferTribute={() => setPocket((value) => value.filter((item) => item !== MAW_ITEM))}
          onBurn={(n) => setLight((value) => spendLight(value, n))}
          onForfeit={() => {
            setTable(false);
            setNote("The candle gutters. It loses interest. Kindle at the chapel, win another chip, and come back.");
          }}
          onDeath={() => {
            setTable(false);
            setDead(true);
          }}
          onClose={() => setTable(false)}
        />
      )}
      {dead && <Death marks={marks} position={position} />}
      {ended && <Ending onReturn={() => onReturn?.(marks, boons)} />}
      {gateCeremony && (
        <div
          className="journal-back"
          onClick={() => {
            if (riteStage === "broken") setGateCeremony(null);
          }}
        >
          <div className="gate-rite" role="dialog" aria-label="A chain breaks" onClick={(event) => event.stopPropagation()}>
            {riteStage === "strain" ? (
              <>
                <p className="leaf-kicker">The chain strains</p>
                <p className="gate-strain-name chain-strain">{gateCeremony.opens}</p>
              </>
            ) : (
              <>
                <p className="leaf-kicker">A chain breaks</p>
                <p className="gate-rite-line rite-in">{GATE_RITE[gateCeremony.key] ?? "The chain breaks."}</p>
                <button type="button" className="close-book go" onClick={() => setGateCeremony(null)}>
                  Step through
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {paused && (
        <div className="pause-back" role="dialog" aria-label="Paused">
          <div className="pause-menu">
            <p className="leaf-kicker">Held breath</p>
            {!confirmWipe ? (
              <>
                <button type="button" className="close-book go" onClick={() => setPaused(false)}>
                  Resume
                </button>
                <button type="button" className="close-book" onClick={() => setConfirmWipe(true)}>
                  Start over
                </button>
              </>
            ) : (
              <>
                <p className="pause-warn">This wipes your run. The grave remembers.</p>
                <div className="table-row">
                  <button type="button" className="close-book go" onClick={startOver}>
                    Yes, start over
                  </button>
                  <button type="button" className="close-book" onClick={() => setConfirmWipe(false)}>
                    No
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function JokerMeet({ short, onLeave }: { short?: boolean; onLeave: () => void }) {
  const lines = short ? JOKER_SHORT : JOKER;
  const [line, setLine] = useState(0);
  const last = line >= lines.length - 1;

  return (
    <div className="journal-back">
      <button
        className="joker-meet"
        type="button"
        onClick={() => (last ? onLeave() : setLine(line + 1))}
      >
        <b>Joker</b>
        <video
          className="plate joker-face"
          src="/plates/joker-deals.mp4"
          poster="/plates/joker.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label="The Joker dealing"
        />
        <p>{lines[line]}</p>
        <i>{last ? "He leaves" : "Click"}</i>
      </button>
    </div>
  );
}

function Paper({ onSign }: { onSign: () => void }) {
  const [ink, setInk] = useState(false);

  function sign() {
    if (ink) return;
    setInk(true);
    signSound();
    window.setTimeout(onSign, 700);
  }

  return (
    <div className="journal-back">
      <div className="paper" role="dialog" aria-label="A paper on the table">
        <p className="leaf-kicker">On the table</p>
        <img className="plate" src="/plates/signing.jpg" alt="The signing" />
        <p className="paper-line">Here, rules are law. Law is debt. And the Table always gets its debt.</p>
        <p className="paper-old">I am still playing.</p>
        {ink && <p className="paper-new">I am still playing.</p>}
        {!ink && (
          <button type="button" className="close-book go" onClick={sign}>
            Sign
          </button>
        )}
      </div>
    </div>
  );
}

/** Eaten by the Maw: a full wipe, per the standing rule. But the road remembers. */
function Death({ marks, position }: { marks: number; position: number }) {
  useEffect(() => {
    resetSting(); lossSound();
  }, []);

  function beginAgain() {
    logEvent("run_ended");
    try {
      // The grave: what the last one carried, and how far it got.
      localStorage.setItem("reliquary-grave", JSON.stringify({ marks, position, when: Date.now() }));
    } catch {
      // the dark keeps nothing anyway
    }
    try {
      localStorage.removeItem("reliquary-v3");
    } catch {
      // the dark keeps nothing anyway
    }
    window.location.reload();
  }

  return (
    <div className="journal-back" role="dialog" aria-label="Eaten">
      <div className="table one-col death">
        <p className="leaf-kicker">The Maw</p>
        <h2>It ate you.</h2>
        <p className="leaf-body">
          No chip, no game. The marks, the road, everything you carried — gone down its throat. The
          chair is empty again.
        </p>
        <div className="table-row">
          <button type="button" className="close-book go" onClick={beginAgain}>
            Begin again
          </button>
        </div>
      </div>
    </div>
  );
}

/** The Reliquary opens — and it is not an exit. You are the Table now. */
function Ending({ onReturn }: { onReturn: () => void }) {
  const [revealed, setRevealed] = useState(false);

  // The plate shows first. A full second before the words land.
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 1000);
    return () => window.clearTimeout(t);
  }, []);

  function newDealer() {
    try {
      localStorage.removeItem("reliquary-v3");
    } catch {
      // the dark keeps nothing anyway
    }
    window.location.reload();
  }

  return (
    <div className="journal-back" role="dialog" aria-label="The Reliquary">
      <div className="table one-col ending">
        <p className="leaf-kicker">The Reliquary</p>
        <img className="plate" src="/plates/reliquary.jpg" alt="The reliquary" />
        {revealed && (
          <>
            <h2 className="rite-in">The seat is yours. Dealer.</h2>
            <p className="leaf-body rite-in">
              The final chain breaks. The Reliquary opens — and it looks familiar. The dark. The table.
              The cards. The same room you fell into.
            </p>
            <p className="leaf-body rite-in">
              She is whole. Her face has come back, and the world is free. But as the chains re-forge
              around your waist, you understand: the Reliquary was never an exit. It is her throne.
              And thrones need a Dealer.
            </p>
            <p className="leaf-body rite-in">
              <em>We must play.</em>
            </p>
          </>
        )}
        <div className="table-row">
          <button type="button" className="close-book go" onClick={newDealer}>
            New Dealer
          </button>
          <button type="button" className="close-book" onClick={onReturn}>
            Leave the table
          </button>
        </div>
      </div>
    </div>
  );
}
