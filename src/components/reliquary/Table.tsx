import { useEffect, useRef, useState } from "react";
import {
  beats,
  canCut,
  canPlay,
  cutMarks,
  isSour,
  marksFor,
  nextGate,
  rankLabel,
  shuffleDeck,
  type Card,
  type Gate,
  type Mode,
} from "@/lib/reliquary/sitting";
import { Box } from "@/components/reliquary/Box";
import { Farkle, GoFish, LiarsDice } from "@/components/reliquary/Quick";
import { mawApproach } from "@/lib/reliquary/death";
import { MAX_LIGHT } from "@/lib/reliquary/light";
import { Darts, Four } from "@/components/reliquary/Sides";
import { Blackjack } from "@/components/reliquary/Blackjack";
import { Dominoes } from "@/components/reliquary/Dominoes";
import { Checkers } from "@/components/reliquary/Checkers";
import { drawSurprise, type Surprise } from "@/lib/reliquary/surprise";
import { cardSnap, wrongSound } from "@/lib/reliquary/atmosphere";

const COPY: Record<Mode, { kicker: string; title: string; rule: string }> = {
  lamp: {
    kicker: "The hall",
    title: "The lamp",
    rule: "Play onto the pile. Match the suit, match the number, or play one higher. Four cards earns a mark. A mark is this place agreeing to let you through.",
  },
  cut: {
    kicker: "The chapel",
    title: "The cut",
    rule: "Only the next rank up, or a higher card of the same suit. Harder than the lamp. It pays better.",
  },
  bid: {
    kicker: "The bridge",
    title: "The bid",
    rule: "Name how many you will make. Then play them by the cut. Miss the bid and the river pays nothing.",
  },
  maw: {
    kicker: "In the road",
    title: "The Maw",
    rule: "It loves poker chips. Bring one, or don't come close. Five tricks. Beat its card with a higher one. An ace is high. Win three, and it moves. Lose, and it takes a mark.",
  },
};

