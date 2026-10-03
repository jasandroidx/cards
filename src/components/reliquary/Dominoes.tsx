import { useEffect, useRef, useState } from "react";
import { bankTick } from "@/lib/reliquary/atmosphere";

type Tile = { a: number; b: number }; // canonical: a <= b, in hands
type Placed = { a: number; b: number }; // oriented: a = left value, b = right value

const WORDS = ["blank", "one", "two", "three", "four", "five", "six"];

const PIPS: Record<number, number[]> = {
  0: [],
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function tileName(t: Tile): string {
  return t.a === t.b ? `double ${WORDS[t.a]}` : `${WORDS[t.b]}-${WORDS[t.a]}`;
}

function legalEnds(t: Tile, left: number, right: number): ("left" | "right")[] {
  const ends: ("left" | "right")[] = [];
  if (t.a === left || t.b === left) ends.push("left");
  if (t.a === right || t.b === right) ends.push("right");
  return ends;
}

/** Orient the tile so the matching side sits against the chain. */
function placeOn(board: Placed[], tile: Tile, end: "left" | "right"): Placed[] {
  if (board.length === 0) return [{ a: tile.a, b: tile.b }];
  if (end === "left") {
    const L = board[0]!.a;
    const oriented = tile.a === L ? { a: tile.b, b: tile.a } : { a: tile.a, b: tile.b };
    return [oriented, ...board];
  }
  const R = board[board.length - 1]!.b;
  const oriented = tile.a === R ? { a: tile.a, b: tile.b } : { a: tile.b, b: tile.a };
  return [...board, oriented];
}

function highestDoubleFirst(you: Tile[], cpu: Tile[]): { tile: Tile; by: "you" | "cpu" } {
  let best: Tile | null = null;
  let by: "you" | "cpu" = "you";
  const considerDouble = (t: Tile, who: "you" | "cpu") => {
    if (t.a !== t.b) return;
    if (!best || t.a > best.a) {
      best = t;
      by = who;
    }
  };
  you.forEach((t) => considerDouble(t, "you"));
  cpu.forEach((t) => considerDouble(t, "cpu"));
  if (best) return { tile: best, by };
  // Fallback: highest pip total, then highest single value.
  let high: Tile | null = null;
  const considerHigh = (t: Tile, who: "you" | "cpu") => {
    const s = t.a + t.b;
    const hs = high ? high.a + high.b : -1;
    const m = Math.max(t.a, t.b);
    const hm = high ? Math.max(high.a, high.b) : -1;
    if (!high || s > hs || (s === hs && m > hm)) {
      high = t;
      by = who;
    }
  };
  you.forEach((t) => considerHigh(t, "you"));
  cpu.forEach((t) => considerHigh(t, "cpu"));
  return { tile: high!, by };
}

const DOM_CSS = `
.dom-chain { display: flex; gap: 6px; overflow-x: auto; padding: 10px 4px; align-items: center; min-height: 88px; }
.dom-tile { display: inline-flex; align-items: stretch; background: linear-gradient(160deg, #f4ecd8 0%, #d8c9a6 100%); border: 2px solid #241c12; border-radius: 8px; padding: 0; cursor: pointer; flex: 0 0 auto; }
.dom-tile:disabled { cursor: default; }
.dom-hand { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.dom-hand .dom-tile { width: 78px; height: 42px; }
.dom-chain .dom-tile { width: 62px; height: 34px; }
.dom-tile.doubles { flex-direction: column; }
.dom-hand .dom-tile.doubles { width: 42px; height: 78px; }
.dom-chain .dom-tile.doubles { width: 34px; height: 62px; }
.dom-half { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); padding: 5px; min-width: 0; min-height: 0; }
.dom-div { flex: 0 0 2px; background: #241c12; }
.dom-tile.doubles .dom-div { flex: 0 0 2px; }
.dom-pip { width: 6px; height: 6px; border-radius: 50%; background: #241c12; place-self: center; box-shadow: inset 0 1px 1px rgba(0,0,0,0.4); }
.dom-tile.playable { box-shadow: 0 0 0 2px #d8b25c, 0 4px 10px rgba(0,0,0,0.45); transform: translateY(-4px); }
.dom-tile.playable:hover { transform: translateY(-6px); }
.dom-tile.dim { opacity: 0.4; }
.dom-ends { display: flex; gap: 10px; align-items: center; color: #efe2c8; font-size: 15px; margin: 4px 0; }
.dom-endbadge { border: 1px solid #d8b25c; border-radius: 6px; padding: 2px 10px; color: #f4e6c4; }
`;

function Half({ v }: { v: number }) {
  return (
    <span className="dom-half">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => (
        <span key={p} className={PIPS[v]!.includes(p) ? "dom-pip" : undefined} />
      ))}
    </span>
  );
}

