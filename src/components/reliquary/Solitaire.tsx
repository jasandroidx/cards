import { useEffect, useState } from "react";
import { armAtmosphere, fallSound, setAtmosphere } from "@/lib/reliquary/atmosphere";
import {
  deal,
  draw,
  isRed,
  moveToFoundation,
  moveToTableau,
  rankLabel,
  suitMark,
  type Card,
  type From,
  type Game,
} from "@/lib/reliquary/klondike";

export function Solitaire({ onFall }: { onFall: (cards: { rank: number; suit: string }[]) => void }) {
  const [game, setGame] = useState<Game>(() => deal());
  const [selected, setSelected] = useState<From | null>(null);
  const [moves, setMoves] = useState(0);
  const [falling, setFalling] = useState(false);
  const phase = falling ? 4 : moves < 3 ? 0 : moves < 5 ? 1 : moves < 7 ? 2 : 3;

  useEffect(() => {
    if (phase !== 3 || falling) return;
    const timer = window.setTimeout(() => setFalling(true), 700);
    return () => window.clearTimeout(timer);
  }, [phase, falling]);

  useEffect(() => {
    if (!falling) return;
    const timer = window.setTimeout(() => onFall(carried(game)), 6200);
    return () => window.clearTimeout(timer);
  }, [falling, onFall]);

  useEffect(() => {
    if (falling) fallSound();
    else setAtmosphere(phase);
  }, [phase, falling]);

  function played(next: Game | null) {
    if (!next) return;
    setGame(next);
    setSelected(null);
    setMoves((value) => value + 1);
  }

  function select(from: From) {
    if (selected && selected.kind === from.kind && JSON.stringify(selected) === JSON.stringify(from)) {
      const founded = moveToFoundation(game, from);
      if (founded) played(founded);
      else setSelected(null);
      return;
    }
    if (selected) {
      if (from.kind === "tableau") {
        const next = moveToTableau(game, selected, from.col);
        if (next) {
          played(next);
          return;
        }
      }
    }
    setSelected(from);
  }

  return (
    <div
      className={falling ? "win-sol falling" : `win-sol phase-${phase}`}
      onPointerDown={armAtmosphere}
    >
      <header className="win-bar">
        <span>Solitaire</span>
        <span className="win-menu">Game</span>
      </header>
      <div className="win-table">
        <div className="win-top">
          <button
            type="button"
            className="win-pile"
            onClick={() => {
              setGame(draw(game));
              setMoves((value) => value + 1);
            }}
            aria-label="Draw"
          >
            {game.stock.length > 0 ? <Back /> : <span className="win-empty" />}
          </button>
          <button
            type="button"
            className={selected?.kind === "waste" ? "win-pile chosen" : "win-pile"}
            onClick={() => game.waste.length > 0 && select({ kind: "waste" })}
          >
            {game.waste.length > 0 ? (
              <Face card={game.waste[game.waste.length - 1]!} wrong={phase >= 2 && moves % 2 === 0} />
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
              {pile.length > 0 ? <Face card={pile[pile.length - 1]!} wrong={false} /> : <span className="win-empty" />}
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
                      if (!card.up) return;
                      select({ kind: "tableau", col, index });
                    }}
                  >
                    {card.up ? <Face card={card} wrong={phase >= 1 && card.rank === 7 && card.suit === "spades"} /> : <Back />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="win-crack" />
      </div>
      {falling && <video className="fall-video" src="/fall.mp4" autoPlay muted playsInline />}
    </div>
  );
}

function carried(game: Game): { rank: number; suit: string }[] {
  const cards: { rank: number; suit: string }[] = [];
  for (const pile of game.tableau) {
    for (const card of pile) if (card.up) cards.push({ rank: card.rank, suit: card.suit });
  }
  for (const pile of game.foundations) {
    for (const card of pile) cards.push({ rank: card.rank, suit: card.suit });
  }
  const top = game.waste[game.waste.length - 1];
  if (top) cards.push({ rank: top.rank, suit: top.suit });
  return cards.slice(0, 10);
}

function Back() {
  return <span className="win-face back" />;
}

function Face({ card, wrong }: { card: Card; wrong: boolean }) {
  if (wrong) return <span className="win-face blank" />;
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