export function Table({
  mode,
  marks,
  displayMarks,
  owned,
  mawBeaten,
  pocket,
  light,
  onEarn,
  onBuy,
  onSpendBlank,
  hasBlank,
  onMaw,
  onBid,
  onSat,
  onKeep,
  onOfferTribute,
  onBurn,
  onForfeit,
  onDeath,
  onClose,
}: {
  mode: Mode;
  marks: number;
  displayMarks: number;
  owned: string[];
  mawBeaten: boolean;
  pocket: string[];
  light: number;
  onEarn: (amount: number) => void;
  onBuy: (gate: Gate) => void;
  onSpendBlank?: (gate: Gate) => void;
  hasBlank?: boolean;
  onMaw: (won: boolean) => void;
  onBid?: (made: boolean) => void;
  onSat?: () => void;
  onKeep?: (kind: string) => void;
  onOfferTribute: () => void;
  onBurn: (n: number) => void;
  onForfeit: () => void;
  onDeath: () => void;
  onClose: () => void;
}) {
  const copy = COPY[mode];
  const gate = nextGate(owned, mawBeaten);
  const afford = gate ? marks >= gate.cost : false;
  const [jolt, setJolt] = useState(false);
  function joltTable() {
    setJolt(true);
    window.setTimeout(() => setJolt(false), 450);
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className={jolt ? "table jolt" : "table"} role="dialog" aria-label={copy.title} onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">{copy.kicker}</p>
          <h2>{copy.title}</h2>
          <p className="table-rule">{copy.rule}</p>
          {mode === "bid" ? (
            <Bid onEarn={onEarn} onBid={onBid} />
          ) : mode === "maw" ? (
            <MawApproach
              pocket={pocket}
              mawBeaten={mawBeaten}
              light={light}
              onEarn={onEarn}
              onMaw={onMaw}
              onOfferTribute={onOfferTribute}
              onBurn={onBurn}
              onForfeit={onForfeit}
              onDeath={onDeath}
              onClose={onClose}
            />
          ) : mode === "lamp" ? (
            <HallSeat onEarn={onEarn} onSat={onSat} onKeep={onKeep} />
          ) : (
            <Sequence mode={mode} onEarn={onEarn} onSour={joltTable} />
          )}
          <div className="table-row">
            <strong>{displayMarks} marks</strong>
            <button type="button" className="close-book" onClick={onClose}>
              Stand up
            </button>
          </div>
        </div>
        <div className="table-shop">
          <p className="leaf-kicker">The road</p>
          {gate ? (
            <>
              <h3>{gate.name}</h3>
              <p>
                You have {marks}. {gate.opens} stays shut until you pay {gate.cost} {gate.cost === 1 ? "mark" : "marks"}.
              </p>
              <button type="button" className="close-book go" disabled={!afford} onClick={() => onBuy(gate)}>
                {afford ? "Buy it" : "Not enough"}
              </button>
              {hasBlank && (
                <button type="button" className="close-book go" onClick={() => onSpendBlank?.(gate)}>
                  Give the blank card
                </button>
              )}
            </>
          ) : mawBeaten ? (
            <p>The road is open. The reliquary will take you.</p>
          ) : (
            <p>Past the yard, something is in the road. It loves poker chips. Marks will not move it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HallSeat({ onEarn, onSat, onKeep }: { onEarn: (n: number) => void; onSat?: () => void; onKeep?: (kind: string) => void }) {
  const [surprise] = useState<Surprise>(() => drawSurprise());
  const [game, setGame] = useState<"pick" | "hand" | "box" | "fish" | "darts" | "four" | "checkers" | "liars" | "farkle" | "blackjack" | "dominoes">("pick");
  const [out, setOut] = useState(false);
  const died = useRef(false);
  const counted = useRef(false);

  function pay(n: number) {
    if (!counted.current) {
      counted.current = true;
      onSat?.();
    }
    onEarn(surprise.kind === "gift" && n > 0 ? n + 1 : n);
    if (n > 0 && (game === "fish" || game === "darts" || game === "four" || game === "checkers" || game === "liars" || game === "farkle" || game === "blackjack" || game === "dominoes")) onKeep?.(game);
  }

  function snuff() {
    if (died.current) return;
    died.current = true;
    setOut(true);
    pay(-1);
  }

  if (out) {
    return <p className="table-end">The lamp went out. The hand is gone, and it took a mark.</p>;
  }

  return (
    <>
      {surprise.kind === "voice" && <p className="table-rule">{surprise.line}</p>}
      {surprise.kind === "gift" && game !== "pick" && (
        <p className="table-rule">The room is paying one extra. Don't ask it why.</p>
      )}
      {surprise.kind === "wick" && game !== "pick" && <Wick seconds={surprise.seconds} onOut={snuff} />}
      {game === "pick" && (
        <>
          <p className="table-rule">Cards, dice, darts, and a board. Win and you keep a piece of it. The liar plays for a poker chip.</p>
          <div className="table-row">
            <button type="button" className="close-book go" onClick={() => setGame("hand")}>
              The hand
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("box")}>
              The box
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("fish")}>
              Go Fish
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("darts")}>
              Darts
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("four")}>
              Four in a row
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("checkers")}>
              Checkers
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("liars")}>
              Liar's dice
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("farkle")}>
              Farkle
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("blackjack")}>
              Blackjack
            </button>
            <button type="button" className="close-book go" onClick={() => setGame("dominoes")}>
              Dominoes
            </button>
          </div>
        </>
      )}
      {game === "hand" && <Sequence mode="lamp" onEarn={pay} />}
      {game === "box" && <Box onEarn={pay} />}
      {game === "fish" && <GoFish onEarn={pay} />}
      {game === "darts" && <Darts onEarn={pay} />}
      {game === "four" && <Four onEarn={pay} />}
      {game === "checkers" && <Checkers onEarn={pay} />}
      {game === "liars" && <LiarsDice onEarn={pay} />}
      {game === "farkle" && <Farkle onEarn={pay} />}
      {game === "blackjack" && <Blackjack onEarn={pay} />}
      {game === "dominoes" && <Dominoes onEarn={pay} />}
    </>
  );
}

function Wick({ seconds, onOut }: { seconds: number; onOut: () => void }) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          if (!done.current) {
            done.current = true;
            onOut();
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onOut]);

  return (
    <div className="wick-wrap" aria-label={`${left} seconds`}>
      <div className="wick" style={{ width: `${(left / seconds) * 100}%` }} />
      <span>{left}</span>
    </div>
  );
}

