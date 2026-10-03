import { useRef, useState } from "react";
import { bankTick, cupThunk, diceClatter, gateSound, lossSound } from "@/lib/reliquary/atmosphere";

function canMatch(open: number[], target: number): boolean {
  const count = open.length;
  for (let mask = 1; mask < 1 << count; mask++) {
    let sum = 0;
    for (let i = 0; i < count; i++) if (mask & (1 << i)) sum += open[i] ?? 0;
    if (sum === target) return true;
  }
  return false;
}

function pay(closed: number): number {
  if (closed >= 9) return 3;
  if (closed >= 7) return 2;
  if (closed >= 5) return 1;
  return 0;
}

const BOX_CSS = `
.bx-stage { perspective: 800px; }
.bx-box { position: relative; max-width: 560px; margin: 0 auto; }
.bx-cavity {
  position: relative;
  min-height: 132px;
  background: #0e0a06;
  border: 3px solid #2a1e12;
  border-radius: 6px;
  box-shadow: inset 0 0 40px rgba(0,0,0,0.9), 0 10px 30px rgba(0,0,0,0.6);
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
  padding: 18px 14px;
  transition: border-color 0.4s, filter 0.4s;
}
.bx-lid {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 12% 50%, #55432c 0 6px, transparent 7px),
    radial-gradient(circle at 88% 50%, #55432c 0 6px, transparent 7px),
    linear-gradient(180deg, #4a3620 0%, #33241a 45%, #241a12 100%);
  border: 3px solid #17100a;
  border-radius: 6px;
  transform-origin: top center;
  transition: transform 0.75s cubic-bezier(0.3, 0.7, 0.3, 1);
  z-index: 2;
}
.bx-lid::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(90deg, transparent 0 90px, rgba(20,16,12,0.55) 90px 104px);
  border-radius: 4px;
}
.bx-lid.open { transform: rotateX(-104deg); animation: bx-flash 0.09s linear 2; }
.bx-lid.straining { animation: bx-strain 0.12s linear infinite; }
@keyframes bx-strain {
  0% { transform: rotateX(0deg) translateX(-2px); }
  50% { transform: rotateX(-4deg) translateX(2px); }
  100% { transform: rotateX(0deg) translateX(-2px); }
}
.bx-closed:hover .bx-box { animation: bx-tremble 0.45s ease-in-out infinite; }
@keyframes bx-tremble {
  0%, 100% { transform: rotate(-0.4deg); }
  50% { transform: rotate(0.4deg); }
}
.bx-tile {
  width: 52px; height: 52px;
  background: linear-gradient(160deg, #e8dcc0 0%, #c9b78f 100%);
  border: 2px solid #241c12; border-radius: 8px;
  color: #241c12; font-size: 20px; font-weight: bold;
  cursor: pointer;
  animation: bx-tile-rise 0.4s cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
  transition: transform 0.15s, box-shadow 0.15s;
}
.bx-tile:disabled { cursor: default; }
.bx-tile.picked { transform: translateY(-6px); box-shadow: 0 0 0 2px #d8b25c, 0 6px 14px rgba(0,0,0,0.5); }
.bx-tile.shutting { animation: bx-tile-fall 0.45s ease-in forwards; }
@keyframes bx-tile-rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}
@keyframes bx-tile-fall {
  to { opacity: 0; transform: translateY(30px) rotateX(70deg); }
}
.bx-box.won { filter: drop-shadow(0 0 18px rgba(216,178,92,0.55)); }
.bx-box.won .bx-cavity { border-color: #d8b25c; }
.bx-box.lost .bx-cavity { filter: brightness(0.55); }
@keyframes bx-flash { 50% { filter: brightness(1.7); } }
`;

