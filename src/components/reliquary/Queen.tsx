import { useState } from "react";
import { QUEEN_HAND, QUEEN_ROUNDS, QUEEN_THROW_ROUND, queenLegal, queenOutcome, queenPlay, queenStalled, startQueen, type QueenState } from "@/lib/reliquary/queen";
import { rankLabel, suitMark, isRed } from "@/lib/reliquary/klondike";

export function Queen({ onWon, onLost, onClose }: { onWon: () => void; onLost: () => void; onClose: () => void }) {
  const [state, setState] = useState<QueenState>(() => startQueen());
  const [settled, setSettled] = useState(false);
  const outcome = queenOutcome(state);

  function play(id: string) {
    if (settled) return;
    const card = state.mine.find((held) => held.id === id);
    if (!card) return;
    const next = queenPlay(state, card);
    setState(next);
    if (queenOutcome(next) === "won") {
      setSettled(true);
      onWon();
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
          <p className="table-rule">She lays a card down. Beat it. Four times, and she will try to take one out of your hand.</p>

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

          {!settled && (
            <div className="table-row" style={{ flexWrap: "wrap", gap: 4 }}>
              {state.mine.map((card) => {
                const legal = queenLegal(state).some((held) => held.id === card.id);
                return (
                  <button key={card.id} type="button" className="card-btn" disabled={!legal} onClick={() => play(card.id)}>
                    <span className={`card ${isRed(card.suit) ? "red" : ""}`}>
                      <b>{rankLabel(card.rank)}</b>
                      <i>{suitMark(card.suit)}</i>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {outcome === "won" && <p className="table-end">You beat her {QUEEN_ROUNDS} times. There is a face on her now.</p>}
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