function Sequence({ mode, onEarn, onSour }: { mode: "lamp" | "cut"; onEarn: (n: number) => void; onSour?: () => void }) {
  const legal = mode === "cut" ? canCut : canPlay;
  const pay = mode === "cut" ? cutMarks : marksFor;
  const [sitting, setSitting] = useState(() => {
    const deck = shuffleDeck();
    return {
      deck: deck.slice(3),
      hand: deck.slice(0, 3),
      top: null as Card | null,
      played: 0,
      done: false,
      payout: 0,
      sour: false,
    };
  });

  function play(card: Card) {
    if (sitting.done || !legal(card, sitting.top)) return;
    cardSnap();
    const hand = sitting.hand.filter((item) => item.id !== card.id);
    const deck = sitting.deck.slice();
    if (deck.length > 0 && hand.length < 3) hand.push(deck.shift()!);
    const played = sitting.played + 1;
    if (mode === "lamp" && isSour(card)) {
      wrongSound();
      onSour?.();
      onEarn(-1);
      setSitting({ deck, hand, top: card, played, done: true, payout: -1, sour: true });
      return;
    }
    const done = hand.length === 0 || hand.every((item) => !legal(item, card));
    const payout = done ? pay(played) : 0;
    if (done) onEarn(payout);
    setSitting({ deck, hand, top: card, played, done, payout, sour: false });
  }

  return (
    <>
      <div className="felt">
        <img className="plate" src="/hand.jpg" alt="" />
        <div className="lamp">
          {sitting.top ? (
            <div key={sitting.top.id} className="deal-wrap">
              <CardFace card={sitting.top} />
            </div>
          ) : (
            <div className="card empty">Lamp</div>
          )}
          <span>
            {sitting.played} played · {sitting.deck.length} left
          </span>
        </div>
        <Hand cards={sitting.hand} legal={(card) => !sitting.done && legal(card, sitting.top)} onPlay={play} />
      </div>
      {sitting.done && (
        <End
          payout={sitting.payout}
          sour={sitting.sour}
          again={() => {
            const deck = shuffleDeck();
            setSitting({ deck: deck.slice(3), hand: deck.slice(0, 3), top: null, played: 0, done: false, payout: 0, sour: false });
          }}
        />
      )}
    </>
  );
}

