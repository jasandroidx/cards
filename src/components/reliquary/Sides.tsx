import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bankTick } from "@/lib/reliquary/atmosphere";

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function scoreFrom(dx: number, dy: number): { label: string; score: number } {
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

function wedge(index: number, inner: number, outer: number): string {
  const step = (Math.PI * 2) / 20;
  const start = -Math.PI / 2 - step / 2 + index * step;
  const end = start + step;
  const point = (angle: number, radius: number) =>
    `${(160 + Math.cos(angle) * radius).toFixed(2)} ${(160 + Math.sin(angle) * radius).toFixed(2)}`;
  return `M ${point(start, outer)} A ${outer} ${outer} 0 0 1 ${point(end, outer)} L ${point(end, inner)} A ${inner} ${inner} 0 0 0 ${point(start, inner)} Z`;
}

type Throw = { label: string; score: number };

/** Short synthesized knock for a dart hitting the board. Kept local so the
 *  shared atmosphere module stays untouched. */
function dartThud() {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioCtx = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx();
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    const dur = 0.09;
    const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * dur)), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start(now);
    const osc = audio.createOscillator();
    const og = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(og);
    og.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.18);
    window.setTimeout(() => {
      void audio.close().catch(() => undefined);
    }, 600);
  } catch {
    /* audio unavailable — the dart still lands */
  }
}

type Flight = { tx: number; ty: number; angle: number };

