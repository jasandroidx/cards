import { useEffect, useRef, useState } from "react";
import {
  cpuCall,
  dealTable,
  effectiveSuit,
  isRed,
  legalPlays,
  openHand,
  playCard,
  rankLabel,
  strength,
  suitMark,
  type EuchreCard,
  type HandState,
  type Play,
  type Suit,
} from "@/lib/reliquary/euchre";
import { bankTick, lossSound } from "@/lib/reliquary/atmosphere";

const SEATS = ["You", "Left", "Partner", "Right"];

const EUCHRE_CSS = `
/* Felt zones for upcard and trick pile area */
.euch-upcard-zone {
  position: relative;
  padding: 18px 20px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.018) 0 2px, transparent 2px 4px),
    radial-gradient(ellipse 110% 90% at 50% 10%, #142e24 0%, var(--pit-felt, #10241c) 65%, #08120e 100%);
  border: 1px solid rgba(216, 178, 92, 0.35);
  box-shadow:
    inset 0 3px 12px rgba(0, 0, 0, 0.75),
    inset 0 0 32px rgba(0, 0, 0, 0.55),
    0 8px 22px rgba(0, 0, 0, 0.45);
}
.euch-upcard-zone::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 7px;
  pointer-events: none;
  border: 1px solid rgba(216, 178, 92, 0.22);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
}

.euch-trick-felt {
  position: relative;
  border-radius: 10px;
  padding: 16px 20px;
  margin: 10px 0 16px;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.12) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 4px),
    radial-gradient(ellipse 120% 100% at 50% 20%, #12281f 0%, var(--pit-felt, #10241c) 60%, #08120e 100%);
  border: 1px solid rgba(216, 178, 92, 0.35);
  box-shadow:
    inset 0 3px 14px rgba(0, 0, 0, 0.75),
    inset 0 0 36px rgba(0, 0, 0, 0.6),
    0 8px 22px rgba(0, 0, 0, 0.45);
}
.euch-trick-felt::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 7px;
  pointer-events: none;
  border: 1px solid rgba(216, 178, 92, 0.22);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
}

/* Brass trump indicator badge */
.euch-brass-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 18px;
  margin-bottom: 12px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(244, 220, 154, 0.12) 0%, rgba(138, 106, 44, 0.08) 100%),
    linear-gradient(180deg, #3a2e1b 0%, #22180c 50%, #120b04 100%);
  border: 1px solid #d8b25c;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 244, 210, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6),
    0 0 14px rgba(216, 178, 92, 0.2);
}
.euch-brass-trump {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #f4dc9a;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.euch-brass-trump i {
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  color: #f4dc9a;
  filter: drop-shadow(0 0 4px rgba(216, 178, 92, 0.5));
}
.euch-brass-trump i.red {
  color: #e04a3d;
  filter: drop-shadow(0 0 4px rgba(224, 74, 61, 0.5));
}
.euch-brass-scores {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  color: #e7dcc8;
}
.euch-brass-scores strong {
  color: #f4dc9a;
  font-weight: 600;
}

/* Weighty trick pile and card placement */
.euch-trick { position: relative; display: flex; gap: 12px; align-items: flex-end; justify-content: center; min-height: 150px; padding: 10px 0; }
.euch-trick .card {
  box-shadow:
    0 14px 22px rgba(0, 0, 0, 0.65),
    0 4px 8px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.euch-play { display: flex; flex-direction: column; align-items: center; gap: 6px; animation: euch-land 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) backwards; }
.euch-play > span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #d8b25c;
}
@keyframes euch-land {
  0% { transform: translateY(-26px) scale(1.18) rotate(-2deg); filter: brightness(1.6); opacity: 0; }
  60% { transform: translateY(2px) scale(0.97) rotate(0.5deg); filter: brightness(1.05); opacity: 1; }
  100% { transform: translateY(0) scale(1) rotate(0deg); filter: brightness(1); opacity: 1; }
}
.euch-play.winning .card {
  border-color: #d8b25c;
  box-shadow:
    0 14px 22px rgba(0, 0, 0, 0.65),
    0 0 18px rgba(216, 178, 92, 0.65),
    inset 0 0 0 1px rgba(216, 178, 92, 0.5);
}
.euch-sweep { display: flex; justify-content: center; }
.euch-sweep .euch-cards { display: flex; gap: 12px; animation: euch-sweep-away 0.45s ease-in forwards; animation-delay: 0.7s; }
.euch-sweep.to-you .euch-cards { --sweep-y: 80px; }
.euch-sweep.to-them .euch-cards { --sweep-y: -80px; }
@keyframes euch-sweep-away {
  to { transform: translateY(var(--sweep-y)); opacity: 0; }
}
.euch-deal-card { animation: euch-deal-in 0.4s cubic-bezier(0.2, 0.8, 0.3, 1) backwards; }
@keyframes euch-deal-in {
  0% { opacity: 0; transform: translateY(40px) rotate(4deg) scale(0.92); }
  60% { transform: translateY(-3px) rotate(-1deg) scale(1.02); }
  100% { opacity: 1; transform: none; }
}
.table.euchre { position: relative; }
.euch-trump-flash { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(10, 6, 3, 0.88); border-radius: 6px; }
.euch-trump-flash span { color: #b09a72; letter-spacing: 0.25em; font-size: 13px; text-transform: uppercase; }
.euch-trump-flash b { font-size: 72px; line-height: 1; animation: euch-trump-pulse 0.95s ease-in-out; }
.euch-trump-flash b.red { color: #b03a30; }
.euch-trump-flash b.black { color: #e8dcc0; }
@keyframes euch-trump-pulse {
  0% { transform: scale(0.6); opacity: 0; }
  40% { transform: scale(1.18); opacity: 1; }
  70% { transform: scale(1); }
  100% { transform: scale(1.06); opacity: 1; }
}
`;

