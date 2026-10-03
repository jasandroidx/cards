import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bankTick } from "@/lib/reliquary/atmosphere";

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

