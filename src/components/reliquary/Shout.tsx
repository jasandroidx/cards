import { useEffect, useRef, useState } from "react";
import {
  canShout,
  shoutAnswer,
  shoutCleared,
  shoutMiss,
  shoutRankLabel,
  startShout,
  SHOUT_MARKS,
  SHOUT_WAVES,
  type ShoutBout,
  type ShoutCard,
} from "@/lib/reliquary/shout";

const TIDE_MS = 7600;
const GATE = 68;

export function Shout({
  onLose,
  onClear,
  onClose,
}: {
  onLose: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [bout, setBout] = useState<ShoutBout>(() => startShout());
  const [answer, setAnswer] = useState<string | null>(null);
  const [tide, setTide] = useState(0);
  const [gone, setGone] = useState(0);
  const [line, setLine] = useState("Four colors. Same color, or the next rank. Throw before it reaches the middle.");

  const onLoseRef = useRef(onLose);
  onLoseRef.current = onLose;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const threat = bout.lane[0];

  useEffect(() => {
    if (bout.done) {
      if (shoutCleared(bout)) {
        setLine("You reach the far side. Behind you the Heart house is burning.");
        onClearRef.current();
      } else {
        setLine("The current takes the rest. You keep what you carried, and no more than that.");
      }
      return;
    }
    if (answer) {
      const next = shoutAnswer(bout, answer);
      setAnswer(null);
      setTide(0);
      setLine("The current takes it and keeps going.");
      setBout(next);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const now = (Date.now() - started) / TIDE_MS;
      if (now < 1) {
        setTide(now);
        return;
      }
      window.clearInterval(timer);
      onLoseRef.current();
      setGone((value) => value + 1);
      setLine("A card goes under. You do not hear where it lands.");
      setBout(shoutMiss(bout));
    }, 40);
    return () => window.clearInterval(timer);
  }, [bout, answer]);

  function throwCard(card: ShoutCard) {
    if (answer || bout.done || !threat || !canShout(card, threat)) return;
    setAnswer(card.id);
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div
        className="table one-col shout"
        role="dialog"
        aria-label="The river"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="table-top">
          <p className="leaf-kicker">The River</p>
          <h2>The Shout</h2>
          <p className="table-rule">
            Cards race the current in four ugly colors. Throw a match before one arrives: same color, or the next
            rank. Miss, and the river takes a card from the hand you fell with.
          </p>
          <img className="plate" src="/shout.jpg" alt="" />

          <div className="shout-lane">
            <span className="shout-gate" style={{ left: `${GATE}%` }} />
            {bout.lane.map((card, index) => (
              <span
                key={card.id}
                className={`shout-card ${card.suit}`}
                style={{
                  left: `${index === 0 ? tide * GATE : GATE + 5 + (index - 1) * 12}%`,
                  opacity: index === 0 ? 1 : 0.62 - index * 0.18,
                }}
              >
                <b>{shoutRankLabel(card.rank)}</b>
                <i>{SHOUT_MARKS[card.suit]}</i>
              </span>
            ))}
          </div>

          <div className="shout-tide">
            <span style={{ width: `${Math.round(tide * 100)}%` }} />
          </div>

          <div className="table-row">
            {bout.hand.map((card) => {
              const legal = Boolean(threat) && !bout.done && !answer && canShout(card, threat!);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`shout-hand ${card.suit}${legal ? " legal" : ""}`}
                  disabled={!legal}
                  onClick={() => throwCard(card)}
                >
                  <b>{shoutRankLabel(card.rank)}</b>
                  <i>{SHOUT_MARKS[card.suit]}</i>
                </button>
              );
            })}
          </div>

          <p className="table-end">
            {bout.passed} of {SHOUT_WAVES} shouted back. {gone === 0 ? "Nothing lost yet." : `The river has ${gone}.`}
          </p>
          <p className="table-rule">{line}</p>

          <button type="button" className="close-book" onClick={onClose}>
            {bout.done ? "Step out" : "Give it up"}
          </button>
        </div>
      </div>
    </div>
  );
}