/**
 * Display-only mirror of the lib's trickWinner: which seat currently leads the
 * trick. The lib remains the source of truth for scoring; this only drives the
 * gold highlight so the player can read the trick at a glance.
 */
function trickLeader(trick: Play[], trump: Suit): number {
  const leadSuit = effectiveSuit(trick[0]!.card, trump);
  let best = trick[0]!;
  for (const play of trick.slice(1)) {
    const suit = effectiveSuit(play.card, trump);
    const bestSuit = effectiveSuit(best.card, trump);
    const playFollows = suit === leadSuit || suit === trump;
    const bestFollows = bestSuit === leadSuit || bestSuit === trump;
    if (!playFollows) continue;
    if (!bestFollows || strength(play.card, trump) > strength(best.card, trump)) best = play;
  }
  return best.seat;
}

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
  const [sweep, setSweep] = useState<{ trick: Play[]; yourSide: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [trumpFlash, setTrumpFlash] = useState<Suit | null>(null);
  const handWas = useRef<HandState | null>(null);

  // Deal ceremony: a soft tick per card as the hand lands.
  useEffect(() => {
    if (hand && !handWas.current) {
      for (let i = 0; i < 5; i++) window.setTimeout(() => bankTick(), i * 75);
    }
    handWas.current = hand;
  }, [hand]);

  function settle(next: HandState) {
    if (next.done && !paid) {
      onEarn(next.payout);
      setPaid(true);
      // Wins: the parent's award() already plays markSound — don't double it.
      // Losses pay 0, which the parent stays silent on, so the thud is ours.
      if (next.payout === 0) lossSound();
    }
    setHand(next);
  }

  function begin(trump: Suit) {
    if (trumpFlash) return;
    setTrumpFlash(trump);
    bankTick();
    window.setTimeout(() => {
      setHand(openHand(trump, deal.hands));
      setTrumpFlash(null);
    }, 950);
  }

  function play(card: EuchreCard) {
    if (!hand || busy) return;
    const next = playCard(hand, card);
    if (next.played === hand.played) {
      bankTick();
      settle(next);
      return;
    }
    bankTick();
    const yourSide = next.yourTricks > hand.yourTricks;
    settle(next);
    // The final trick stays on the table under the result text; sweep the others.
    if (next.done) return;
    // Reconstruct the resolved trick's 4 plays in order. The lib resolves
    // instantly, so the component never sees all four — and the pump may have
    // already dealt into the NEW trick, so those ids are excluded.
    const newIds = new Set(next.trick.map((p) => p.card.id));
    const completed: Play[] = [...hand.trick];
    let seat = hand.turn;
    let guard = 0;
    while (completed.length < 4 && guard++ < 6) {
      const before = hand.hands[seat] ?? [];
      const after = next.hands[seat] ?? [];
      const playedCard = before.find((c) => !after.some((a) => a.id === c.id) && !newIds.has(c.id));
      if (!playedCard) break;
      completed.push({ seat, card: playedCard });
      seat = (seat + 1) % 4;
    }
    if (completed.length === 4) {
      setSweep({ trick: completed, yourSide });
      setBusy(true);
      window.setTimeout(() => {
        setSweep(null);
        setBusy(false);
      }, 1150);
    }
  }

  function again() {
    setDeal(dealTable());
    setHand(null);
    setPaid(false);
    setSweep(null);
    setBusy(false);
    setTrumpFlash(null);
  }

  const legal = hand ? legalPlays(hand.hands[0] ?? [], hand.trick[0]?.card ?? null, hand.trump) : [];
  const winSeat = hand && hand.trick.length > 0 && !sweep ? trickLeader(hand.trick, hand.trump) : null;
  const sweepWin = sweep && hand ? trickLeader(sweep.trick, hand.trump) : null;

  return (
    <div className="journal-back" onClick={onClose}>
      <style>{EUCHRE_CSS}</style>
      <div className="table euchre" role="dialog" aria-label="Euchre" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The bridge</p>
          <h2>Euchre</h2>
          <p className="table-rule">
            One hand. Partner sits across. Left and Right are theirs. Bowers take the trump. Three tricks pay. All five pay more.
          </p>
          <img className="plate" src="/euchre.jpg" alt="" />
          {trumpFlash && (
            <div className="euch-trump-flash">
              <span>Trump</span>
              <b className={isRed(trumpFlash) ? "red" : "black"}>{suitMark(trumpFlash)}</b>
            </div>
          )}
          {!hand && (
            <div className="felt euch-upcard-zone">
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
              <div className="euch-brass-indicator">
                <span className="euch-brass-trump">
                  Trump <i className={isRed(hand.trump) ? "red" : ""}>{suitMark(hand.trump)}</i>
                </span>
                <span className="euch-brass-scores">
                  Your side <strong>{hand.yourTricks}</strong> · Theirs <strong>{hand.theirTricks}</strong>
                </span>
              </div>
              <div className="euch-trick-felt">
                <div className="euch-trick">
                  {sweep ? (
                    <div className={`euch-sweep ${sweep.yourSide ? "to-you" : "to-them"}`}>
                      <div className="euch-cards">
                        {sweep.trick.map((p) => (
                          <div key={p.card.id} className={`euch-play${p.seat === sweepWin ? " winning" : ""}`}>
                            <CardFace card={p.card} />
                            <span>{SEATS[p.seat]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {hand.trick.map((p, i) => (
                        <div
                          key={p.card.id}
                          className={`euch-play${p.seat === winSeat ? " winning" : ""}`}
                          style={{ animationDelay: `${i * 90}ms` }}
                        >
                          <CardFace card={p.card} />
                          <span>{SEATS[p.seat]}</span>
                        </div>
                      ))}
                      {hand.trick.length === 0 && <span className="table-rule">Lead.</span>}
                    </>
                  )}
                </div>
              </div>
              <div className="hand">
                {(hand.hands[0] ?? []).map((card, index) => {
                  const ok = !hand.done && !busy && hand.turn === 0 && legal.some((item) => item.id === card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className="card-btn euch-deal-card"
                      style={{ animationDelay: `${index * 75}ms` }}
                      disabled={!ok}
                      onClick={() => play(card)}
                    >
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
                        ? "A march. Three marks."
                        : "Made. Two marks."}
                  </p>
                  <button type="button" className="close-book go" onClick={() => again}>
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
  const ace = card.rank === 1;
  return (
    <span className={isRed(card.suit) ? (ace ? "card red ace" : "card red") : ace ? "card ace" : "card"}>
      <b>{rankLabel(card.rank)}</b>
      <i>{suitMark(card.suit)}</i>
    </span>
  );
}
