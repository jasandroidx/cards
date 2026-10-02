import { useRef, useState } from "react";

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

export function Box({ onEarn }: { onEarn: (n: number) => void }) {
  const [open, setOpen] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [picked, setPicked] = useState<number[]>([]);
  const [dice, setDice] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [payout, setPayout] = useState(0);
  const paid = useRef(false);

  function roll() {
    const next = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
    if (!canMatch(open, next)) {
      finish(open);
      setDice(next);
      return;
    }
    setDice(next);
    setPicked([]);
  }

  function toggle(n: number) {
    setPicked((current) => (current.includes(n) ? current.filter((item) => item !== n) : [...current, n]));
  }

  function shut() {
    if (dice === null) return;
    const sum = picked.reduce((total, n) => total + n, 0);
    if (sum !== dice) return;
    const next = open.filter((n) => !picked.includes(n));
    setOpen(next);
    setPicked([]);
    setDice(null);
    if (next.length === 0) finish([]);
  }

  function finish(still: number[]) {
    if (paid.current) return;
    paid.current = true;
    const earned = pay(9 - still.length);
    setDone(true);
    setPayout(earned);
    onEarn(earned);
  }

  return (
    <div className="felt">
      <img className="plate" src="/box.jpg" alt="" />
      <p className="table-rule">
        Roll. Shut numbers that add up to it. Five shut pays a mark. All nine pays three. If you cannot shut any, the box closes.
      </p>
      <div className="table-row">
        {open.map((n) => (
          <button
            key={n}
            type="button"
            className={picked.includes(n) ? "close-book go" : "close-book"}
            onClick={() => toggle(n)}
            disabled={done || dice === null}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="table-row">
        <button type="button" className="close-book go" onClick={roll} disabled={done || dice !== null}>
          {dice === null ? "Roll" : `Rolled ${dice}`}
        </button>
        <button type="button" className="close-book" onClick={shut} disabled={done || picked.reduce((t, n) => t + n, 0) !== dice}>
          Shut them
        </button>
        {!done && (
          <button type="button" className="close-book" onClick={() => finish(open)}>
            Leave it
          </button>
        )}
      </div>
      {dice !== null && !done && (
        <p className="table-end">
          Rolled {dice}. Picked {picked.reduce((total, n) => total + n, 0) || "nothing"}.{" "}
          {picked.reduce((total, n) => total + n, 0) === dice ? "That shuts." : "Those do not add up yet."}
        </p>
      )}
      {done && <p className="table-end">{payout === 0 ? "The box paid nothing." : `${payout} ${payout === 1 ? "mark" : "marks"}.`}</p>}
    </div>
  );
}
