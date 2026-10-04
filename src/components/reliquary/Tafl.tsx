import { useEffect, useRef, useState } from "react";
import {
  N, THRONE, applyMove, isEdge, isThrone, queenMove, sideOf, slides, startBoard,
  type Board, type Piece, type Sq,
} from "@/lib/reliquary/tafl";

/**
 * Hnefatafl — the glass game. Played through the cell's scrying glass against
 * the Queen. Tablut form, 9x9: the player is thirteen bone (king + defenders),
 * she is sixteen iron. Walk the king off the edge of the world.
 *
 * Contract: Tafl({ onEarn, onClose }). onEarn fires exactly once (1 on win,
 * 0 on loss). No in-place restart — close and reopen for a new game.
 */

const PIECE_LABEL: Record<Piece, string> = { K: "the king", D: "bone", A: "iron" };

export function Tafl({ onEarn, onClose }: { onEarn: (n: number) => void; onClose: () => void }) {
  const [board, setBoard] = useState<Board>(startBoard);
  const [stage, setStage] = useState<"intro" | "rules" | "game">("intro");
  const [selected, setSelected] = useState<Sq | null>(null);
  const [turn, setTurn] = useState<"you" | "her">("her");
  const [over, setOver] = useState<"won" | "lost" | null>(null);
  const [note, setNote] = useState("Through the glass, a board etched in frost. Thirteen bone against sixteen iron. She moves first. She is looking back.");
  const [lastMove, setLastMove] = useState<{ from: Sq; to: Sq; her: boolean } | null>(null);
  const paid = useRef(false);
  const done = useRef(false);
  const busy = useRef(false);

  function finish(result: "won" | "lost") {
    if (done.current) return;
    done.current = true;
    setOver(result);
    setSelected(null);
    setNote(
      result === "won"
        ? "The king walks off the edge of the world. One poker chip. She will remember this."
        : "The king is taken. Sixteen iron close over bone. No poker chip. She remembers."
    );
    if (!paid.current) {
      paid.current = true;
      onEarn(result === "won" ? 1 : 0);
    }
  }

  function herTurn(b: Board) {
    if (done.current) return;
    busy.current = true;
    window.setTimeout(() => {
      const m = queenMove(b);
      busy.current = false;
      if (!m) { finish("won"); return; } // she has no moves — the road is open
      const res = applyMove(b, m);
      setBoard(res.board);
      setLastMove({ from: m.from, to: m.to, her: true });
      if (res.kingTaken) { finish("lost"); return; }
      if (res.escaped) { finish("won"); return; }
      setNote(
        res.captured > 0
          ? `She takes ${res.captured === 1 ? "a bone" : `${res.captured} bone`}. The frost spreads.`
          : "She moves. The iron tightens."
      );
      setTurn("you");
    }, 650);
  }

  // She moves first, once, after the rules are read.
  useEffect(() => {
    if (stage !== "game") return;
    const id = window.setTimeout(() => herTurn(startBoard()), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function tap(sq: Sq) {
    if (over || busy.current || turn !== "you") return;
    const piece = board[sq.r]![sq.c];
    if (selected && selected.r === sq.r && selected.c === sq.c) { setSelected(null); return; }
    if (piece && sideOf(piece) === "def") { setSelected(sq); return; }
    if (selected) {
      const legal = slides(board, selected).some((t) => t.r === sq.r && t.c === sq.c);
      if (!legal) { setSelected(piece && sideOf(piece) === "def" ? sq : null); return; }
      const res = applyMove(board, { from: selected, to: sq });
      setBoard(res.board);
      setSelected(null);
      setLastMove({ from: selected, to: sq, her: false });
      if (res.escaped) { finish("won"); return; }
      if (res.kingTaken) { finish("lost"); return; }
      setNote(
        res.captured > 0
          ? `Bone takes iron. ${res.captured === 1 ? "One" : res.captured} of hers, gone.`
          : "Bone slides. The king is still breathing."
      );
      setTurn("her");
      herTurn(res.board);
      return;
    }
  }

  const legalTargets = selected ? slides(board, selected) : [];
  const isTarget = (r: number, c: number) => legalTargets.some((t) => t.r === r && t.c === c);
  const isLast = (r: number, c: number) =>
    !!lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c));

  return (
    <div className="journal-back" onClick={over ? onClose : undefined}>
      <div className="table tafl-table" role="dialog" aria-label="Hnefatafl through the glass" onClick={(e) => e.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">Through the glass</p>
          <h2>The glass game</h2>
          {stage === "intro" && (
            <>
              <img className="plate" src="/plates/hnefatafl-court.jpg" alt="Her court: dark iron figures closing in on the bone king" />
              <p className="table-rule">Through the glass: her court. Sixteen iron around one bone king. She is looking back.</p>
              <div className="table-row">
                <span />
                <button type="button" className="book-btn" onClick={() => setStage("rules")}>
                  Begin
                </button>
              </div>
            </>
          )}
          {stage === "rules" && (
            <div className="tafl-rules">
              <div className="tafl-rules-text">
                <p className="table-rule">The king on the throne. Eight bone around him. Sixteen iron at the edges.</p>
                <p className="table-rule">Everything moves straight, as far as it likes. Iron dies sandwiched between bone. The king dies ringed on all four sides — the world's edge counts as iron.</p>
                <p className="table-rule">Walk him off the edge of the world.</p>
                <div className="table-row">
                  <span />
                  <button type="button" className="book-btn" onClick={() => setStage("game")}>
                    To the board
                  </button>
                </div>
              </div>
            </div>
          )}
          {stage === "game" && (
            <p className="table-rule">Thirteen bone. Sixteen iron. Walk the king off the edge of the world.</p>
          )}
        </div>
        {stage === "game" && (
          <>
        <div
          className="tafl-board"
          role="grid"
          aria-label="Hnefatafl board"
          style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
        >
          {board.map((row, r) =>
            row.map((piece, c) => {
              const sel = selected?.r === r && selected?.c === c;
              const target = isTarget(r, c);
              const last = isLast(r, c);
              const throne = isThrone({ r, c });
              const edge = isEdge({ r, c });
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  role="gridcell"
                  aria-label={piece ? `${PIECE_LABEL[piece]} at ${r + 1}, ${c + 1}` : `empty ${r + 1}, ${c + 1}`}
                  className={`tafl-sq${throne ? " throne" : ""}${edge ? " edge" : ""}${sel ? " sel" : ""}${target ? " target" : ""}${last ? " last" : ""}`}
                  onClick={() => tap({ r, c })}
                  disabled={!!over}
                >
                  {piece && (
                    <span className={`tafl-piece ${piece === "A" ? "iron" : "bone"}${piece === "K" ? " king" : ""}`} />
                  )}
                  {target && !piece && <span className="tafl-dot" />}
                </button>
              );
            })
          )}
        </div>
        <p className="table-rule"><em>{note}</em></p>
        <div className="table-row">
          <strong>{turn === "you" && !over ? "Your move" : over ? (over === "won" ? "He is out" : "He is taken") : "She moves"}</strong>
          <button type="button" className="close-book" onClick={onClose}>
            {over ? "Leave" : "Step back"}
          </button>
        </div>
            </>
          )}
      </div>
    </div>
  );
}
