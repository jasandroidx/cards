import { useEffect, useState } from "react";
import { cellOf, COLS, lightCopy, SQUARES, type Square } from "@/lib/reliquary/road";
import { nextGate, roadOpen, type Gate, type Mode } from "@/lib/reliquary/sitting";
import { Table } from "@/components/reliquary/Table";
import { Euchre } from "@/components/reliquary/Euchre";
import { Border, Monte, Yacht } from "@/components/reliquary/Games";
import { Shout } from "@/components/reliquary/Shout";
import { borderAfter, borderPay, borderSpreadsSilver, type BorderResult } from "@/lib/reliquary/border";
import { Scaffold } from "@/components/reliquary/Scaffold";
import { rankLabel, suitMark, isRed, type Suit } from "@/lib/reliquary/klondike";
import { signSound } from "@/lib/reliquary/atmosphere";

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
    src: "/street.jpg",
    alt: "The drop under the table, into the dark of broken games",
    line: "You fell. Under the table is every game that broke.",
  },
  {
    at: 10,
    key: "chapel",
    name: "The Chapel",
    src: "/chapel.jpg",
    alt: "A ruined chapel held by one hearth fire",
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
    src: "/maw.jpg",
    alt: "A faceless thing of cards and bone blocking the mountain road",
    line: "It is in the road. It does not want marks.",
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
    src: "/hall.jpg",
    alt: "The hall again, waiting",
    line: "The same room. The deck is the one you carried.",
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

const JOKER = [
  "You fell through the table. I watched it open.",
  "This is the room under it. I'm the Joker. I wasn't in that deck.",
  "Win one hand at the lamp. It pays a mark.",
  "Spend the mark and the chapel opens. Then take the road. I'm leaving.",
];

function where(marks: number, owned: string[], mawBeaten: boolean, position: number, sat: number): string {
  const gate = nextGate(owned, mawBeaten);
  const purse = `${marks} ${marks === 1 ? "mark" : "marks"}.`;
  if (position >= 27 && position < 28 && !mawBeaten) {
    return "It is lying in the road. You have to play it. Marks will not move it.";
  }
  if (position < 0 && !owned.includes("chapel")) {
    if (marks < 1) return "Play one hand at the lamp. A win pays a mark.";
    return `${purse} Open the chapel. Then take the road.`;
  }
  if (position < 0) return `${purse} The chapel is open. Take the road and roll.`;
  if (sat >= 3 && position < 10) {
    return `${purse} The lamp will not deal a fourth hand. Roll. Then you can come back.`;
  }
  if (!gate) return `${purse} The way back is open.`;
  if (marks < gate.cost) {
    return `${purse} ${gate.opens} costs ${gate.cost}. Go back to the hall and play a hand.`;
  }
  return `${purse} Roll to walk. ${gate.opens} costs ${gate.cost}, and you can pay.`;
}

function linesFor(
  marks: number,
  owned: string[],
  mawBeaten: boolean,
  position: number,
  pocket: string[],
  blankSpent: boolean,
  cupboard: boolean,
): string[] {
  const lines = ["These came down with you. The rest are still in the dark."];
  if (position > 0) lines.push("Someone went down first.");
  if (marks > 0) lines.push("A place will agree, if you play it.");
  if (pocket.includes("Blank card")) lines.push("One card has no face. A gate will take it instead of marks.");
  if (blankSpent) lines.push("The blank card is gone. A way opened without marks.");
  if (pocket.includes("Bent key") && !cupboard) lines.push("A bent key. The cupboard in the room will take it.");
  if (cupboard) lines.push("Inside the cupboard, scratched in the wood: 4, 1, 8.");
  if (pocket.includes("Cracked cup")) lines.push("The cracked cup looks through the far wall of the cell.");
  if (pocket.some((item) => item !== "Blank card" && item !== "Bent key" && item !== "Cracked cup")) lines.push("The games you win leave a piece behind.");
  if (owned.includes("chapel")) lines.push("The houses walked off. A room can only keep one rule.");
  if (owned.includes("bridge")) lines.push("He deals, and then he tells you what the hand meant.");
  if (mawBeaten) lines.push("It was never a place. It moved.");
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
  boons?: string[];
  position: number;
  carried?: { rank: number; suit: string }[];
  fallen?: boolean;
  heard?: boolean;
  signed?: boolean;
  sat?: number;
  met?: boolean;
  pocket?: string[];
  blankSpent?: boolean;
  cupboard?: boolean;
  door?: boolean;
  skipRoll?: boolean;
  pipOwed?: boolean;
};

export function Board() {
  const [ageIndex, setAgeIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(false);
  const [euchreOpen, setEuchreOpen] = useState(false);
  const [playing, setPlaying] = useState<"yacht" | "monte" | "border" | "scaffold" | null>(null);
  const [shouting, setShouting] = useState(false);
  const [picked, setPicked] = useState(0);
  const [marks, setMarks] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [mawBeaten, setMawBeaten] = useState(false);
  const [heartsLit, setHeartsLit] = useState(false);
  const [spadesLit, setSpadesLit] = useState(false);
  const [silver, setSilver] = useState(false);
  const [boons, setBoons] = useState<string[]>([]);
  const [position, setPosition] = useState(-1);
  const [lastRoll, setLastRoll] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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
  const [cupboard, setCupboard] = useState(false);
  const [door, setDoor] = useState(false);
  const [skipRoll, setSkipRoll] = useState(false);
  const [pipOwed, setPipOwed] = useState(false);
  const [pad, setPad] = useState(false);
  const [code, setCode] = useState("");
  const age = AGES[ageIndex] ?? AGES[0];
  const here = position;
  const square: Square | undefined = SQUARES[picked];
  const vista = ageIndexFor(picked);
  const standing = position >= 0 ? SQUARES[position] : undefined;
  const upcoming = nextGate(owned, mawBeaten);

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

  function fall() {
    setPosition(0);
    setPicked(0);
    setAgeIndex(vistaIndex(0));
    setNote(null);
  }

  function roll() {
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reliquary-v3");
      if (raw) {
        const data = JSON.parse(raw) as Save;
        if (typeof data.position === "number") {
          setMarks(data.marks ?? 0);
          setOwned(Array.isArray(data.owned) ? data.owned : []);
          setMawBeaten(Boolean(data.mawBeaten));
          setHeartsLit(Boolean(data.heartsLit));
          setSpadesLit(Boolean(data.spadesLit));
          setSilver(Boolean(data.silver));
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
          setBlankSpent(Boolean(data.blankSpent));
          setCupboard(Boolean(data.cupboard));
          setDoor(Boolean(data.door));
          setSkipRoll(Boolean(data.skipRoll));
          setPipOwed(Boolean(data.pipOwed));
          if (data.position >= 0) {
            setAgeIndex(vistaIndex(data.position));
            setPicked(data.position);
          }
        }
      }
    } catch {
      /* keep a new game */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const save: Save = { marks, owned, mawBeaten, heartsLit, spadesLit, silver, boons, position, carried, fallen: fallen || position >= 0 || heard, heard, signed, sat, met, pocket, blankSpent, cupboard, door, skipRoll, pipOwed };
    localStorage.setItem("reliquary-v3", JSON.stringify(save));
  }, [loaded, marks, owned, mawBeaten, heartsLit, spadesLit, silver, boons, position, carried, fallen, heard, signed, sat, met, pocket, blankSpent, cupboard, door, skipRoll, pipOwed]);

  function earn(amount: number) {
    if (marks === 0 && amount > 0 && !owned.includes("chapel")) {
      setNote("The lamp pays. Open the chapel.");
    }
    setMarks((value) => Math.max(0, value + amount));
  }

  function buy(gate: Gate) {
    const upcoming = nextGate(owned, mawBeaten);
    if (!upcoming || upcoming.key !== gate.key || marks < gate.cost) return;
    setMarks((value) => value - gate.cost);
    setOwned((value) => [...value, gate.key]);
    setNote(`${gate.opens} is open.`);
  }

  function spendBlank(gate: Gate) {
    const upcoming = nextGate(owned, mawBeaten);
    if (!upcoming || upcoming.key !== gate.key || !pocket.includes("Blank card")) return;
    setPocket((value) => value.filter((item) => item !== "Blank card"));
    setBlankSpent(true);
    setOwned((value) => [...value, gate.key]);
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
                  : "";
    if (!name) return;
    setPocket((value) => (value.includes(name) ? value : [...value, name]));
    setNote(`You kept a ${name.toLowerCase()}.`);
  }

  function findBlank() {
    if (blankSpent || pocket.includes("Blank card")) return;
    setPocket((value) => [...value, "Blank card"]);
    setNote("That card has no face.");
  }

  function takeKey() {
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
      setNote("It moves. The coat can be bought.");
    } else {
      setMarks((value) => Math.max(0, value - 1));
      setNote("It does not move. It takes a mark.");
    }
  }

  function borderEnd(result: BorderResult) {
    setMarks((value) => Math.max(0, value + borderPay(result)));
    if (borderSpreadsSilver(spadesLit, result)) {
      setSilver(true);
      setNote("You took the border. The silver runs past the bank and does not stop.");
      return;
    }
    if (result === "win") {
      setNote("You took the border, and a mark for it. The water is not silver yet.");
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
  const height = ORIGIN_Y + (rows - 1) * GAP_Y + 78;
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
            : age.src;

  const warm = heartsLit && age.key === "chapel";
  const cool = spadesLit && age.key === "bridge";
  const litClass = warm ? " warm" : cool ? (silver ? " cool silver" : " cool") : "";

  return (
    <section className={`scene${litClass}`} aria-label={age.name}>
      <img key={picture} className="scene-img" src={picture} alt={age.alt} />
      <div className="scene-vignette" />
      {signed && met && age.key === "hall" && view === "table" && (
        <button type="button" className="hot hot-lamp" onClick={takeKey} aria-label="The lamp" />
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
        </>
      )}
      {signed && met && age.key === "hall" && view === "cell" && (
        <>
          <button type="button" className="hot hot-shelf" onClick={takeCup} aria-label="The shelf" />
          <button type="button" className="hot hot-wall" onClick={farWall} aria-label="The far wall" />
        </>
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
              {view === "room"
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
            <span>{where(marks, owned, mawBeaten, position, sat)}</span>
            {(heartsLit || spadesLit) && <em className="lit">{lightCopy(position)}</em>}
            {note && <em>{note}</em>}
          </>
        ) : (
          <strong>The Hall</strong>
        )}
      </div>

      {signed && (
      <div className="dock">
        {position < 0 && !owned.includes("chapel") && marks < 1 && (
          <button className="book-btn" type="button" onClick={() => setTable(true)}>
            Play a hand
          </button>
        )}
        {!owned.includes("chapel") && marks >= 1 && (
          <button
            className="book-btn"
            type="button"
            onClick={() => {
              const gate = nextGate(owned, mawBeaten);
              if (gate) buy(gate);
            }}
          >
            Open the chapel
          </button>
        )}
        {!(position < 0 && !owned.includes("chapel")) && (
          <>
        {position < 0 && heard && (
          <button className="book-btn" type="button" onClick={fall}>
            Take the road
          </button>
        )}
        {position >= 0 && age.key === "hall" && (
          <button className="book-btn" type="button" onClick={() => look(vistaIndex(position))}>
            Take the road
          </button>
        )}
        {upcoming && owned.includes("chapel") && marks >= upcoming.cost && (
          <button className="book-btn" type="button" onClick={() => buy(upcoming)}>
            Open {upcoming.opens.charAt(0).toLowerCase() + upcoming.opens.slice(1)}
          </button>
        )}
        {pipOwed && (
          <button className="book-btn" type="button" onClick={cutPip}>
            Cut for Pip
          </button>
        )}
        {position >= 0 && age.key !== "hall" && !pipOwed && (
          <button className="book-btn" type="button" onClick={roll}>
            Roll
          </button>
        )}
        {mode && (mode !== "lamp" || sat < 3) && (position >= 0 || heard) && (
          <button className="book-btn" type="button" onClick={() => setTable(true)}>
            {mode === "maw" ? "Play it" : mode === "bid" ? "The bid" : mode === "cut" ? "The cut" : "Play a hand"}
          </button>
        )}
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
        {age.key === "yard" && position >= 24 && (
          <button className="book-btn" type="button" onClick={() => setPlaying("monte")}>
            Monte
          </button>
        )}
        {position === 12 && !shouting && (
          <button className="book-btn" type="button" onClick={() => setShouting(true)}>
            The shout
          </button>
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
      )}

      {!met && <JokerMeet onLeave={() => setMet(true)} />}

      {met && !signed && (
        <Paper
          onSign={() => {
            setSigned(true);
            setHeard(true);
          }}
        />
      )}

      {deckOpen && (
        <div className="journal-back" onClick={() => setDeckOpen(false)}>
          <div className="deck-sheet" role="dialog" aria-label="The deck" onClick={(event) => event.stopPropagation()}>
            <p className="leaf-kicker">In your hand</p>
            <h2>The deck</h2>
            {linesFor(marks, owned, mawBeaten, position, pocket, blankSpent, cupboard).map((line) => (
              <p key={line} className="leaf-body">
                {line}
              </p>
            ))}
            {pocket.length > 0 && <p className="leaf-relic">Pocket: {pocket.join(", ")}</p>}
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
                  <span className={pocket.includes("Blank card") ? "win-face" : "win-face back"}>
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
              <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="The road of games">
                <path d={d} fill="none" stroke="#8d6b45" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#5c2a26" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
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
                    <g key={s.id} className="sq" onClick={() => setPicked(s.id)}>
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
        <Yacht onEarn={(amount) => setMarks((value) => Math.max(0, value + amount))} onWin={(won) => won && setHeartsLit(true)} onClose={() => setPlaying(null)} />
      )}
      {playing === "monte" && (
        <Monte
          onEarn={(amount) => setMarks((value) => Math.max(0, value + amount))}
          onWin={(won) => {
            if (!won) {
              setNote("The hands cheated once and kept her.");
              return;
            }
            if (!boons.includes("undo")) {
              setBoons((prev) => [...prev, "undo"]);
              setNote("You won the queen. You are carrying an undo.");
              return;
            }
            setNote("You won the queen again. The undo stays with you.");
          }}
          onClose={() => setPlaying(null)}
        />
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
            setNote("The house of cards fell.");
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {shouting && <Shout onLose={riverTakes} onClear={riverCleared} onClose={() => setShouting(false)} />}

      {euchreOpen && (
        <Euchre onEarn={(amount) => setMarks((value) => Math.max(0, value + amount))} onClose={() => setEuchreOpen(false)} />
      )}

      {table && (
        <Table
          mode={mode ?? "lamp"}
          marks={marks}
          owned={owned}
          mawBeaten={mawBeaten}
          onEarn={earn}
          onBuy={buy}
          onSpendBlank={spendBlank}
          hasBlank={pocket.includes("Blank card")}
          onKeep={keep}
          onMaw={face}
          onBid={bidMade}
          onSat={() => setSat((value) => Math.min(3, value + 1))}
          onClose={() => setTable(false)}
        />
      )}
    </section>
  );
}

function JokerMeet({ onLeave }: { onLeave: () => void }) {
  const [line, setLine] = useState(0);
  const last = line >= JOKER.length - 1;

  return (
    <div className="journal-back">
      <button
        className="joker-meet"
        type="button"
        onClick={() => (last ? onLeave() : setLine(line + 1))}
      >
        <b>Joker</b>
        <p>{JOKER[line]}</p>
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
        <p className="paper-line">I am still playing.</p>
        <p className="paper-old">still playing</p>
        {ink && <p className="paper-new">still playing</p>}
        {!ink && (
          <button type="button" className="close-book go" onClick={sign}>
            Sign
          </button>
        )}
      </div>
    </div>
  );
}
