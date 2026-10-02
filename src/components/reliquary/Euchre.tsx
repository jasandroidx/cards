import { useState } from "react";
import {
  cpuCall,
  dealTable,
  isRed,
  legalPlays,
  openHand,
  playCard,
  rankLabel,
  suitMark,
  type EuchreCard,
  type HandState,
  type Suit,
} from "@/lib/reliquary/euchre";

const SEATS = ["You", "Left", "Partner", "Right"];

export function Euchre({
  onEarn,
  onClose,
}: {
  onEarn: (amount: number) => void;
  onClose: () => void;
}) {
  const [deal, setDeal] = useState(() => dealTable());
  const [hand, setHand] = useState<HandState | null>(null);
  const [paid, setPaid] = useState(false);

  function begin(trump: Suit) {
    setHand(openHand(trump, deal.hands));
  }

  function play(card: EuchreCard) {
    if (!hand) return;
    const next = playCard(hand, card);
    if (next.done && !paid) {
      onEarn(next.payout);
      setPaid(true);
    }
    setHand(next);
  }

  function again() {
    setDeal(dealTable());
    setHand(null);
    setPaid(false);
  }

  const legal = hand ? legalPlays(hand.hands[0] ?? [], hand.trick[0]?.card ?? null, hand.trump) : [];

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table euchre" role="dialog" aria-label="Euchre" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The bridge</p>
          <h2>Euchre</h2>
          <p className="table-rule">
            One hand. Partner sits across. Left and Right are theirs. Bowers take the trump. Three tricks pay. All five pay more.
          </p>
          <img className="plate" src="/euchre.jpg" alt="" />
          {!hand && (
            <div className="felt">
              <div className="lamp">
                <CardFace card={deal.upcard} />
                <span>The upcard</span>
              </div>
              <div className="table-row">
                <button type="button" className="close-book go" onClick={() => begin(deal.upcard.suit)}>
                  Order it up
                </button>
                <button type="button" className="close-book" onClick={() => begin(cpuCall(deal.hands, deal.upcard.suit))}>
                  Pass
                </button>
              </div>
            </div>
          )}
          {hand && (
            <>
              <p className="table-rule">
                Trump {suitMark(hand.trump)} · Your side {hand.yourTricks} · Theirs {hand.theirTricks}
              </p>
              <div className="trick">
                {hand.trick.map((play) => (
                  <div key={play.card.id} className="seat-card">
                    <CardFace card={play.card} />
                    <span>{SEATS[play.seat]}</span>
                  </div>
                ))}
                {hand.trick.length === 0 && <span className="table-rule">Lead.</span>}
              </div>
              <div className="hand">
                {(hand.hands[0] ?? []).map((card) => {
                  const ok = !hand.done && hand.turn === 0 && legal.some((item) => item.id === card.id);
                  return (
                    <button key={card.id} type="button" className="card-btn" disabled={!ok} onClick={() => play(card)}>
                      <CardFace card={card} />
                    </button>
                  );
                })}
              </div>
              {hand.done && (
                <div className="table-row">
                  <p className="table-end">
                    {hand.payout === 0
                      ? "Euchred. Nothing for the purse."
                      : hand.yourTricks >= 5
                        ? "A march. Eight marks."
                        : "Made. Four marks."}
                  </p>
                  <button type="button" className="close-book go" onClick={again}>
                    Deal again
                  </button>
                </div>
              )}
            </>
          )}
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
        </div>
      </div>
    </div>
  );
}

function CardFace({ card }: { card: EuchreCard }) {
  return (
    <span className={isRed(card.suit) ? "card red" : "card"}>
      <b>{rankLabel(card.rank)}</b>
      <i>{suitMark(card.suit)}</i>
    </span>
  );
}
