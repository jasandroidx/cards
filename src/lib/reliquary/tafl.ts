/**
 * Hnefatafl engine — Tablut form, 9x9. Pure rules, no pixels.
 * The player is the defenders (king + 8 bone); the Queen is the attackers (16 iron).
 */
export type Piece = "K" | "D" | "A"; // king, defender, attacker
export type Board = (Piece | null)[][];
export type Sq = { r: number; c: number };
export type Move = { from: Sq; to: Sq };

export const N = 9;
export const THRONE: Sq = { r: 4, c: 4 };
export const DIRS = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

export function startBoard(): Board {
  const b: Board = Array.from({ length: N }, () => Array<Piece | null>(N).fill(null));
  b[4][4] = "K";
  for (const [r, c] of [[2, 4], [3, 4], [5, 4], [6, 4], [4, 2], [4, 3], [4, 5], [4, 6]]) b[r]![c!] = "D";
  for (const [r, c] of [
    [0, 3], [0, 4], [0, 5], [1, 4],
    [8, 3], [8, 4], [8, 5], [7, 4],
    [3, 0], [4, 0], [5, 0], [4, 1],
    [3, 8], [4, 8], [5, 8], [4, 7],
  ]) b[r]![c!] = "A";
  return b;
}

export const inBoard = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
export const isEdge = (s: Sq) => s.r === 0 || s.r === N - 1 || s.c === 0 || s.c === N - 1;
export const isThrone = (s: Sq) => s.r === THRONE.r && s.c === THRONE.c;
export const sideOf = (p: Piece): "def" | "att" => (p === "A" ? "att" : "def");

export function kingPos(b: Board): Sq | null {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r]![c!] === "K") return { r, c };
  return null;
}

/** Rook slides for one piece. Only the king may enter the throne. */
export function slides(b: Board, from: Sq): Sq[] {
  const piece = b[from.r]![from.c];
  if (!piece) return [];
  const out: Sq[] = [];
  for (const d of DIRS) {
    let r = from.r + d.r, c = from.c + d.c;
    while (inBoard(r, c) && !b[r]![c] && (piece === "K" || !isThrone({ r, c }))) {
      out.push({ r, c });
      r += d.r; c += d.c;
    }
  }
  return out;
}

export function allMoves(b: Board, side: "def" | "att"): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = b[r]![c];
    if (p && sideOf(p) === side) {
      for (const to of slides(b, { r, c })) moves.push({ from: { r, c }, to });
    }
  }
  return moves;
}

export interface Applied {
  board: Board;
  captured: number;      // defenders/attackers taken (not the king)
  kingTaken: boolean;
  escaped: boolean;
}

/** Apply a move and resolve custodian captures. */
export function applyMove(b: Board, m: Move): Applied {
  const nb: Board = b.map((row) => row.slice());
  const piece = nb[m.from.r]![m.from.c]!;
  nb[m.from.r]![m.from.c] = null;
  nb[m.to.r]![m.to.c] = piece;
  const mine = sideOf(piece);
  let captured = 0;
  let kingTaken = false;

  // The king walking off the edge wins at once.
  if (piece === "K" && isEdge(m.to)) return { board: nb, captured, kingTaken, escaped: true };

  for (const d of DIRS) {
    const nr = m.to.r + d.r, nc = m.to.c + d.c;
    if (!inBoard(nr, nc)) continue;
    const victim = nb[nr]![nc];
    if (!victim || sideOf(victim) === mine) continue;
    const br = nr + d.r, bc = nc + d.c;
    if (victim === "K") {
      // The king needs all four sides; the board's edge counts as iron.
      let covered = 0;
      for (const e of DIRS) {
        const kr = nr + e.r, kc = nc + e.c;
        if (!inBoard(kr, kc)) covered += 1;
        else if (nb[kr]![kc] === "A") covered += 1;
      }
      if (covered === 4) { nb[nr]![nc] = null; kingTaken = true; }
      continue;
    }
    const beyondEmptyThrone = inBoard(br, bc) && isThrone({ r: br, c: bc }) && !nb[br]![bc];
    const beyondFriend = inBoard(br, bc) && nb[br]![bc] !== null && sideOf(nb[br]![bc]!) === mine;
    if (beyondEmptyThrone || beyondFriend) { nb[nr]![nc] = null; captured += 1; }
  }
  return { board: nb, captured, kingTaken, escaped: false };
}

/** Fewest king-slides to any edge square. Infinity if the king is gone. */
export function escapeDist(b: Board): number {
  const k = kingPos(b);
  if (!k) return Infinity;
  if (isEdge(k)) return 0;
  const seen = new Set<string>([`${k.r},${k.c}`]);
  let frontier: Sq[] = [k];
  let dist = 0;
  while (frontier.length) {
    dist += 1;
    const next: Sq[] = [];
    for (const s of frontier) {
      for (const t of slides(b, s)) {
        const key = `${t.r},${t.c}`;
        if (seen.has(key)) continue;
        if (isEdge(t)) return dist;
        seen.add(key);
        next.push(t);
      }
    }
    frontier = next;
    if (dist > 12) return Infinity;
  }
  return Infinity;
}

/**
 * The Queen plays one page of rules: she hunts the king, takes what is
 * offered, and leans on his roads out. Cunning, not perfect.
 */
export function queenMove(b: Board): Move | null {
  const k = kingPos(b);
  const moves = allMoves(b, "att");
  if (!moves.length) return null;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const res = applyMove(b, m);
    let s = Math.random() * 6;
    if (res.kingTaken) s += 100000;
    s += res.captured * 140;
    if (k) {
      // Lean on his roads out.
      const before = escapeDist(b);
      const after = escapeDist(res.board);
      if (after !== before) {
        if (after === Infinity) s += 400; // the road closed entirely
        else if (before === Infinity) s -= 400; // a road opened — bad
        else s += (before - after) * 40;
      }
      // Crowd him.
      const dk = Math.abs(m.to.r - k.r) + Math.abs(m.to.c - k.c);
      s += (18 - Math.min(dk, 18)) * 2;
      // Stand next to him — a threat, or a mistake she will make.
      for (const d of DIRS) {
        const ar = m.to.r + d.r, ac = m.to.c + d.c;
        if (ar === k.r && ac === k.c) s += 30;
      }
    }
    // Do not hang iron: a square between two bone is a grave.
    let bone = 0;
    for (const d of DIRS) {
      const ar = m.to.r + d.r, ac = m.to.c + d.c;
      if (inBoard(ar, ac) && res.board[ar]![ac] === "D") bone += 1;
    }
    s -= bone * bone * 10;
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

