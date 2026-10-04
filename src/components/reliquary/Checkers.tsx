import { useRef, useState } from "react";
import { takeFirstGameNudge } from "@/lib/reliquary/onboarding";
import { bankTick } from "@/lib/reliquary/atmosphere";

const CHK_CSS = `
.chk-shake { animation: chk-shake 0.22s ease-out; }
@keyframes chk-shake {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-3px, 2px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-1px, 1px); }
  100% { transform: translate(0, 0); }
}
.chk-caps { display: inline-block; animation: chk-pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1); }
@keyframes chk-pop {
  0% { transform: scale(1.7); color: #e0c27a; }
  100% { transform: scale(1); }
}
.stone.chk-crowned i { animation: chk-crown-pulse 1.2s ease-in-out; }
@keyframes chk-crown-pulse {
  0% { filter: drop-shadow(0 0 2px rgba(224, 194, 122, 0.6)); }
  50% { filter: drop-shadow(0 0 14px rgba(224, 194, 122, 1)); }
  100% { filter: drop-shadow(0 0 2px rgba(224, 194, 122, 0.6)); }
}
`;

type Board = number[][];
type Sq = { r: number; c: number };
type Step = { from: Sq; to: Sq; cap: Sq | null };
type Turn = { steps: Step[] };
type Token = { id: number; r: number; c: number; side: 1 | -1; king: boolean };

const DARK = (r: number, c: number) => (r + c) % 2 === 1;

function startBoard(): Board {
  const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!DARK(r, c)) continue;
      if (r < 3) board[r]![c] = -1;
      if (r > 4) board[r]![c] = 1;
    }
  }
  return board;
}

function tokensFrom(board: Board): Token[] {
  const tokens: Token[] = [];
  let id = 1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r]![c]!;
      if (!piece) continue;
      tokens.push({ id: id++, r, c, side: piece > 0 ? 1 : -1, king: Math.abs(piece) === 2 });
    }
  }
  return tokens;
}

function inside(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function dirs(piece: number): [number, number][] {
  const forward = piece > 0 ? -1 : 1;
  const steps: [number, number][] = [
    [forward, -1],
    [forward, 1],
  ];
  if (Math.abs(piece) === 2) steps.push([-forward, -1], [-forward, 1]);
  return steps;
}

function jumpsFrom(board: Board, r: number, c: number): Step[] {
  const piece = board[r]![c]!;
  const out: Step[] = [];
  for (const [dr, dc] of dirs(piece)) {
    const midR = r + dr;
    const midC = c + dc;
    const toR = r + dr * 2;
    const toC = c + dc * 2;
    if (!inside(toR, toC)) continue;
    const mid = board[midR]![midC]!;
    if (mid !== 0 && Math.sign(mid) === -Math.sign(piece) && board[toR]![toC] === 0) {
      out.push({ from: { r, c }, to: { r: toR, c: toC }, cap: { r: midR, c: midC } });
    }
  }
  return out;
}

function slidesFrom(board: Board, r: number, c: number): Step[] {
  const piece = board[r]![c]!;
  const out: Step[] = [];
  for (const [dr, dc] of dirs(piece)) {
    const toR = r + dr;
    const toC = c + dc;
    if (inside(toR, toC) && board[toR]![toC] === 0) out.push({ from: { r, c }, to: { r: toR, c: toC }, cap: null });
  }
  return out;
}

function apply(board: Board, step: Step): Board {
  const next = board.map((row) => row.slice());
  let piece = next[step.from.r]![step.from.c]!;
  next[step.from.r]![step.from.c] = 0;
  if (step.cap) next[step.cap.r]![step.cap.c] = 0;
  if (piece === 1 && step.to.r === 0) piece = 2;
  if (piece === -1 && step.to.r === 7) piece = -2;
  next[step.to.r]![step.to.c] = piece;
  return next;
}

function crowned(before: number, step: Step) {
  return (before === 1 && step.to.r === 0) || (before === -1 && step.to.r === 7);
}

function jumpTurns(board: Board, r: number, c: number, path: Step[], out: Turn[]) {
  const jumps = jumpsFrom(board, r, c);
  if (jumps.length === 0) {
    if (path.length) out.push({ steps: path });
    return;
  }
  for (const jump of jumps) {
    const piece = board[r]![c]!;
    const next = apply(board, jump);
    if (crowned(piece, jump)) out.push({ steps: [...path, jump] });
    else jumpTurns(next, jump.to.r, jump.to.c, [...path, jump], out);
  }
}

function turns(board: Board, player: 1 | -1): Turn[] {
  const out: Turn[] = [];
  let jumping = false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (Math.sign(board[r]![c]!) !== player) continue;
      if (jumpsFrom(board, r, c).length) jumping = true;
    }
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (Math.sign(board[r]![c]!) !== player) continue;
      if (jumping) jumpTurns(board, r, c, [], out);
      else {
        for (const step of slidesFrom(board, r, c)) out.push({ steps: [step] });
      }
    }
  }
  return out;
}

