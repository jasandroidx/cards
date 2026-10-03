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
.euch-trick { position: relative; display: flex; gap: 10px; align-items: flex-end; justify-content: center; min-height: 150px; padding: 10px 0; }
.euch-play { display: flex; flex-direction: column; align-items: center; gap: 4px; animation: euch-land 0.32s cubic-bezier(0.2, 0.8, 0.3, 1) backwards; }
.euch-play > span { font-size: 12px; color: #b09a72; }
@keyframes euch-land {
  0% { transform: scale(1.22); filter: brightness(1.7); }
  60% { transform: scale(0.96); filter: brightness(1); }
  100% { transform: scale(1); }
}
.euch-play.winning .card { border-color: #d8b25c; box-shadow: 0 0 12px rgba(216, 178, 92, 0.55); }
.euch-sweep { display: flex; justify-content: center; }
.euch-sweep .euch-cards { display: flex; gap: 10px; animation: euch-sweep-away 0.45s ease-in forwards; animation-delay: 0.7s; }
.euch-sweep.to-you .euch-cards { --sweep-y: 80px; }
.euch-sweep.to-them .euch-cards { --sweep-y: -80px; }
@keyframes euch-sweep-away {
  to { transform: translateY(var(--sweep-y)); opacity: 0; }
}
.euch-deal-card { animation: euch-deal-in 0.4s cubic-bezier(0.2, 0.8, 0.3, 1) backwards; }
@keyframes euch-deal-in {
  from { opacity: 0; transform: translateY(30px) rotate(3deg); }
  to { opacity: 1; transform: none; }
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