function Bone({ a, b, className, onClick, disabled }: { a: number; b: number; className?: string; onClick?: () => void; disabled?: boolean }) {
  const dbl = a === b;
  const cls = `dom-tile${dbl ? " doubles" : ""}${className ? ` ${className}` : ""}`;
  const inner = (
    <>
      <Half v={a} />
      <span className="dom-div" />
      <Half v={b} />
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}

export function Dominoes({ onEarn }: { onEarn: (n: number) => void }) {
  const [you, setYou] = useState<Tile[]>([]);
  const [cpu, setCpu] = useState<Tile[]>([]);
  const [board, setBoard] = useState<Placed[]>([]);
  const [turn, setTurn] = useState<"you" | "cpu">("you");
  const [passes, setPasses] = useState(0);
  const [pending, setPending] = useState<Tile | null>(null);
  const [over, setOver] = useState<{ winner: "you" | "cpu" | "tie"; youPips: number; cpuPips: number } | null>(null);
  const [note, setNote] = useState("Shuffling the bones.");
  const paid = useRef(false);
  const chainRef = useRef<HTMLDivElement>(null);

  // Deal once.
  useEffect(() => {
    const tiles: Tile[] = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push({ a, b });
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const ti = tiles[i]!;
      tiles[i] = tiles[j]!;
      tiles[j] = ti;
    }
    const y = tiles.slice(0, 7);
    const c = tiles.slice(7, 14);
    const { tile, by } = highestDoubleFirst(y, c);
    const sortHand = (h: Tile[]) =>
      [...h].sort((p, q) => q.a + q.b - (p.a + p.b) || Math.max(q.a, q.b) - Math.max(p.a, p.b));
    setYou(sortHand(y.filter((t) => t !== tile)));
    setCpu(c.filter((t) => t !== tile));
    setBoard([{ a: tile.a, b: tile.b }]);
    bankTick();
    if (by === "you") {
      setNote(`You hold the ${tileName(tile)}. You open.`);
      setTurn("cpu");
    } else {
      setNote(`They hold the ${tileName(tile)}. They open.`);
      setTurn("you");
    }
  }, []);

  // Keep the newest tile in view.
  useEffect(() => {
    const el = chainRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [board]);

  const leftEnd = board.length > 0 ? board[0]!.a : -1;
  const rightEnd = board.length > 0 ? board[board.length - 1]!.b : -1;
  const yourTurn = turn === "you" && !over;
  const playable = (t: Tile) => yourTurn && !pending && legalEnds(t, leftEnd, rightEnd).length > 0;
  const canKnock = yourTurn && !pending && board.length > 0 && !you.some((t) => legalEnds(t, leftEnd, rightEnd).length > 0);

  function finish(result: "you" | "cpu" | "blocked", fy: Tile[], fc: Tile[]) {
    const youPips = fy.reduce((s, t) => s + t.a + t.b, 0);
    const cpuPips = fc.reduce((s, t) => s + t.a + t.b, 0);
    let winner: "you" | "cpu" | "tie";
    let line: string;
    const tally = `You hold ${youPips}. They hold ${cpuPips}.`;
    if (result === "you") {
      winner = "you";
      line = `Domino. Your last bone is down. ${tally}`;
    } else if (result === "cpu") {
      winner = "cpu";
      line = `Domino. Their last bone is down. ${tally}`;
    } else if (youPips < cpuPips) {
      winner = "you";
      line = `Blocked. ${tally} Fewest pips takes it.`;
    } else if (cpuPips < youPips) {
      winner = "cpu";
      line = `Blocked. ${tally} Fewest pips takes it.`;
    } else {
      winner = "tie";
      line = `Blocked. ${tally} Dead even. The house keeps the mark.`;
    }
    setOver({ winner, youPips, cpuPips });
    setNote(line);
    if (!paid.current) {
      paid.current = true;
      onEarn(winner === "you" ? 1 : 0);
    }
  }

  function commitPlay(who: "you" | "cpu", t: Tile, end: "left" | "right") {
    bankTick();
    setBoard((b) => placeOn(b, t, end));
    setPasses(0);
    if (who === "you") {
      const ny = you.filter((x) => x !== t);
      setYou(ny);
      if (ny.length === 0) {
        finish("you", ny, cpu);
        return;
      }
      setNote(`You lay the ${tileName(t)}.`);
      setTurn("cpu");
    } else {
      const nc = cpu.filter((x) => x !== t);
      setCpu(nc);
      if (nc.length === 0) {
        finish("cpu", you, nc);
        return;
      }
      setNote(`They lay the ${tileName(t)}.`);
      setTurn("you");
    }
  }

  function playerPlay(t: Tile) {
    if (!playable(t)) return;
    const ends = legalEnds(t, leftEnd, rightEnd);
    if (ends.length === 2) {
      setPending(t);
      return;
    }
    commitPlay("you", t, ends[0]!);
  }

  function chooseEnd(end: "left" | "right") {
    if (!pending) return;
    const t = pending;
    setPending(null);
    commitPlay("you", t, end);
  }

  function playerPass() {
    if (!canKnock || over) return;
    const p = passes + 1;
    setPasses(p);
    setNote("You knock. Nothing fits.");
    if (p >= 2) {
      finish("blocked", you, cpu);
      return;
    }
    setTurn("cpu");
  }

  // The house thinks, then plays greedy: highest pip total, prefers the left end.
  useEffect(() => {
    if (turn !== "cpu" || over || board.length === 0) return;
    const id = window.setTimeout(() => {
      const L = board[0]!.a;
      const R = board[board.length - 1]!.b;
      const options = cpu
        .map((t) => ({ t, ends: legalEnds(t, L, R) }))
        .filter((o) => o.ends.length > 0)
        .sort((x, y) => y.t.a + y.t.b - (x.t.a + x.t.b));
      if (options.length === 0) {
        const p = passes + 1;
        setPasses(p);
        setNote("They knock. Nothing fits.");
        if (p >= 2) {
          finish("blocked", you, cpu);
          return;
        }
        setTurn("you");
        return;
      }
      const pick = options[0]!;
      commitPlay("cpu", pick.t, pick.ends.includes("left") ? "left" : "right");
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, board, you, cpu, passes]);

  return (
    <div className="felt">
      <style>{DOM_CSS}</style>
      <p className="table-rule">
        Twenty-eight bones, seven each. Match an open end. Fewest pips takes the mark.
      </p>
      <div className="dom-ends">
        <span>
          open: <span className="dom-endbadge">{leftEnd}</span> · <span className="dom-endbadge">{rightEnd}</span>
        </span>
        <span>
          You {you.length} · Them {cpu.length}
        </span>
        <span>{over ? "The round is done." : yourTurn ? "Your throw." : "Their throw."}</span>
      </div>
      <div className="dom-chain" ref={chainRef}>
        {board.map((p, i) => (
          <Bone key={i} a={p.a} b={p.b} />
        ))}
      </div>
      {pending && (
        <div className="table-row">
          <span>
            Lay the {tileName(pending)} on which end?
          </span>
          <button type="button" className="close-book go" onClick={() => chooseEnd("left")}>
            On {leftEnd}
          </button>
          <button type="button" className="close-book go" onClick={() => chooseEnd("right")}>
            On {rightEnd}
          </button>
        </div>
      )}
      {!over && (
        <>
          <div className="dom-hand">
            {you.map((t) => {
              const ok = playable(t);
              return (
                <Bone
                  key={`${t.a}-${t.b}`}
                  a={t.a}
                  b={t.b}
                  className={yourTurn ? (ok ? "playable" : "dim") : undefined}
                  onClick={() => playerPlay(t)}
                  disabled={!ok}
                />
              );
            })}
          </div>
          {canKnock && (
            <div className="table-row">
              <button type="button" className="close-book go" onClick={playerPass}>
                Knock
              </button>
            </div>
          )}
        </>
      )}
      <p className="table-end">{note}</p>
    </div>
  );
}