function Bid({ onEarn, onBid }: { onEarn: (n: number) => void; onBid?: (made: boolean) => void }) {
  const [cards, setCards] = useState<Card[]>(() => shuffleDeck().slice(0, 5));
  const [bid, setBid] = useState<number | null>(null);
  const [top, setTop] = useState<Card | null>(null);
  const [played, setPlayed] = useState(0);
  const [left, setLeft] = useState<Card[]>([]);
  const [done, setDone] = useState(false);
  const [payout, setPayout] = useState(0);

  function choose(n: number) {
    setBid(n);
    setLeft(cards);
  }

  function play(card: Card) {
    if (done || bid === null || !canCut(card, top)) return;
    cardSnap();
    const hand = left.filter((item) => item.id !== card.id);
    const count = played + 1;
    const finished = hand.length === 0 || hand.every((item) => !canCut(item, card));
    const earned = finished ? (count >= bid ? bid : 0) : 0;
    if (finished) {
      onEarn(earned);
      onBid?.(count >= bid);
    }
    setLeft(hand);
    setTop(card);
    setPlayed(count);
    setDone(finished);
    setPayout(earned);
  }

  if (bid === null) {
    return (
      <div className="felt">
        <Hand cards={cards} legal={() => false} onPlay={() => {}} />
        <div className="table-row">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" className="close-book go" onClick={() => choose(n)}>
              Bid {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="felt">
        <div className="lamp">
          {top ? <CardFace card={top} /> : <div className="card empty">Bid {bid}</div>}
          <span>
            {played} of {bid}
          </span>
        </div>
        <Hand cards={left} legal={(card) => !done && canCut(card, top)} onPlay={play} />
      </div>
      {done && (
        <End
          payout={payout}
          again={() => {
            setCards(shuffleDeck().slice(0, 5));
            setBid(null);
            setTop(null);
            setPlayed(0);
            setLeft([]);
            setDone(false);
            setPayout(0);
          }}
        />
      )}
    </>
  );
}

function MawApproach({
  pocket,
  mawBeaten,
  light,
  onEarn,
  onMaw,
  onOfferTribute,
  onBurn,
  onForfeit,
  onDeath,
  onClose,
}: {
  pocket: string[];
  mawBeaten: boolean;
  light: number;
  onEarn: (n: number) => void;
  onMaw: (won: boolean) => void;
  onOfferTribute: () => void;
  onBurn: (n: number) => void;
  onForfeit: () => void;
  onDeath: () => void;
  onClose: () => void;
}) {
  const [dealt, setDealt] = useState(false);
  if (mawBeaten) return <p className="table-end">It moved. The road past it is open.</p>;
  if (dealt) return <Maw onEarn={onEarn} onMaw={onMaw} light={light} onBurn={onBurn} onForfeit={onForfeit} />;
  if (mawApproach(pocket) === "plays") {
    return (
      <>
        <p className="table-rule">
          Flesh of cards. Bone of dice. The Maw. It was the Queen's royal guard, before the rot took
          its face. It does not want marks — it wants the ante. You hold the poker chip out. It takes
          it gently, for something with that many teeth. Your candle: {light > 0 ? `${light} wax` : "out"}. It burns
          one a trick.
        </p>
        <div className="table-row">
          <button
            type="button"
            className="close-book go"
            onClick={() => {
              onOfferTribute();
              setDealt(true);
            }}
          >
            Let it deal
          </button>
          <button type="button" className="close-book" onClick={onClose}>
            Step back
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <p className="table-rule">
        It is hungry. Your pocket holds no poker chip. Step closer and it will eat you — the marks,
        the road, everything you carried, gone.
      </p>
      <div className="table-row">
        <button type="button" className="close-book go" onClick={onDeath}>
          Step closer
        </button>
        <button type="button" className="close-book" onClick={onClose}>
          Step back
        </button>
      </div>
    </>
  );
}

function Maw({
  onEarn,
  onMaw,
  light,
  onBurn,
  onForfeit,
}: {
  onEarn: (n: number) => void;
  onMaw: (won: boolean) => void;
  light: number;
  onBurn: (n: number) => void;
  onForfeit: () => void;
}) {
  const [state, setState] = useState(() => openTrick(shuffleDeck(), 1, 0));
  const [wax, setWax] = useState(light);
  const forfeited = useRef(false);

  function play(card: Card) {
    if (state.done || !state.threat || !beats(card, state.threat)) return;
    advance(true, card);
  }

  function give() {
    if (state.done) return;
    advance(false, state.threat);
  }

  function advance(took: boolean, shown: Card | null) {
    if (forfeited.current) return;
    const won = state.won + (took ? 1 : 0);
    const waxLeft = Math.max(0, wax - 1);
    setWax(waxLeft);
    onBurn(1);
    if (state.trick >= 5) {
      const passed = won >= 3;
      onEarn(passed ? 3 : 0);
      onMaw(passed);
      setState({ ...state, hand: state.hand.filter((c) => c.id !== (took ? shown?.id : "")), threat: state.threat, won, done: true, passed });
      return;
    }
    if (waxLeft <= 0 && won < 3) {
      forfeited.current = true;
      setState({ ...state, won, done: true, passed: false });
      onForfeit();
      return;
    }
    const deck = state.deck.slice();
    const next = openTrick(deck, state.trick + 1, won);
    setState(next);
  }

  return (
    <>
      <div className="felt">
        <div className="lamp">
          {state.threat ? <CardFace card={state.threat} /> : <div className="card empty">Still</div>}
          <span>
            Trick {Math.min(state.trick, 5)} of 5 · {state.won} won · candle {"●".repeat(wax)}{"○".repeat(Math.max(0, MAX_LIGHT - wax))}
          </span>
        </div>
        <Hand cards={state.hand} legal={(card) => !state.done && !!state.threat && beats(card, state.threat)} onPlay={play} />
        {!state.done && state.hand.every((card) => !state.threat || !beats(card, state.threat)) && (
          <button type="button" className="close-book" onClick={give}>
            It takes the trick
          </button>
        )}
      </div>
      {state.done && (
        <p className="table-end">
          {forfeited.current
            ? "The candle gutters. It loses interest."
            : state.passed
              ? "It moves. Three marks, and the road past it can be bought."
              : "It does not move."}
        </p>
      )}
    </>
  );
}

function openTrick(deck: Card[], trick: number, won: number) {
  const rest = deck.slice();
  const threat = rest.shift() ?? null;
  const hand: Card[] = [];
  while (hand.length < 3 && rest.length > 0) hand.push(rest.shift()!);
  return { deck: rest, hand, threat, trick, won, done: false, passed: false };
}

function End({ payout, again, sour = false }: { payout: number; again: () => void; sour?: boolean }) {
  return (
    <div className="table-row">
      <p className="table-end">
        {sour ? "The seven of spades. The lamp puts the hand out." : payout === 0 ? "Nothing for the purse." : `${payout} mark${payout === 1 ? "" : "s"}.`}
      </p>
      <button type="button" className="close-book go" onClick={again}>
        Deal again
      </button>
    </div>
  );
}

function Hand({ cards, legal, onPlay }: { cards: Card[]; legal: (card: Card) => boolean; onPlay: (card: Card) => void }) {
  return (
    <div className="hand">
      {cards.map((card, index) => {
        const ok = legal(card);
        return (
          <button
            key={card.id}
            type="button"
            className="card-btn deal-wrap"
            style={{ animationDelay: `${index * 80}ms` }}
            disabled={!ok}
            onClick={() => onPlay(card)}
          >
            <CardFace card={card} />
          </button>
        );
      })}
    </div>
  );
}

function CardFace({ card }: { card: Card }) {
  const red = card.suit === "hearts";
  const ace = card.rank === 1;
  return (
    <span className={red ? (ace ? "card red ace" : "card red") : ace ? "card ace" : "card"}>
      <b>{rankLabel(card.rank)}</b>
      <i>{red ? "♥" : "♠"}</i>
    </span>
  );
}