export function Box({ onEarn }: { onEarn: (n: number) => void }) {
  const [open, setOpen] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [picked, setPicked] = useState<number[]>([]);
  const [dice, setDice] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [payout, setPayout] = useState(0);
  const [unboxed, setUnboxed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<number[]>([]);
  const [resultShown, setResultShown] = useState(false);
  const paid = useRef(false);

  function openBox() {
    if (unboxed || opening) return;
    setOpening(true);
    gateSound();
    window.setTimeout(() => {
      setOpening(false);
      setUnboxed(true);
      cupThunk();
    }, 750);
  }

  function roll() {
    const next = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
    diceClatter(2);
    if (!canMatch(open, next)) {
      finish(open);
      setDice(next);
      return;
    }
    setDice(next);
    setPicked([]);
  }

  function toggle(n: number) {
    if (closing.length > 0) return;
    setPicked((current) => (current.includes(n) ? current.filter((item) => item !== n) : [...current, n]));
  }

  function shut() {
    if (dice === null || closing.length > 0) return;
    const sum = picked.reduce((total, n) => total + n, 0);
    if (sum !== dice) return;
    const shutting = [...picked];
    setClosing(shutting);
    shutting.forEach((_, i) => window.setTimeout(() => bankTick(), i * 130));
    window.setTimeout(() => {
      const next = open.filter((n) => !shutting.includes(n));
      setOpen(next);
      setPicked([]);
      setClosing([]);
      setDice(null);
      if (next.length === 0) finish([]);
    }, shutting.length * 130 + 400);
  }

  function finish(still: number[]) {
    if (paid.current) return;
    paid.current = true;
    const earned = pay(9 - still.length);
    setDone(true);
    setPayout(earned);
    onEarn(earned);
    // Let the outcome land before showing it. Wins already chimed via the
    // parent's earn(); a shutout plays its thud here since the parent stays silent on 0.
    window.setTimeout(() => {
      setResultShown(true);
      if (earned === 0) lossSound();
    }, 700);
  }

  const busy = closing.length > 0;

  return (
    <div className="felt">
      <style>{BOX_CSS}</style>
      <img className="plate" src="/box.jpg" alt="" />
      <p className="table-rule">
        Roll. Shut numbers that add up to it. Five shut pays a mark. All nine pays three. If you cannot shut any, the box closes.
      </p>
      <div className="bx-stage">
        <div
          className={`bx-box${!unboxed ? " bx-closed" : ""}${done && resultShown && payout > 0 ? " won" : ""}${done && resultShown && payout === 0 ? " lost" : ""}`}
        >
          <div className="bx-cavity">
            {unboxed &&
              open.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  className={`bx-tile${picked.includes(n) ? " picked" : ""}${closing.includes(n) ? " shutting" : ""}`}
                  style={{ animationDelay: `${i * 110}ms` }}
                  onClick={() => toggle(n)}
                  disabled={done || dice === null || busy}
                >
                  {n}
                </button>
              ))}
          </div>
          <div className={`bx-lid${unboxed && !opening ? " open" : ""}${opening ? " straining" : ""}`} />
        </div>
      </div>
      {!unboxed && (
        <div className="table-row">
          <button type="button" className="close-book go" onClick={openBox} disabled={opening}>
            {opening ? "The lid groans…" : "Open the box"}
          </button>
        </div>
      )}
      {unboxed && (
        <div className="table-row">
          <button type="button" className="close-book go" onClick={roll} disabled={done || dice !== null}>
            {dice === null ? "Roll" : `Rolled ${dice}`}
          </button>
          <button
            type="button"
            className="close-book"
            onClick={shut}
            disabled={done || busy || picked.reduce((t, n) => t + n, 0) !== dice}
          >
            Shut them
          </button>
          {!done && (
            <button type="button" className="close-book" onClick={() => finish(open)} disabled={busy}>
              Leave it
            </button>
          )}
        </div>
      )}
      {unboxed && dice !== null && !done && (
        <p className="table-end">
          Rolled {dice}. Picked {picked.reduce((total, n) => total + n, 0) || "nothing"}.{" "}
          {picked.reduce((total, n) => total + n, 0) === dice ? "That shuts." : "Those do not add up yet."}
        </p>
      )}
      {done && resultShown && (
        <p className="table-end">{payout === 0 ? "The box paid nothing." : `${payout} ${payout === 1 ? "mark" : "marks"}.`}</p>
      )}
    </div>
  );
}
