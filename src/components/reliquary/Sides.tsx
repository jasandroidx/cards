import { useRef, useState } from "react";

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

export function Darts({ onEarn }: { onEarn: (n: number) => void }) {
  const [throws, setThrows] = useState<{ label: string; score: number }[]>([]);
  const [theirs, setTheirs] = useState<number | null>(null);
  const [marks, setMarks] = useState<{ x: number; y: number }[]>([]);
  const paid = useRef(false);
  const you = throws.reduce((total, dart) => total + dart.score, 0);

  function aim(event: React.MouseEvent<SVGSVGElement>) {
    if (throws.length >= 3) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 320 - 160;
    const y = ((event.clientY - rect.top) / rect.height) * 320 - 160;
    const dx = x + (Math.random() - 0.5) * 16;
    const dy = y + (Math.random() - 0.5) * 16;
    const hit = scoreFrom(dx, dy);
    const next = [...throws, hit];
    setThrows(next);
    setMarks((spots) => [...spots, { x: 160 + dx, y: 160 + dy }]);
    if (next.length < 3) return;
    let cpu = 0;
    for (let dart = 0; dart < 3; dart++) {
      const radius = 30 + Math.random() * 110;
      const angle = Math.random() * Math.PI * 2;
      cpu += scoreFrom(Math.cos(angle) * radius, Math.sin(angle) * radius).score;
    }
    setTheirs(cpu);
    if (!paid.current) {
      paid.current = true;
      onEarn(next.reduce((total, dart) => total + dart.score, 0) > cpu ? 1 : 0);
    }
  }

  return (
    <div className="felt">
      <img className="plate" src="/darts.jpg" alt="" />
      <p className="table-rule">Darts. Three throws. Click the board. The dart wobbles. Beat their score for a mark.</p>
      <svg className="dartboard" viewBox="0 0 320 320" onClick={aim} role="img" aria-label="Dartboard">
        <circle cx="160" cy="160" r="156" fill="#1a1410" />
        {ORDER.map((_, index) => (
          <path key={`o${index}`} d={wedge(index, 136, 150)} fill={index % 2 === 0 ? "#7a2e28" : "#2f6b45"} />
        ))}
        {ORDER.map((_, index) => (
          <path key={`s${index}`} d={wedge(index, 22, 136)} fill={index % 2 === 0 ? "#1a1410" : "#f4ead6"} />
        ))}
        {ORDER.map((_, index) => (
          <path key={`t${index}`} d={wedge(index, 96, 112)} fill={index % 2 === 0 ? "#7a2e28" : "#2f6b45"} />
        ))}
        <circle cx="160" cy="160" r="22" fill="#2f6b45" />
        <circle cx="160" cy="160" r="10" fill="#7a2e28" />
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
              fill={index % 2 === 0 ? "#f4ead6" : "#1a1410"}
              fontSize="11"
            >
              {number}
            </text>
          );
        })}
        {marks.map((spot, index) => (
          <circle key={index} className="hit" cx={spot.x} cy={spot.y} r="4" fill="#d4b36a" />
        ))}
      </svg>
      <p className="table-end">
        {throws.map((dart) => dart.label).join(", ") || "Click to throw."} {throws.length > 0 ? `= ${you}` : ""}
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

export function Four({ onEarn }: { onEarn: (n: number) => void }) {
  const [board, setBoard] = useState<Grid>(empty);
  const [note, setNote] = useState("Drop a disc. Four in a row.");
  const [over, setOver] = useState(false);
  const paid = useRef(false);

  function play(column: number) {
    if (over) return;
    const yours = drop(board, column, 1);
    if (!yours) return;
    if (line(yours, 1)) {
      setBoard(yours);
      setOver(true);
      setNote("Four. One mark.");
      if (!paid.current) {
        paid.current = true;
        onEarn(1);
      }
      return;
    }
    if (yours.every((row) => row.every((cell) => cell !== 0))) {
      setBoard(yours);
      setOver(true);
      setNote("The board filled. No mark.");
      if (!paid.current) paid.current = true;
      return;
    }
    const theirs = drop(yours, cpuColumn(yours), 2);
    const next = theirs ?? yours;
    setBoard(next);
    if (line(next, 2)) {
      setOver(true);
      setNote("They got four. No mark.");
      if (!paid.current) {
        paid.current = true;
        onEarn(0);
      }
      return;
    }
    if (next.every((row) => row.every((cell) => cell !== 0))) {
      setOver(true);
      setNote("The board filled. No mark.");
      if (!paid.current) paid.current = true;
    }
  }

  return (
    <div className="felt">
      <img className="plate" src="/four.jpg" alt="" />
      <p className="table-rule">Four in a row. You are red. They answer after every drop. Get four for a mark.</p>
      <div className="four">
        {board.map((row, rowIndex) =>
          row.map((cell, column) => (
            <button key={`${rowIndex}-${column}`} type="button" className={cell === 1 ? "disc you" : cell === 2 ? "disc them" : "disc"} onClick={() => play(column)} />
          )),
        )}
      </div>
      <p className="table-end">{note}</p>
    </div>
  );
}