function valueOf(board: Board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r]![c]!;
      if (piece === 1) score += 30 + (7 - r);
      else if (piece === 2) score += 50;
      else if (piece === -1) score -= 30 + r;
      else if (piece === -2) score -= 50;
    }
  }
  return score;
}

function search(board: Board, player: 1 | -1, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return valueOf(board);
  const options = turns(board, player);
  if (options.length === 0) return player > 0 ? -800 : 800;
  if (player > 0) {
    let best = -9999;
    for (const turn of options) {
      let next = board;
      for (const step of turn.steps) next = apply(next, step);
      best = Math.max(best, search(next, -1, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = 9999;
  for (const turn of options) {
    let next = board;
    for (const step of turn.steps) next = apply(next, step);
    best = Math.min(best, search(next, 1, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function cpuTurn(board: Board): Turn | null {
  const options = turns(board, -1);
  if (options.length === 0) return null;
  let pick = options[0]!;
  let best = 9999;
  for (const turn of options) {
    let next = board;
    for (const step of turn.steps) next = apply(next, step);
    const score = search(next, 1, 1, -9999, 9999);
    if (score < best) {
      best = score;
      pick = turn;
    }
  }
  return pick;
}

function moveToken(tokens: Token[], step: Step, board: Board): Token[] {
  return tokens.flatMap((token) => {
    if (step.cap && token.r === step.cap.r && token.c === step.cap.c) return [];
    if (token.r === step.from.r && token.c === step.from.c) {
      return [{ ...token, r: step.to.r, c: step.to.c, king: Math.abs(board[step.to.r]![step.to.c]!) === 2 }];
    }
    return [token];
  });
}

export function Checkers({ onEarn }: { onEarn: (n: number) => void }) {
  const [board, setBoard] = useState<Board>(startBoard);
  // Onboarding nudge: claimed once on mount; while held, the house moves
  // blind instead of searching.
  const [nudged] = useState(() => takeFirstGameNudge());
  const [tokens, setTokens] = useState<Token[]>(() => tokensFrom(startBoard()));
  const [selected, setSelected] = useState<Sq | null>(null);
  const [lock, setLock] = useState<Sq | null>(null);
  const [note, setNote] = useState("You are red, at the bottom. First to three captures takes the poker chip.");
  const [over, setOver] = useState(false);
  const [air, setAir] = useState<{ r: number; c: number; jump: boolean } | null>(null);
  const [ghosts, setGhosts] = useState<{ id: number; r: number; c: number; you: boolean }[]>([]);
  const [clip, setClip] = useState<{ src: string; id: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [crownedSq, setCrownedSq] = useState<Sq | null>(null);
  const [capsShown, setCapsShown] = useState({ you: 0, cpu: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const busy = useRef(false);
  const paid = useRef(false);
  const done = useRef(false);
  const caps = useRef({ you: 0, cpu: 0 });
  const clipId = useRef(0);
  const ghostId = useRef(0);

  function finish(won: boolean) {
    if (done.current) return;
    done.current = true;
    setOver(true);
    setSelected(null);
    setLock(null);
    setNote(won ? "Three of theirs are gone. One poker chip." : "They took three of yours. No poker chip.");
    if (!paid.current) {
      paid.current = true;
      onEarn(won ? 1 : 0);
    }
  }

  function land(before: Board, next: Board, step: Step, then: () => void) {
    if (done.current) return;
    const piece = before[step.from.r]![step.from.c]!;
    if (crowned(piece, step)) {
      clipId.current += 1;
      setClip({ src: "/checkers-king.mp4", id: clipId.current });
      setCrownedSq({ r: step.to.r, c: step.to.c });
      window.setTimeout(() => setCrownedSq(null), 1250);
    } else if (step.cap) {
      clipId.current += 1;
      setClip({ src: "/checkers-take.mp4", id: clipId.current });
    }
    if (step.cap) {
      bankTick();
      setShake(true);
      window.setTimeout(() => setShake(false), 240);
      const taken = before[step.cap.r]![step.cap.c]!;
      if (piece > 0) caps.current.you += 1;
      else caps.current.cpu += 1;
      setCapsShown({ you: caps.current.you, cpu: caps.current.cpu });
      ghostId.current += 1;
      const id = ghostId.current;
      setGhosts((list) => [...list, { id, r: step.cap!.r, c: step.cap!.c, you: taken > 0 }]);
      window.setTimeout(() => setGhosts((list) => list.filter((ghost) => ghost.id !== id)), 420);
    }
    setAir({ r: step.to.r, c: step.to.c, jump: Boolean(step.cap) });
    setBoard(next);
    setTokens((current) => moveToken(current, step, next));
    if (caps.current.you >= 3 || caps.current.cpu >= 3) {
      window.setTimeout(() => finish(caps.current.you >= 3), 320);
      return;
    }
    window.setTimeout(() => {
      setAir(null);
      then();
    }, 320);
  }

  function runCpu(from: Board) {
    let turn = cpuTurn(from);
    if (nudged) {
      const options = turns(from, -1);
      if (options.length > 0) turn = options[Math.floor(Math.random() * options.length)] ?? null;
    }
    if (!turn) {
      busy.current = false;
      finish(true);
      return;
    }
    let cursor = from;
    const steps = turn.steps;
    const play = (index: number) => {
      if (done.current) return;
      const step = steps[index];
      if (!step) {
        busy.current = false;
        if (turns(cursor, 1).length === 0) finish(false);
        return;
      }
      const before = cursor;
      cursor = apply(cursor, step);
      const after = cursor;
      land(before, after, step, () => play(index + 1));
    };
    play(0);
  }

  function choose(r: number, c: number) {
    if (over || busy.current) return;
    const piece = board[r]![c]!;
    if (piece > 0) {
      if (lock && (lock.r !== r || lock.c !== c)) {
        setNote("That piece is still jumping.");
        return;
      }
      const mine = turns(board, 1).some((turn) => turn.steps[0]?.from.r === r && turn.steps[0]?.from.c === c);
      if (!mine) {
        setNote(turns(board, 1).some((turn) => turn.steps[0]?.cap) ? "That one cannot jump. You have to jump." : "That piece has no move.");
        if (!lock) setSelected(null);
        return;
      }
      setSelected({ r, c });
      return;
    }
    if (!selected) return;
    const turn = turns(board, 1).find(
      (item) => item.steps[0]?.from.r === selected.r && item.steps[0]?.from.c === selected.c && item.steps[0]?.to.r === r && item.steps[0]?.to.c === c,
    );
    if (!turn) return;
    const step = turn.steps[0]!;
    busy.current = true;
    const next = apply(board, step);
    land(board, next, step, () => {
      if (done.current) return;
      const more = jumpsFrom(next, step.to.r, step.to.c);
      const pieceNow = next[step.to.r]![step.to.c]!;
      if (step.cap && more.length && Math.abs(pieceNow) === Math.abs(board[step.from.r]![step.from.c]!)) {
        busy.current = false;
        setSelected(step.to);
        setLock(step.to);
        setNote("It can jump again. It has to.");
        return;
      }
      setSelected(null);
      setLock(null);
      if (turns(next, -1).length === 0) {
        busy.current = false;
        finish(true);
        return;
      }
      runCpu(next);
    });
  }

  const lands =
    selected === null
      ? []
      : turns(board, 1)
          .filter((turn) => turn.steps[0]?.from.r === selected.r && turn.steps[0]?.from.c === selected.c)
          .map((turn) => turn.steps[0]!.to);

  function point(event: React.PointerEvent) {
    const rect = boardRef.current?.getBoundingClientRect();
    const node = boardRef.current;
    if (!rect || !node) return { x: 0, y: 0 };
    const edge = getComputedStyle(node);
    const left = parseFloat(edge.borderLeftWidth) || 0;
    const top = parseFloat(edge.borderTopWidth) || 0;
    const right = parseFloat(edge.borderRightWidth) || 0;
    const bottom = parseFloat(edge.borderBottomWidth) || 0;
    return {
      x: ((event.clientX - rect.left - left) / (rect.width - left - right)) * 100,
      y: ((event.clientY - rect.top - top) / (rect.height - top - bottom)) * 100,
    };
  }

  function grab(event: React.PointerEvent<HTMLButtonElement>, token: Token) {
    if (over || busy.current || token.side < 0) return;
    if (lock && (lock.r !== token.r || lock.c !== token.c)) {
      setNote("That piece is still jumping.");
      return;
    }
    const mine = turns(board, 1).some((turn) => turn.steps[0]?.from.r === token.r && turn.steps[0]?.from.c === token.c);
    if (!mine) {
      setNote(turns(board, 1).some((turn) => turn.steps[0]?.cap) ? "That one cannot jump. You have to jump." : "That piece has no move.");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected({ r: token.r, c: token.c });
    const at = point(event);
    setDrag({ id: token.id, x: at.x, y: at.y });
  }

  function pull(event: React.PointerEvent) {
    if (!drag) return;
    const at = point(event);
    setDrag({ id: drag.id, x: at.x, y: at.y });
  }

  function drop(event: React.PointerEvent) {
    if (!drag) return;
    const at = point(event);
    setDrag(null);
    if (at.x < 0 || at.y < 0 || at.x > 100 || at.y > 100) return;
    const c = Math.min(7, Math.max(0, Math.floor(at.x / 12.5)));
    const r = Math.min(7, Math.max(0, Math.floor(at.y / 12.5)));
    const home = selected !== null && selected.r === r && selected.c === c;
    if (!lands.some((sq) => sq.r === r && sq.c === c)) {
      if (!home) setNote("That is not a move.");
      return;
    }
    choose(r, c);
  }

  return (
    <div className="felt">
      <style>{CHK_CSS}</style>
      {clip ? (
        <video key={clip.id} className="plate" src={clip.src} autoPlay muted playsInline onEnded={() => setClip(null)} />
      ) : (
        <img className="plate" src="/checkers.jpg" alt="" />
      )}
      <p className="chk-kicker">The long game</p>
      <p className="table-rule">{note}</p>
      <p className="table-end">
        Captures —{" "}
        <span key={`y${capsShown.you}`} className="chk-caps">
          you {capsShown.you}
        </span>{" "}
        ·{" "}
        <span key={`c${capsShown.cpu}`} className="chk-caps">
          them {capsShown.cpu}
        </span>{" "}
        · first to 3
      </p>
      <div
        ref={boardRef}
        className={`${selected ? "checkers live" : "checkers"}${shake ? " chk-shake" : ""}`}
        onPointerMove={pull}
        onPointerUp={drop}
      >
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 8 }, (_, c) => {
            const open = lands.some((sq) => sq.r === r && sq.c === c);
            return (
              <button
                key={`${r}${c}`}
                type="button"
                className={DARK(r, c) ? (open ? "sq dark land" : "sq dark") : "sq light"}
                onClick={() => choose(r, c)}
              />
            );
          }),
        )}
        {tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            className={`stone ${token.side > 0 ? "you" : "them"}${drag?.id === token.id ? " drag" : ""}${air?.r === token.r && air.c === token.c ? (air.jump ? " jump" : " air") : ""}${selected?.r === token.r && selected?.c === token.c ? " on" : ""}${crownedSq?.r === token.r && crownedSq?.c === token.c ? " chk-crowned" : ""}`}
            style={
              drag?.id === token.id
                ? { left: `${drag.x - 6.25}%`, top: `${drag.y - 6.25}%` }
                : { left: `${token.c * 12.5}%`, top: `${token.r * 12.5}%` }
            }
            onPointerDown={(event) => grab(event, token)}
            onPointerMove={pull}
            onPointerUp={drop}
            onClick={() => choose(token.r, token.c)}
          >
            <i className={token.king ? "king" : ""}>
              <b />
              {token.king ? <em /> : null}
            </i>
          </button>
        ))}
        {ghosts.map((ghost) => (
          <span key={ghost.id} className={`stone ghost ${ghost.you ? "you" : "them"}`} style={{ left: `${ghost.c * 12.5}%`, top: `${ghost.r * 12.5}%` }}>
            <i>
              <b />
            </i>
          </span>
        ))}
      </div>
    </div>
  );
}