export function Darts({ onEarn }: { onEarn: (n: number) => void }) {
  const [throws, setThrows] = useState<Throw[]>([]);
  const [theirs, setTheirs] = useState<number | null>(null);
  const [marks, setMarks] = useState<{ x: number; y: number }[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [flying, setFlying] = useState(false);
  const [wobbling, setWobbling] = useState(false);
  const [shown, setShown] = useState(0);
  const paid = useRef(false);
  const flightTimer = useRef(0);
  const shownRef = useRef(0);
  const you = throws.reduce((total, dart) => total + dart.score, 0);

  useEffect(
    () => () => {
      if (flightTimer.current) window.clearTimeout(flightTimer.current);
    },
    [],
  );

  // Tick the displayed total up over 300ms instead of jumping.
  useEffect(() => {
    const from = shownRef.current;
    if (from === you) return;
    const start = performance.now();
    const dur = 300;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (you - from) * t);
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [you]);

  function land(base: Throw[], hit: Throw, dx: number, dy: number) {
    const next = [...base, hit];
    setThrows(next);
    setMarks((spots) => [...spots, { x: 160 + dx, y: 160 + dy }]);
    dartThud();
    setWobbling(true);
    setFlight(null);
    setFlying(false);
    if (next.length < 3) return;
    // The house aims at triple twenty with a steady-but-human arm.
    const step = (Math.PI * 2) / 20;
    const aimAngle = ORDER.indexOf(20) * step - Math.PI / 2;
    let cpu = 0;
    for (let dart = 0; dart < 3; dart++) {
      const wobble = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 55;
      const wobbleAngle = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 0.5;
      const radius = 104 + wobble;
      const angle = aimAngle + wobbleAngle;
      cpu += scoreFrom(Math.cos(angle) * radius, Math.sin(angle) * radius).score;
    }
    setTheirs(cpu);
    if (!paid.current) {
      paid.current = true;
      onEarn(next.reduce((total, dart) => total + dart.score, 0) > cpu ? 1 : 0);
    }
  }

  function aim(event: React.MouseEvent<SVGSVGElement>) {
    if (throws.length >= 3 || flight) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 320 - 160;
    const y = ((event.clientY - rect.top) / rect.height) * 320 - 160;
    // Your arm wavers: about ±26px of scatter on every throw. Aim true.
    const dx = x + (Math.random() - 0.5) * 52;
    const dy = y + (Math.random() - 0.5) * 52;
    const hit = scoreFrom(dx, dy);
    const tx = 160 + dx;
    const ty = 160 + dy;
    const angle = (Math.atan2(tx - 160, -(ty - 360)) * 180) / Math.PI;
    setFlight({ tx: (tx / 320) * 100, ty: (ty / 320) * 100, angle });
    requestAnimationFrame(() => requestAnimationFrame(() => setFlying(true)));
    const base = throws;
    flightTimer.current = window.setTimeout(() => land(base, hit, dx, dy), 380);
  }

  return (
    <div className="felt">
      <img className="plate" src="/darts.jpg" alt="" />
      <p className="table-rule">Darts. Three throws. Click the board — your arm wavers, and the house aims at triple twenty. Beat their score for a mark.</p>
      <div className="dart-stage">
        <svg
          className={wobbling ? "dartboard dart-wobble" : "dartboard"}
          viewBox="0 0 320 320"
          onClick={aim}
          role="img"
          aria-label="Dartboard"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setWobbling(false);
          }}
        >
          <defs>
            <radialGradient id="dart-wood" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3a2517" />
              <stop offset="70%" stopColor="#22140b" />
              <stop offset="100%" stopColor="#120a05" />
            </radialGradient>
            <linearGradient id="dart-brass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f4dc9a" />
              <stop offset="40%" stopColor="#d8b25c" />
              <stop offset="80%" stopColor="#8a6a22" />
              <stop offset="100%" stopColor="#f4dc9a" />
            </linearGradient>
            <radialGradient id="dart-felt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1410" />
              <stop offset="100%" stopColor="#0d0907" />
            </radialGradient>
            <radialGradient id="dart-hit-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff3d1" />
              <stop offset="40%" stopColor="#d8b25c" />
              <stop offset="100%" stopColor="#8a6a22" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="160" r="160" fill="url(#dart-wood)" />
          <circle cx="160" cy="160" r="156.5" fill="none" stroke="url(#dart-brass)" strokeWidth="1.5" />
          <circle cx="160" cy="160" r="155" fill="url(#dart-felt)" />
          {ORDER.map((_, index) => (
            <path key={`o${index}`} d={wedge(index, 136, 150)} fill={index % 2 === 0 ? "#8a221c" : "#1e4a2e"} />
          ))}
          {ORDER.map((_, index) => (
            <path key={`s${index}`} d={wedge(index, 22, 136)} fill={index % 2 === 0 ? "#14100d" : "#f0e4ca"} />
          ))}
          {ORDER.map((_, index) => (
            <path key={`t${index}`} d={wedge(index, 96, 112)} fill={index % 2 === 0 ? "#8a221c" : "#1e4a2e"} />
          ))}
          <circle cx="160" cy="160" r="22" fill="#1e4a2e" />
          <circle cx="160" cy="160" r="10" fill="#8a221c" />
          <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(216, 178, 92, 0.45)" strokeWidth="1" />
          <circle cx="160" cy="160" r="136" fill="none" stroke="rgba(216, 178, 92, 0.45)" strokeWidth="1" />
          <circle cx="160" cy="160" r="112" fill="none" stroke="rgba(216, 178, 92, 0.45)" strokeWidth="1" />
          <circle cx="160" cy="160" r="96" fill="none" stroke="rgba(216, 178, 92, 0.45)" strokeWidth="1" />
          <circle cx="160" cy="160" r="22" fill="none" stroke="rgba(216, 178, 92, 0.55)" strokeWidth="1" />
          <circle cx="160" cy="160" r="10" fill="none" stroke="rgba(216, 178, 92, 0.55)" strokeWidth="1" />
          {ORDER.map((_, index) => {
            const step = (Math.PI * 2) / 20;
            const angle = -Math.PI / 2 - step / 2 + index * step;
            const x1 = 160 + Math.cos(angle) * 22;
            const y1 = 160 + Math.sin(angle) * 22;
            const x2 = 160 + Math.cos(angle) * 150;
            const y2 = 160 + Math.sin(angle) * 150;
            return <line key={`wire-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(216, 178, 92, 0.35)" strokeWidth="0.8" />;
          })}
          {ORDER.map((number, index) => {
            const step = (Math.PI * 2) / 20;
            const angle = -Math.PI / 2 + index * step;
            return (
              <text
                key={number}
                x={160 + Math.cos(angle) * 124}
                y={160 + Math.sin(angle) * 124}
                textAnchor="middle"
                dominantBaseline="central"
                fill={index % 2 === 0 ? "#f4ead6" : "#d8b25c"}
                fontSize="11"
                fontWeight="600"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {number}
              </text>
            );
          })}
          {marks.map((spot, index) => (
            <g key={index} className="hit">
              <circle cx={spot.x} cy={spot.y} r="5" fill="rgba(0,0,0,0.5)" />
              <circle cx={spot.x} cy={spot.y} r="3.5" fill="url(#dart-hit-glow)" stroke="#1a1005" strokeWidth="0.5" />
            </g>
          ))}
        </svg>
        {flight && (
          <div
            className="dart-flight"
            style={{
              left: flying ? `${flight.tx}%` : "50%",
              top: flying ? `${flight.ty}%` : "112%",
              transform: `rotate(${flight.angle}deg)`,
            }}
          >
            <svg width="26" height="36" viewBox="0 0 26 36" aria-hidden="true">
              <defs>
                <linearGradient id="dart-tip-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cfd4d8" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#8a929a" />
                </linearGradient>
                <linearGradient id="dart-shaft-brass" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8a6a22" />
                  <stop offset="50%" stopColor="#f4dc9a" />
                  <stop offset="100%" stopColor="#a8823c" />
                </linearGradient>
                <linearGradient id="dart-wing-red" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a82820" />
                  <stop offset="60%" stopColor="#63140e" />
                  <stop offset="100%" stopColor="#3b0a06" />
                </linearGradient>
              </defs>
              <polygon points="13,1 15.5,11 10.5,11" fill="url(#dart-tip-metal)" />
              <rect x="11" y="11" width="4" height="14" rx="1" fill="url(#dart-shaft-brass)" stroke="#4a3610" strokeWidth="0.5" />
              <polygon points="13,22 21,35 13,31 5,35" fill="url(#dart-wing-red)" stroke="#d8b25c" strokeWidth="0.75" />
              <line x1="13" y1="22" x2="13" y2="31" stroke="#d8b25c" strokeWidth="1" />
            </svg>
          </div>
        )}
      </div>
      <p className="table-end">
        {throws.map((dart) => dart.label).join(", ") || "Click to throw."} {throws.length > 0 ? `= ${shown}` : ""}
      </p>
      {theirs !== null && (
        <p className="table-end">{you > theirs ? `They scored ${theirs}. You win a mark.` : `They scored ${theirs}. No mark.`}</p>
      )}
    </div>
  );
}

type Grid = number[][];

function empty(): Grid {
  return Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0));
}

function drop(board: Grid, column: number, player: number): Grid | null {
  if (board[0]?.[column]) return null;
  const next = board.map((row) => row.slice());
  for (let row = 5; row >= 0; row--) {
    if (next[row]?.[column] === 0) {
      next[row]![column] = player;
      return next;
    }
  }
  return null;
}

function line(board: Grid, player: number): boolean {
  const has = (row: number, column: number) => board[row]?.[column] === player;
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 7; column++) {
      if (
        (has(row, column) && has(row, column + 1) && has(row, column + 2) && has(row, column + 3)) ||
        (has(row, column) && has(row + 1, column) && has(row + 2, column) && has(row + 3, column)) ||
        (has(row, column) && has(row + 1, column + 1) && has(row + 2, column + 2) && has(row + 3, column + 3)) ||
        (has(row, column) && has(row + 1, column - 1) && has(row + 2, column - 2) && has(row + 3, column - 3))
      ) {
        return true;
      }
    }
  }
  return false;
}

function cpuColumn(board: Grid): number {
  const open = [3, 2, 4, 1, 5, 0, 6].filter((column) => !board[0]?.[column]);
  for (const column of open) {
    const next = drop(board, column, 2);
    if (next && line(next, 2)) return column;
  }
  for (const column of open) {
    const next = drop(board, column, 1);
    if (next && line(next, 1)) return column;
  }
  return open[Math.floor(Math.random() * Math.min(3, open.length))] ?? open[0] ?? 0;
}

const FOUR_CSS = `
.four-wrap { position: relative; display: inline-block; margin-top: 28px; }
.four-wrap .disc.you, .four-wrap .disc.them { animation: none; }
.four-wrap .disc.falling {
  position: absolute;
  margin: 0;
  z-index: 3;
  pointer-events: none;
  animation: four-fall 0.5s cubic-bezier(0.55, 0, 1, 1);
}
@keyframes four-fall {
  0% { transform: translateY(var(--fall-from)); animation-timing-function: cubic-bezier(0.55, 0, 1, 1); }
  68% { transform: translateY(0); animation-timing-function: ease-out; }
  80% { transform: translateY(-9px); }
  90% { transform: translateY(3px); }
  100% { transform: translateY(0); }
}
.four-wrap .disc.win {
  animation: four-win-pulse 0.55s ease-out backwards;
  box-shadow:
    0 0 0 2px #d8b25c,
    0 0 18px rgba(216, 178, 92, 0.9),
    inset 0 2px 4px rgba(255, 255, 255, 0.5);
}
@keyframes four-win-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
.four-wrap .disc.ghost {
  position: absolute;
  opacity: 0.45;
  pointer-events: none;
  z-index: 2;
}
.four-hint {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px dashed #d8b25c;
  background: radial-gradient(circle, rgba(216, 178, 92, 0.3) 0%, transparent 70%);
  box-shadow: 0 0 12px rgba(216, 178, 92, 0.5);
  animation: four-hint-pulse 0.55s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
@keyframes four-hint-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1.08); }
}
`;

/** The winning four cell keys ("row-column"), or null. Mirrors line(). */
function findLine(board: Grid, player: number): string[] | null {
  const has = (row: number, column: number) => board[row]?.[column] === player;
  const key = (row: number, column: number) => `${row}-${column}`;
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 7; column++) {
      if (has(row, column) && has(row, column + 1) && has(row, column + 2) && has(row, column + 3))
        return [key(row, column), key(row, column + 1), key(row, column + 2), key(row, column + 3)];
      if (has(row, column) && has(row + 1, column) && has(row + 2, column) && has(row + 3, column))
        return [key(row, column), key(row + 1, column), key(row + 2, column), key(row + 3, column)];
      if (has(row, column) && has(row + 1, column + 1) && has(row + 2, column + 2) && has(row + 3, column + 3))
        return [key(row, column), key(row + 1, column + 1), key(row + 2, column + 2), key(row + 3, column + 3)];
      if (has(row, column) && has(row + 1, column - 1) && has(row + 2, column - 2) && has(row + 3, column - 3))
        return [key(row, column), key(row + 1, column - 1), key(row + 2, column - 2), key(row + 3, column - 3)];
    }
  }
  return null;
}

function landRow(board: Grid, column: number): number {
  for (let row = 5; row >= 0; row--) {
    if (board[row]?.[column] === 0) return row;
  }
  return -1;
}

const full = (board: Grid) => board.every((row) => row.every((cell) => cell !== 0));

export function Four({ onEarn }: { onEarn: (n: number) => void }) {
  const [board, setBoard] = useState<Grid>(empty);
  const [note, setNote] = useState("Drop a disc. Four in a row.");
  const [over, setOver] = useState(false);
  const [fall, setFall] = useState<{ column: number; row: number; player: 1 | 2; id: number } | null>(null);
  const [winKeys, setWinKeys] = useState<string[] | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [cpuHint, setCpuHint] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const paid = useRef(false);
  const busyRef = useRef(false);
  const seq = useRef(0);

  function setBusyBoth(value: boolean) {
    busyRef.current = value;
    setBusy(value);
  }

  function dropChip(column: number, row: number, player: 1 | 2, done: () => void) {
    const id = ++seq.current;
    setFall({ column, row, player, id });
    window.setTimeout(() => {
      if (seq.current === id) bankTick();
    }, 330);
    window.setTimeout(() => {
      if (seq.current !== id) return;
      setFall(null);
      done();
    }, 500);
  }

  function resolveWin(cells: string[], youWon: boolean) {
    setWinKeys(cells);
    window.setTimeout(() => {
      setOver(true);
      setNote(youWon ? "Four. One mark." : "They got four. No mark.");
      if (!paid.current) {
        paid.current = true;
        onEarn(youWon ? 1 : 0);
      }
      setBusyBoth(false);
    }, 950);
  }

  function resolveDraw() {
    window.setTimeout(() => {
      setOver(true);
      setNote("The board filled. No mark.");
      if (!paid.current) paid.current = true;
      setBusyBoth(false);
    }, 400);
  }

  function cpuMove(yours: Grid) {
    const cc = cpuColumn(yours);
    setCpuHint(cc);
    setNote("They are thinking.");
    window.setTimeout(() => {
      setCpuHint(null);
      const cRow = landRow(yours, cc);
      dropChip(cc, cRow, 2, () => {
        const theirs = drop(yours, cc, 2) ?? yours;
        setBoard(theirs);
        const cells = findLine(theirs, 2);
        if (cells) {
          resolveWin(cells, false);
          return;
        }
        if (full(theirs)) {
          resolveDraw();
          return;
        }
        setNote("Drop a disc. Four in a row.");
        setBusyBoth(false);
      });
    }, 650);
  }

  function play(column: number) {
    if (over || busyRef.current) return;
    const yours = drop(board, column, 1);
    if (!yours) return;
    const row = landRow(board, column);
    setBusyBoth(true);
    setHoverCol(null);
    dropChip(column, row, 1, () => {
      setBoard(yours);
      const cells = findLine(yours, 1);
      if (cells) {
        resolveWin(cells, true);
        return;
      }
      if (full(yours)) {
        resolveDraw();
        return;
      }
      cpuMove(yours);
    });
  }

  return (
    <div className="felt">
      <style>{FOUR_CSS}</style>
      <img className="plate" src="/four.jpg" alt="" />
      <p className="table-rule">Four in a row. You are red. They answer after every drop. Get four for a mark.</p>
      <div className="four-wrap">
        <div className="four">
          {board.map((row, rowIndex) =>
            row.map((cell, column) => {
              const k = `${rowIndex}-${column}`;
              const winIndex = winKeys?.indexOf(k) ?? -1;
              return (
                <button
                  key={k}
                  type="button"
                  className={`${cell === 1 ? "disc you" : cell === 2 ? "disc them" : "disc"}${winIndex >= 0 ? " win" : ""}`}
                  style={winIndex >= 0 ? { animationDelay: `${winIndex * 100}ms` } : undefined}
                  onClick={() => play(column)}
                  onMouseEnter={() => {
                    if (!busyRef.current && !over) setHoverCol(column);
                  }}
                  onMouseLeave={() => setHoverCol(null)}
                />
              );
            }),
          )}
        </div>
        {fall && (
          <span
            key={fall.id}
            className={`disc falling ${fall.player === 1 ? "you" : "them"}`}
            style={
              {
                left: 18 + fall.column * 42,
                top: 18 + fall.row * 42,
                "--fall-from": `${-(18 + fall.row * 42 + 56)}px`,
              } as CSSProperties
            }
          />
        )}
        {hoverCol !== null && !busy && !over && (
          <span className="disc you ghost" style={{ left: 18 + hoverCol * 42, top: -46 }} />
        )}
        {cpuHint !== null && <span className="four-hint" style={{ left: 18 + cpuHint * 42, top: -46 }} />}
      </div>
      <p className="table-end">{note}</p>
    </div>
  );
}

