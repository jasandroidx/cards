import { useEffect, useRef, useState } from "react";
import { QUEEN_HAND, QUEEN_ROUNDS, QUEEN_THROW_ROUND, queenLegal, queenOutcome, queenPlay, queenStalled, startQueen, type QueenState } from "@/lib/reliquary/queen";
import { rankLabel, suitMark, isRed } from "@/lib/reliquary/klondike";

/** She remembers herself one round at a time. Victory is turning into horror. */
const QUEEN_STAGES = [
  "A finger moves. Silence screeches.",
  "The torso shudders. She is not alive, but she is remembering life.",
  "An eye socket appears. Darkness, given shape.",
  "The final card turns. Light floods the suit.",
];

export function Queen({ onWon, onLost, onClose, onFirstRound, glassWon }: { onWon: () => void; onLost: () => void; onClose: () => void; onFirstRound?: () => void; glassWon?: boolean }) {
  const [state, setState] = useState<QueenState>(() => startQueen());
  const [settled, setSettled] = useState(false);
  const [winShown, setWinShown] = useState(false);
  const winTimer = useRef<number>(0);
  const outcome = queenOutcome(state);

  // If she is closed mid-beat, the win still counts — only the reveal is skipped.
  const wonRef = useRef(false);
  useEffect(() => () => {
    if (winTimer.current) {
      window.clearTimeout(winTimer.current);
      winTimer.current = 0;
      if (wonRef.current) onWon();
    }
  }, []);

  function play(id: string) {
    if (settled) return;
    const card = state.mine.find((held) => held.id === id);
    if (!card) return;
    const next = queenPlay(state, card);
    setState(next);
    if (state.round === 0 && next.round === 1) onFirstRound?.();
    if (queenOutcome(next) === "won") {
      setSettled(true);
      wonRef.current = true;
      // The board stills. 800ms of silence before she speaks.
      winTimer.current = window.setTimeout(() => {
        winTimer.current = 0;
        wonRef.current = false;
        setWinShown(true);
        onWon();
      }, 800);
      return;
    }
    if (queenStalled(next)) {
      setSettled(true);
      onLost();
    }
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table" role="dialog" aria-label="The Queen" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">Square 28</p>
          <h2>Her coat</h2>
          <img className="plate" src="/queen.jpg" alt="The queen, face in shadow" />
          <p className="table-rule">{glassWon ? "She lays a card down. She has played you before." : "She lays a card down. Beat it. Four times, and she will try to take one out of your hand."}</p>

          {state.top && !settled && (
            <div className="lamp">
              <span className={`card ${isRed(state.top.suit) ? "red" : ""}`}>
                <b>{rankLabel(state.top.rank)}</b>
                <i>{suitMark(state.top.suit)}</i>
              </span>
              <span>
                Round {state.round + 1} of {QUEEN_ROUNDS}
              </span>
            </div>
          )}

          {state.thrown.length > 0 && <p className="table-rule">She has cast off {state.thrown.length}.</p>}

          {!settled && state.round > 0 && (
            <p className="table-rule"><em>{QUEEN_STAGES[state.round - 1]}</em></p>
          )}

          {!settled && (
            <div className="table-row" style={{ flexWrap: "wrap", gap: 4 }}>
              {state.mine.map((card) => {
                const legal = queenLegal(state).some((held) => held.id === card.id);
                return (
                  <button key={card.id} type="button" className="card-btn" disabled={!legal} onClick={() => play(card.id)}>
                    <span className={`card ${isRed(card.suit) ? "red " : ""}${card.rank === 1 ? "ace" : ""}`.trimEnd()}>
                      <b>{rankLabel(card.rank)}</b>
                      <i>{suitMark(card.suit)}</i>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {outcome === "won" && winShown && (
            <p className="table-end rite-in">
              The Queen has a face. "Dealer," she whispers, her voice a bell, "my world is free.
              But your debt must be paid."
            </p>
          )}
          {settled && outcome !== "won" && <p className="table-end">Nothing left to answer. Her face is still gone.</p>}

          <div className="table-row">
            <strong>
              {state.mine.length} of {QUEEN_HAND} left
            </strong>
            <button type="button" className="close-book" onClick={onClose}>
              Stand up
            </button>
          </div>
          {state.tried && <p className="leaf-body">She tried once, on round {QUEEN_THROW_ROUND}.</p>}
        </div>
      </div>
    </div>
  );
}