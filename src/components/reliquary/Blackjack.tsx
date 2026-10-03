import { useEffect, useRef, useState } from "react";
import { isRed, suitMark, type Suit } from "@/lib/reliquary/euchre";
import { bankTick } from "@/lib/reliquary/atmosphere";

type Card = { rank: number; suit: Suit }; // rank 2-14: 11=J, 12=Q, 13=K, 14=A
type Phase = "player" | "dealer" | "done";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

function bjLabel(rank: number): string {
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  return String(rank);
}

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = a;
  }
  return deck;
}

function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 14) {
      aces++;
      total += 11;
    } else if (c.rank >= 11) total += 10;
    else total += c.rank;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function CardFace({ card, down, index }: { card?: Card; down?: boolean; index: number }) {
  const style = {
    animationName: "card-deal-in",
    animationDuration: "0.35s",
    animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1)",
    animationDelay: `${index * 90}ms`,
    animationFillMode: "backwards",
  } as const;
  if (down || !card) {
    return (
      <span className="card" style={{ ...style, background: "#241a12", borderColor: "#4a3a28" }}>
        <b style={{ color: "#d8b25c" }}>✦</b>
        <i> </i>
      </span>
    );
  }
  return (
    <span className={isRed(card.suit) ? "card red" : "card"} style={style}>
      <b>{bjLabel(card.rank)}</b>
      <i>{suitMark(card.suit)}</i>
    </span>
  );
}

export function Blackjack({ onEarn }: { onEarn: (n: number) => void }) {
  const deckRef = useRef<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>("player");
  const [note, setNote] = useState("");
  const [youHands, setYouHands] = useState(0);
  const [houseHands, setHouseHands] = useState(0);
  const [over, setOver] = useState<"you" | "house" | null>(null);
  const paid = useRef(false);

  function draw(): Card {
    const card = deckRef.current.pop();
    if (!card) {
      deckRef.current = buildDeck();
      return deckRef.current.pop()!;
    }
    return card;
  }

  function scoreHand(winner: "you" | "house" | "push", line: string) {
    setNote(line);
    if (winner === "push") {
      setPhase("done");
      return;
    }
    const nextYou = youHands + (winner === "you" ? 1 : 0);
    const nextHouse = houseHands + (winner === "house" ? 1 : 0);
    setYouHands(nextYou);
    setHouseHands(nextHouse);
    if (nextYou >= 3 || nextHouse >= 3) {
      const matchWinner = nextYou >= 3 ? "you" : "house";
      setOver(matchWinner);
      if (!paid.current) {
        paid.current = true;
        onEarn(matchWinner === "you" ? 1 : 0);
      }
    }
    setPhase("done");
  }

  function newHand() {
    deckRef.current = buildDeck();
    const p = [draw(), draw()];
    const d = [draw(), draw()];
    setPlayer(p);
    setDealer(d);
    setRevealed(false);
    const pv = handValue(p);
    const dv = handValue(d);
    if (pv === 21 || dv === 21) {
      setRevealed(true);
      if (pv === 21 && dv === 21) scoreHand("push", "Both show blackjack. A push. The hand is dealt again.");
      else if (pv === 21) scoreHand("you", "Blackjack. You take the hand before it begins.");
      else scoreHand("house", "The house shows blackjack. The hand is over before it begins.");
      return;
    }
    setNote("Two for you. One shows for the house.");
    setPhase("player");
  }

  // Deal the first hand on mount.
  useEffect(() => {
    newHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hit() {
    if (phase !== "player" || over) return;
    const card = draw();
    bankTick();
    const next = [...player, card];
    setPlayer(next);
    const v = handValue(next);
    if (v > 21) {
      setRevealed(true);
      scoreHand("house", `You break at ${v}. The house takes the hand.`);
    } else if (v === 21) {
      setNote("Twenty-one.");
      setPhase("dealer");
    } else {
      setNote("Another.");
    }
  }

  function stand() {
    if (phase !== "player" || over) return;
    setNote("You stand.");
    setPhase("dealer");
  }

  // Dealer plays out with a beat between cards.
  useEffect(() => {
    if (phase !== "dealer" || over) return;
    if (!revealed) setRevealed(true);
    const v = handValue(dealer);
    if (v >= 17) {
      const id = window.setTimeout(() => {
        const pv = handValue(player);
        if (v > 21) scoreHand("you", `The house breaks at ${v}. You take the hand.`);
        else if (v > pv) scoreHand("house", `The house stands on ${v}. The house takes the hand.`);
        else if (pv > v) scoreHand("you", `The house stands on ${v}. You take the hand.`);
        else scoreHand("push", `Both stand on ${v}. A push. The hand is dealt again.`);
      }, 700);
      return () => window.clearTimeout(id);
    }
    setNote(`The house shows ${v}. The house takes another.`);
    const id = window.setTimeout(() => {
      bankTick();
      setDealer((d) => [...d, draw()]);
    }, 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dealer, over]);

  const pv = handValue(player);
  const dv = handValue(dealer);

  return (
    <div className="felt">
      <p className="table-rule">
        Blackjack against the house. Hit or stand. The house draws to seventeen and stands on all seventeens.
        First to three hands takes a mark.
      </p>
      <p className="table-end">
        You {youHands} — the house {houseHands}
      </p>
      <div className="table-row" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="table-row">
            {dealer.map((c, i) => (
              <CardFace key={`${i}-${i === 1 && !revealed ? "down" : "up"}`} card={c} down={i === 1 && !revealed} index={i} />
            ))}
          </div>
          <span>The house{revealed ? ` · ${dv}` : ""}</span>
        </div>
      </div>
      <div className="table-row" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="table-row">
            {player.map((c, i) => (
              <CardFace key={i} card={c} index={i} />
            ))}
          </div>
          <span>You · {pv}</span>
        </div>
      </div>
      {note && <p className="table-end">{note}</p>}
      {over && (
        <p className="table-end">
          {over === "you" ? "You take the match. One mark." : "The house takes the match. Nothing for the purse."}
        </p>
      )}
      {phase === "player" && !over && (
        <div className="table-row">
          <button type="button" className="close-book go" onClick={hit}>
            Hit
          </button>
          <button type="button" className="close-book go" onClick={stand}>
            Stand
          </button>
        </div>
      )}
      {phase === "done" && !over && (
        <button type="button" className="close-book go" onClick={newHand}>
          Next hand
        </button>
      )}
    </div>
  );
}
