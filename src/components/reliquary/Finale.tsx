import { useState } from "react";
import { cardSnap, markSound } from "@/lib/reliquary/atmosphere";
import {
  deal,
  draw,
  isRed,
  isWon,
  moveToFoundation,
  moveToTableau,
  rankLabel,
  suitMark,
  type Card,
  type From,
  type Game,
} from "@/lib/reliquary/klondike";

/**
 * The last chair: a full 52-card Klondike at the Reliquary (square 29).
 * Draws three by default; the Heart boon cuts it to one. The Column boon
 * The Column boon lets a queen open an empty tableau column. The Undo
 * boon grants one take-back. Win all four foundations to go back
 * to the chair. Redeals are free — the run is already won or lost by now.
 */
export function Finale({
  boons,
  onWin,
  onClose,
}: {
  boons: string[];
  onWin: () => void;
  onClose: () => void;
}) {
  const queenOpens = boons.includes("column");
  const takeBack = boons.includes("undo");
  const drawCount = boons.includes("heart") ? 1 : 3;
  const [game, setGame] = useState<Game>(() => deal());
  const [selected, setSelected] = useState<From | null>(null);
  const [won, setWon] = useState(false);
  const [deals, setDeals] = useState(1);
  const [history, setHistory] = useState<Game[]>([]);
  const [usedUndo, setUsedUndo] = useState(false);

  const carried: string[] = [];
  if (boons.includes("heart")) carried.push("heart: draw one");
  if (queenOpens) carried.push("column: a queen opens an empty column");
  if (takeBack) carried.push("undo: one take-back");
  const foundations = game.foundations.reduce((total, pile) => total + pile.length, 0);

  function played(next: Game | null) {
    if (!next || won) return;
    cardSnap();
    if (takeBack && !usedUndo) setHistory((stack) => [...stack.slice(-4), game]);
    setGame(next);
    setSelected(null);
    if (isWon(next)) {
      markSound();
      setWon(true);
    }
  }

  function useTakeBack() {
    if (!takeBack || usedUndo || history.length === 0 || won) return;
    const previous = history[history.length - 1]!;
    setHistory([]);
    setUsedUndo(true);
    setGame(previous);
    setSelected(null);
    cardSnap();
  }

  function select(from: From) {
    if (won) return;
    if (selected && selected.kind === from.kind && JSON.stringify(selected) === JSON.stringify(from)) {
      const founded = moveToFoundation(game, from);
      if (founded) played(founded);
      else setSelected(null);
      return;
    }
    if (selected && from.kind === "tableau") {
      const next = moveToTableau(game, selected, from.col, queenOpens);
      if (next) {
        played(next);
        return;
      }
    }
    setSelected(from);
  }

  function redeal() {
    setGame(deal());
    setSelected(null);
    setDeals((value) => value + 1);
  }

  return (
    <div className="table one-col" role="dialog" aria-label="The last chair" onClick={(event) => event.stopPropagation()}>
      <p className="leaf-kicker">The reliquary</p>
      <h2>The last chair</h2>
      <p className="leaf-body">
        The same game as the first night. Draw {drawCount === 1 ? "one" : "three"}
        {carried.length > 0 ? ` — you carry ${carried.join(", ")}` : " — you carry nothing"}.
      </p>
      <div className="win-sol">
        <div className="win-table">
          <div className="win-top">
            <button
              type="button"
              className="win-pile"
              onClick={() => !won && played(draw(game, drawCount))}
              aria-label={`Draw ${drawCount}`}
            >
              {game.stock.length > 0 ? (
                <span className="card back" aria-label="Face-down card" />
              ) : (
                <span className="win-empty" />
              )}
            </button>
            <button
              type="button"
              className={selected?.kind === "waste" ? "win-pile chosen" : "win-pile"}
              onClick={() => game.waste.length > 0 && select({ kind: "waste" })}
            >
              {game.waste.length > 0 ? (
                <Face card={game.waste[game.waste.length - 1]!} />
              ) : (
                <span className="win-empty" />
              )}
            </button>
            <div className="win-gap" />
            {game.foundations.map((pile, index) => (
              <button
                key={index}
                type="button"
                className="win-pile"
                onClick={() => selected && played(moveToFoundation(game, selected))}
              >
                {pile.length > 0 ? <Face card={pile[pile.length - 1]!} /> : <span className="win-empty" />}
              </button>
            ))}
          </div>
          <div className="win-columns">
            {game.tableau.map((pile, col) => (
              <div key={col} className="win-col" onClick={() => selected && played(moveToTableau(game, selected, col))}>
                {pile.length === 0 && <span className="win-empty" />}
                {pile.map((card, index) => {
                  const on = selected?.kind === "tableau" && selected.col === col && selected.index === index;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className={on ? "win-card chosen" : "win-card"}
                      style={{ top: index * 28 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!card.up || won) return;
                        select({ kind: "tableau", col, index });
                      }}
                    >
                      {card.up ? <Face card={card} /> : <span className="card back" aria-label="Face-down card" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="leaf-body">
        {foundations} of 52 home · deal {deals}
      </p>
      {won ? (
        <>
          <p className="table-end">All four suits are home. The houses burn. Something is opening.</p>
          <div className="table-row">
            <button type="button" className="close-book go" onClick={onWin}>
              Open it
            </button>
          </div>
        </>
      ) : (
        <div className="table-row">
          <button type="button" className="close-book" onClick={redeal}>
            New deal
          </button>
          {takeBack && !usedUndo && (
            <button type="button" className="close-book" onClick={useTakeBack}>
              Take back
            </button>
          )}
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
        </div>
      )}
    </div>
  );
}

function Face({ card }: { card: Card }) {
  const red = isRed(card.suit);
  return (
    <span className={red ? "win-face red" : "win-face"}>
      <b>
        {rankLabel(card.rank)}
        {suitMark(card.suit)}
      </b>
      <i>{suitMark(card.suit)}</i>
    </span>
  );
}
