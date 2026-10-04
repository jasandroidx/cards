import { useEffect, useRef, useState } from "react";

type Mark = "X" | "O" | null;
type Phase = "you" | "prisoner" | "over";

const LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const WIN_LINE_COORDS: { x1: number; y1: number; x2: number; y2: number }[] = [
  { x1: 20, y1: 50, x2: 280, y2: 50 },
  { x1: 20, y1: 150, x2: 280, y2: 150 },
  { x1: 20, y1: 250, x2: 280, y2: 250 },
  { x1: 50, y1: 20, x2: 50, y2: 280 },
  { x1: 150, y1: 20, x2: 150, y2: 280 },
  { x1: 250, y1: 20, x2: 250, y2: 280 },
  { x1: 25, y1: 25, x2: 275, y2: 275 },
  { x1: 275, y1: 25, x2: 25, y2: 275 },
];

function getWinningLineIndex(cells: Mark[]): number | null {
  for (let i = 0; i < LINES.length; i++) {
    const [a, b, c] = LINES[i];
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return i;
  }
  return null;
}

function findThreat(cells: Mark[], who: "X" | "O"): number | null {
  for (const [a, b, c] of LINES) {
    const trio = [cells[a], cells[b], cells[c]];
    if (trio.filter((m) => m === who).length === 2 && trio.includes(null)) {
      const open = [a, b, c].find((i) => cells[i] === null);
      if (open !== undefined) return open;
    }
  }
  return null;
}

/** The prisoner is mad and sloppy: mostly it scratches anywhere, with rare flashes of lucidity. */
function prisonerPick(cells: Mark[]): number {
  const empty: number[] = [];
  cells.forEach((m, i) => {
    if (!m) empty.push(i);
  });
  const take = () => empty[Math.floor(Math.random() * empty.length)] ?? 0;
  if (empty.length === 0) return 0;
  const r = Math.random();
  if (r < 0.68) return take();
  const win = findThreat(cells, "O");
  if (win !== null && r < 0.84) return win;
  const block = findThreat(cells, "X");
  if (block !== null) return block;
  return take();
}

function decide(cells: Mark[]): "X" | "O" | "draw" | null {
  for (const [a, b, c] of LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return cells.every((m) => m) ? "draw" : null;
}

/** A short dry scratch. Self-contained; the room's atmosphere owns the real rig. */
function scratchSound() {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioCtx = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx();
    const dur = 0.3;
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 1.4;
    const gain = audio.createGain();
    gain.gain.value = 0.05;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start();
    window.setTimeout(() => {
      try {
        void audio.close();
      } catch {
        /* already closed */
      }
    }, 700);
  } catch {
    /* silent */
  }
}

function XMark() {
  return (
    <svg viewBox="0 0 100 100" className="noughts-mark x" aria-hidden="true">
      <path d="M22 20 Q50 52 78 80" />
      <path d="M20 23 Q48 54 75 83" className="noughts-scratch" />
      <path d="M78 22 Q52 50 24 78" />
      <path d="M80 20 Q54 48 27 76" className="noughts-scratch" />
    </svg>
  );
}

function OMark() {
  return (
    <svg viewBox="0 0 100 100" className="noughts-mark o" aria-hidden="true">
      <path d="M50 15 C72 15 85 32 83 51 C81 70 67 85 49 84 C31 83 17 68 19 49 C21 31 33 16 50 15 Z" />
      <path d="M48 18 C68 18 81 33 79 50 C77 67 64 81 48 80 C33 79 21 66 22 50 C23 34 33 19 48 18 Z" className="noughts-gouge" />
    </svg>
  );
}

export function Noughts({ onEarn, onClose }: { onEarn: (n: number) => void; onClose: () => void }) {
  const [cells, setCells] = useState<Mark[]>(() => Array<Mark>(9).fill(null));
  const [phase, setPhase] = useState<Phase>("you");
  const [note, setNote] = useState(
    "Nine squares, scratched in the stone. Someone played here alone for a long time. You are X. The prisoner is O."
  );
  const paid = useRef(false);
  const done = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  function finish(result: "X" | "O" | "draw") {
    if (done.current) return;
    done.current = true;
    setPhase("over");
    if (result === "X") {
      setNote("Three. Yours. Under the grid, newly scratched and still pale: “again. again. again.”");
    } else if (result === "O") {
      setNote("It wins. Its O’s gouge deeper than your X’s. It has had more practice.");
    } else {
      setNote("Full. No one wins. The grid waits for the next tenant.");
    }
    if (!paid.current) {
      paid.current = true;
      onEarn(result === "X" ? 1 : 0);
    }
  }

  function play(i: number) {
    if (phase !== "you" || cells[i] || done.current) return;
    const next = cells.slice();
    next[i] = "X";
    setCells(next);
    const result = decide(next);
    if (result) {
      finish(result);
      return;
    }
    setPhase("prisoner");
    setNote("It scratches back…");
    timer.current = window.setTimeout(() => {
      if (done.current) return;
      const after = next.slice();
      after[prisonerPick(next)] = "O";
      scratchSound();
      setCells(after);
      const end = decide(after);
      if (end) {
        finish(end);
        return;
      }
      setPhase("you");
      setNote("Your move.");
    }, 700);
  }

  const winIdx = getWinningLineIndex(cells);
  const winCoords = winIdx !== null ? WIN_LINE_COORDS[winIdx] : null;
  const winner = winIdx !== null ? cells[LINES[winIdx][0]] : null;

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col noughts-dialog" role="dialog" aria-label="Noughts" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The cell</p>
          <h2>Noughts</h2>
          <p className="table-rule">A grid scratched in the cell wall. Finish the prisoner’s game.</p>
          <div className="noughts-board" role="grid" aria-label="Noughts grid">
            {cells.map((m, i) => (
              <button
                key={i}
                type="button"
                role="gridcell"
                className="noughts-cell"
                aria-label={m ? `Square ${i + 1}, ${m}` : `Empty square ${i + 1}`}
                disabled={phase !== "you" || !!m}
                onClick={() => play(i)}
              >
                {m === "X" && <XMark />}
                {m === "O" && <OMark />}
              </button>
            ))}
            {winCoords && (
              <svg viewBox="0 0 300 300" className={`noughts-win-line ${winner === "X" ? "win-x" : "win-o"}`} aria-hidden="true">
                <line x1={winCoords.x1} y1={winCoords.y1} x2={winCoords.x2} y2={winCoords.y2} />
              </svg>
            )}
          </div>
          <p className="table-rule noughts-status">{note}</p>
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
        </div>
      </div>
    </div>
  );
}
