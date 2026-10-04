import { useEffect, useRef, useState } from "react";
import { bankTick, bookSound, cardSnap, cupRattle, cupSlam, cupThunk, diceClatter, farkleSting, liarLoseSting, liarSting, liarWinSting } from "@/lib/reliquary/atmosphere";

type Suit = "hearts" | "spades" | "diamonds" | "clubs";

type C = { id: string; rank: number; suit: Suit };

const SUITS: Suit[] = ["hearts", "spades", "diamonds", "clubs"];

function label(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function power(rank: number): number {
  return rank === 1 ? 14 : rank;
}

function makeDeck(ranks: number[]): C[] {
  const cards: C[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) cards.push({ id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 7)}`, rank, suit });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = swap;
  }
  return cards;
}

function Face({ card, down = false }: { card?: C; down?: boolean }) {
  if (!card || down) return <span className="card back" aria-label="Face-down card" />;
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const mark = card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : card.suit === "clubs" ? "♣" : "♠";
  const ace = card.rank === 1;
  return (
    <span className={red ? (ace ? "card red ace" : "card red") : ace ? "card ace" : "card"}>
      <b>
        {label(card.rank)}
        {mark}
      </b>
      <i>{mark}</i>
    </span>
  );
}

function fight(yours: C[], theirs: C[], pot: C[] = []): { yours: C[]; theirs: C[]; youCard?: C; cpuCard?: C; war: boolean } {
  if (yours.length === 0 || theirs.length === 0) {
    return { yours, theirs, youCard: yours[0], cpuCard: theirs[0], war: false };
  }
  const youCard = yours[0]!;
  const cpuCard = theirs[0]!;
  let yRest = yours.slice(1);
  let tRest = theirs.slice(1);
  const pile = [...pot, youCard, cpuCard];
  if (power(youCard.rank) === power(cpuCard.rank)) {
    if (yRest.length < 2 || tRest.length < 2) {
      if (yRest.length < 2) return { yours: [], theirs: [...tRest, ...pile, ...yRest], youCard, cpuCard, war: true };
      return { yours: [...yRest, ...pile, ...tRest], theirs: [], youCard, cpuCard, war: true };
    }
    const downY = yRest[0]!;
    const downT = tRest[0]!;
    return fight(yRest.slice(1), tRest.slice(1), [...pile, downY, downT]);
  }
  if (power(youCard.rank) > power(cpuCard.rank)) return { yours: [...yRest, ...pile], theirs: tRest, youCard, cpuCard, war: pot.length > 0 };
  return { yours: yRest, theirs: [...tRest, ...pile], youCard, cpuCard, war: pot.length > 0 };
}

export function War({
  onEarn,
  onResult,
  winNote,
  loseNote,
}: {
  onEarn: (n: number) => void;
  onResult?: (won: boolean) => void;
  winNote?: string;
  loseNote?: string;
}) {
  const [state, setState] = useState(() => {
    const deck = makeDeck([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    return { yours: deck.slice(0, 26), theirs: deck.slice(26), flips: 0, youCard: undefined as C | undefined, cpuCard: undefined as C | undefined, war: false, done: false };
  });
  const paid = useRef(false);

  function finish(yours: C[], theirs: C[]) {
    if (paid.current) return;
    paid.current = true;
    const won = yours.length > theirs.length;
    onEarn(won ? 1 : 0);
    onResult?.(won);
  }

  function flip() {
    if (state.done) return;
    if (state.yours.length === 0 || state.theirs.length === 0 || state.flips >= 12) {
      setState({ ...state, done: true });
      finish(state.yours, state.theirs);
      return;
    }
    const next = fight(state.yours, state.theirs);
    const flips = state.flips + 1;
    const done = next.yours.length === 0 || next.theirs.length === 0 || flips >= 12;
    cardSnap();
    setState({ yours: next.yours, theirs: next.theirs, flips, youCard: next.youCard, cpuCard: next.cpuCard, war: next.war, done });
    if (done) finish(next.yours, next.theirs);
  }

  return (
    <div className="felt">
      <img className="plate" src="/war.jpg" alt="" />
      <p className="table-rule">War. Twelve flips. Higher card takes both. Same rank means war: one card down, one card up. Most cards left wins a mark.</p>
      <div className="table-row">
        <div>
          <div key={state.youCard?.id ?? "you"} className="deal-wrap">
            <Face card={state.youCard} />
          </div>
          <span>You {state.yours.length}</span>
        </div>
        <div>
          <div key={state.cpuCard?.id ?? "them"} className="deal-wrap">
            <Face card={state.cpuCard} />
          </div>
          <span>Them {state.theirs.length}</span>
        </div>
      </div>
      {state.war && !state.done && <p className="table-end">War.</p>}
      {state.done && (
        <p className="table-end">
          {state.yours.length > state.theirs.length
            ? (winNote ?? "You have more cards. One mark.")
            : (loseNote ?? "They have more. Nothing for the purse.")}
        </p>
      )}
      {!state.done && (
        <button type="button" className="close-book go" onClick={flip}>
          Flip ({12 - state.flips} left)
        </button>
      )}
    </div>
  );
}

const DICE_GLYPH = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

type LiarBid = { count: number; face: number };

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** Ones are wild, unless ones themselves are bid. */
function liarMatch(dice: number[], face: number): number {
  return face === 1 ? dice.filter((d) => d === 1).length : dice.filter((d) => d === face || d === 1).length;
}

function legalLiarRaise(bid: LiarBid | null, next: LiarBid, total: number): boolean {
  if (next.count < 1 || next.count > total || next.face < 1 || next.face > 6) return false;
  if (!bid) return true;
  return next.count > bid.count || (next.count === bid.count && next.face > bid.face);
}

function bidWords(bid: LiarBid): string {
  const counts = ["", "one", "two", "three", "four", "five", "six"];
  return `${counts[bid.count] ?? bid.count} ${DICE_GLYPH[bid.face]}`;
}

/** The house plays the odds, bluffs a little, and misreads sometimes. */
function cpuLiar(bid: LiarBid | null, cpuDice: number[], youCount: number): { call: boolean; bid?: LiarBid } {
  const total = cpuDice.length + youCount;
  let bestFace = 2;
  let bestN = -1;
  for (let f = 2; f <= 6; f++) {
    const n = liarMatch(cpuDice, f);
    if (n > bestN) {
      bestN = n;
      bestFace = f;
    }
  }
  if (!bid) {
    const bluff = Math.random() < 0.25;
    return { call: false, bid: { count: Math.max(1, Math.min(bestN + (bluff ? 1 : 0), total)), face: bestFace } };
  }
  const mine = liarMatch(cpuDice, bid.face);
  const expected = mine + youCount / 3;
  const over = bid.count - expected;
  if (over > 1.2 && Math.random() < 0.8) return { call: true };
  if (over > 0.4 && Math.random() < 0.25) return { call: true };
  const bluff = Math.random() < 0.2;
  if (bid.count < total) {
    return { call: false, bid: { count: bid.count + 1, face: bluff ? 2 + Math.floor(Math.random() * 5) : bestFace } };
  }
  if (bid.face < 6) return { call: false, bid: { count: bid.count, face: bid.face + 1 } };
  return { call: true };
}

const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 0, y: 180 },
};

const PIPS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const DIE_FACE_STYLE: Record<number, string> = {
  1: "translateZ(27px)",
  2: "rotateX(-90deg) translateZ(27px)",
  3: "rotateY(90deg) translateZ(27px)",
  4: "rotateY(-90deg) translateZ(27px)",
  5: "rotateX(90deg) translateZ(27px)",
  6: "rotateY(180deg) translateZ(27px)",
};

export function Die3D({
  value,
  rollKey,
  delay = 0,
  highlight = false,
}: {
  value: number;
  rollKey: number;
  delay?: number;
  highlight?: boolean;
}) {
  const cubeRef = useRef<HTMLDivElement>(null);
  const rest = useRef(FACE_ROT[value] ?? { x: 0, y: 0 });

  useEffect(() => {
    const el = cubeRef.current;
    const t = FACE_ROT[value] ?? { x: 0, y: 0 };
    if (!el) return;
    if (rollKey === 0) {
      rest.current = { ...t };
      el.style.transform = `rotateX(${t.x}deg) rotateY(${t.y}deg)`;
      return;
    }
    const spins = 2 + Math.floor(Math.random() * 2);
    const dx = ((((t.x - rest.current.x) % 360) + 540) % 360) - 180;
    const dy = ((((t.y - rest.current.y) % 360) + 540) % 360) - 180;
    const endX = rest.current.x + spins * 360 + dx;
    const endY = rest.current.y + spins * 360 + dy;
    const anim = el.animate(
      [
        { transform: `rotateX(${rest.current.x}deg) rotateY(${rest.current.y}deg)` },
        { transform: `rotateX(${endX}deg) rotateY(${endY}deg)` },
      ],
      { duration: 850, delay, easing: "cubic-bezier(0.12, 0.8, 0.3, 1)", fill: "forwards" },
    );
    anim.onfinish = () => {
      rest.current = { x: ((endX % 360) + 360) % 360, y: ((endY % 360) + 360) % 360 };
    };
    return () => anim.cancel();
  }, [rollKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dice3d-scene">
      <div ref={cubeRef} className={`dice3d-cube${highlight ? " lit" : ""}`}>
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div key={f} className="dice3d-face" style={{ transform: DIE_FACE_STYLE[f] }}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((p) => (
              <span key={p} className={PIPS[f]?.includes(p) ? "dice3d-pip" : undefined} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiarsDice({ onEarn }: { onEarn: (n: number) => void }) {
  const deal = (n: number) => Array.from({ length: n }, rollDie);
  const [youDice, setYouDice] = useState<number[]>(() => deal(3));
  const [cpuDice, setCpuDice] = useState<number[]>(() => deal(3));
  const [bid, setBid] = useState<LiarBid | null>(null);
  const [turn, setTurn] = useState<"you" | "cpu">("you");
  const [reveal, setReveal] = useState<{ caller: "you" | "cpu"; honest: boolean; actual: number } | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [pending, setPending] = useState<{ you: number; cpu: number; starter: "you" | "cpu" } | null>(null);
  const [over, setOver] = useState<"you" | "cpu" | null>(null);
  const [myCount, setMyCount] = useState(1);
  const [myFace, setMyFace] = useState(2);
  const [shaking, setShaking] = useState(true);
  const [cpuLifted, setCpuLifted] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [cpuRollKey, setCpuRollKey] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [endVideo, setEndVideo] = useState<"win" | "lose" | null>(null);
  const paid = useRef(false);
  const total = youDice.length + cpuDice.length;

  // Intro sting: cups slam on video, then the real ritual starts underneath.
  useEffect(() => {
    const slam = window.setTimeout(cupSlam, 400);
    const fallback = window.setTimeout(() => setShowIntro(false), 4200);
    return () => {
      window.clearTimeout(slam);
      window.clearTimeout(fallback);
    };
  }, []);

  // The shake ritual: cups rattle, then yours lifts and your dice tumble out.
  useEffect(() => {
    if (showIntro) return;
    setShaking(true);
    cupRattle();
    const id = window.setTimeout(() => {
      setShaking(false);
      cupThunk();
      setRollKey((k) => k + 1);
      diceClatter(youDice.length);
    }, 950);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, showIntro]);

  function doCall(caller: "you" | "cpu", atBid: LiarBid | null, yDice: number[], cDice: number[]) {
    if (!atBid || over || revealing) return;
    setRevealing(true);
    liarSting();
    setCpuLifted(true);
    setCpuRollKey((k) => k + 1);
    diceClatter(cDice.length);
    window.setTimeout(() => {
      const actual = liarMatch(yDice, atBid.face) + liarMatch(cDice, atBid.face);
      const honest = actual >= atBid.count;
      const loser = honest ? caller : caller === "you" ? "cpu" : "you";
      const nextYou = loser === "you" ? yDice.length - 1 : yDice.length;
      const nextCpu = loser === "cpu" ? cDice.length - 1 : cDice.length;
      setReveal({ caller, honest, actual });
      setRevealing(false);
      if (nextYou === 0 || nextCpu === 0) {
        const winner = nextYou === 0 ? "cpu" : "you";
        setYouDice(yDice.slice(0, nextYou));
        setCpuDice(cDice.slice(0, nextCpu));
        setOver(winner);
        setEndVideo(winner === "you" ? "win" : "lose");
        window.setTimeout(() => setEndVideo(null), 3700);
        if (!paid.current) {
          paid.current = true;
          if (winner === "you") liarWinSting();
          else liarLoseSting();
          onEarn(winner === "you" ? 1 : 0);
        }
        return;
      }
      setPending({ you: nextYou, cpu: nextCpu, starter: loser });
    }, 1500);
  }

  useEffect(() => {
    if (turn !== "cpu" || reveal || revealing || over || pending || shaking) return;
    const id = window.setTimeout(() => {
      const move = cpuLiar(bid, cpuDice, youDice.length);
      if (move.call) doCall("cpu", bid, youDice, cpuDice);
      else {
        setBid(move.bid!);
        setTurn("you");
      }
    }, 700);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, reveal, revealing, over, pending, shaking]);

  function placeBid() {
    if (turn !== "you" || reveal || revealing || over || pending || shaking) return;
    const next = { count: myCount, face: myFace };
    if (!legalLiarRaise(bid, next, total)) return;
    setBid(next);
    setMyCount(Math.min(next.count, total));
    setTurn("cpu");
  }

  function nextRound() {
    if (!pending) return;
    setYouDice(deal(pending.you));
    setCpuDice(deal(pending.cpu));
    setBid(null);
    setReveal(null);
    setPending(null);
    setCpuLifted(false);
    setTurn(pending.starter);
    setMyCount(1);
    setMyFace(2);
    setRoundKey((k) => k + 1);
  }

  const canBid = turn === "you" && !reveal && !revealing && !over && !pending && !shaking;
  const raiseOk = legalLiarRaise(bid, { count: myCount, face: myFace }, total);
  const cpuShown = cpuLifted || reveal !== null || over !== null;

  return (
    <div className="felt liar-stage">
      {showIntro && (
        <div className="liar-video-overlay">
          <video src="/liar-intro.mp4" autoPlay muted playsInline onEnded={() => setShowIntro(false)} />
        </div>
      )}
      {endVideo && (
        <div className="liar-video-overlay">
          <video src={endVideo === "win" ? "/liar-win.mp4" : "/liar-lose.mp4"} autoPlay muted playsInline />
        </div>
      )}
      <img className="plate" src="/liars-table.jpg" alt="" />
      <p className="table-rule">
        Three dice each under the cups. Bid how many of a face lie under both cups — ones are wild.
        Raise the bid or call liar. Wrong loses a die. Take all their dice for a mark.
      </p>
      <div className="liar-table">
        <div className="liar-side">
          <span className="dice-pit-label">You · {youDice.length} {youDice.length === 1 ? "die" : "dice"}</span>
          <div className="liar-tray dice-pit">
            <div className="liar-dice">
              {youDice.map((d, i) => (
                <Die3D
                  key={`you-${i}`}
                  value={d}
                  rollKey={rollKey}
                  delay={i * 130}
                  highlight={reveal !== null && bid !== null && liarMatch([d], bid.face) > 0}
                />
              ))}
            </div>
            <div className={`liar-cup${!shaking ? " lifted" : ""}${shaking ? " shaking" : ""}`} />
          </div>
        </div>
        <div className="liar-side">
          <span className="dice-pit-label">Them · {cpuDice.length} {cpuDice.length === 1 ? "die" : "dice"}</span>
          <div className="liar-tray dice-pit">
            <div className="liar-dice">
              {cpuDice.map((d, i) => (
                <Die3D
                  key={`cpu-${i}`}
                  value={d}
                  rollKey={cpuRollKey}
                  delay={i * 130}
                  highlight={reveal !== null && bid !== null && liarMatch([d], bid.face) > 0}
                />
              ))}
            </div>
            <div className={`liar-cup${cpuShown ? " lifted" : ""}`} />
          </div>
        </div>
      </div>
      {shaking && <p className="table-end">The cups go down. Something rattles inside.</p>}
      {bid && !reveal && !shaking && (
        <p className="table-end liar-bid">
          The bid is {bidWords(bid)}. {turn === "you" ? "Your throw." : revealing ? "The cups lift." : "Their throw."}
        </p>
      )}
      {revealing && <p className="table-end">The cups lift.</p>}
      {reveal && bid && (
        <p className="table-end">
          {reveal.caller === "you" ? "You call liar. " : "They call liar. "}There {reveal.actual === 1 ? "was" : "were"}{" "}
          {reveal.actual} {DICE_GLYPH[bid.face]} under the cups. The bid was {reveal.honest ? "honest" : "a lie"}.
        </p>
      )}
      {over && !endVideo && (
        <p className="table-end">
          {over === "you" ? "You took their last die. One mark." : "They took your last die. Nothing for the purse."}
        </p>
      )}
      {canBid && (
        <div className="table-row">
          <div>
            <button type="button" className="close-book" onClick={() => setMyCount((c) => Math.max(1, c - 1))}>−</button>
            <span>{myCount}</span>
            <button type="button" className="close-book" onClick={() => setMyCount((c) => Math.min(total, c + 1))}>+</button>
          </div>
          <div>
            <button type="button" className="close-book" onClick={() => setMyFace((f) => (f === 1 ? 6 : f - 1))}>−</button>
            <span className="dice-line">{DICE_GLYPH[myFace]}</span>
            <button type="button" className="close-book" onClick={() => setMyFace((f) => (f === 6 ? 1 : f + 1))}>+</button>
          </div>
          <button type="button" className="close-book go" disabled={!raiseOk} onClick={placeBid}>
            Bid {bidWords({ count: myCount, face: myFace })}
          </button>
          {bid && (
            <button type="button" className="close-book go" onClick={() => doCall("you", bid, youDice, cpuDice)}>
              Liar!
            </button>
          )}
        </div>
      )}
      {!canBid && !reveal && !revealing && !over && !shaking && <p className="table-end">They are thinking.</p>}
      {pending && !over && (
        <button type="button" className="close-book go" onClick={nextRound}>
          Next round
        </button>
      )}
    </div>
  );
}

/** Farkle groups: score the contributing dice in a roll. scoring[] marks which dice
 *  contribute; non-contributing dice are simply unmarked. A roll with score 0 is a farkle. */
function farkleGroups(dice: number[]): { score: number; scoring: boolean[] } {
  const none = dice.map(() => false);
  if (dice.length === 0) return { score: 0, scoring: none };
  const counts = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach((d) => {
    counts[d]++;
  });
  if (dice.length === 6) {
    const sorted = [...dice].sort((a, b) => a - b);
    if (sorted.every((d, i) => d === i + 1)) return { score: 1500, scoring: dice.map(() => true) };
    if (counts.filter((c) => c === 2).length === 3) return { score: 1500, scoring: dice.map(() => true) };
  }
  const scoring = dice.map(() => false);
  let score = 0;
  for (let face = 1; face <= 6; face++) {
    const c = counts[face];
    if (c >= 3) {
      const base = face === 1 ? 1000 : face * 100;
      score += base * 2 ** (c - 3);
      dice.forEach((d, i) => {
        if (d === face) scoring[i] = true;
      });
    }
  }
  dice.forEach((d, i) => {
    if (scoring[i]) return;
    if (d === 1) {
      score += 100;
      scoring[i] = true;
    } else if (d === 5) {
      score += 50;
      scoring[i] = true;
    }
  });
  return { score, scoring };
}

/** A set-aside selection is valid only if every selected die contributes to the score. */
function farkleSelection(dice: number[]): { score: number; valid: boolean } {
  if (dice.length === 0) return { score: 0, valid: false };
  const g = farkleGroups(dice);
  const valid = g.score > 0 && g.scoring.every(Boolean);
  return { score: valid ? g.score : 0, valid };
}

const delay = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

export function Farkle({ onEarn }: { onEarn: (n: number) => void }) {
  const [dice, setDice] = useState<number[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [keptCount, setKeptCount] = useState(0);
  const [turnScore, setTurnScore] = useState(0);
  const [youTotal, setYouTotal] = useState(0);
  const [cpuTotal, setCpuTotal] = useState(0);
  const [round, setRound] = useState(1);
  const [whose, setWhose] = useState<"you" | "cpu">("you");
  const [phase, setPhase] = useState<"shake" | "select" | "decide" | "busy" | "over">("shake");
  const [note, setNote] = useState("Roll the bones.");
  const [rollKey, setRollKey] = useState(0);
  const [shaking, setShaking] = useState(true);
  const paid = useRef(false);
  const runRef = useRef(0);
  const youRef = useRef(0);
  const cpuRef = useRef(0);

  function roundLabel(r: number): string {
    return r <= 3 ? `Turn ${r} of 3` : "Sudden death";
  }

  function doRoll(n: number, w: "you" | "cpu", r: number) {
    setPhase("shake");
    setShaking(true);
    cupRattle();
    window.setTimeout(() => {
      const d = Array.from({ length: n }, rollDie);
      setDice(d);
      setSelected(d.map(() => false));
      setShaking(false);
      setRollKey((k) => k + 1);
      diceClatter(n);
      if (w === "cpu") {
        void cpuTurn(d, r);
        return;
      }
      if (farkleGroups(d).score === 0) {
        playerFarkle(r);
        return;
      }
      setPhase("select");
      setNote(`${roundLabel(r)} — set aside scoring dice.`);
    }, 950);
  }

  function startTurn(w: "you" | "cpu", r: number) {
    setWhose(w);
    setRound(r);
    setTurnScore(0);
    setKeptCount(0);
    setNote(w === "you" ? `${roundLabel(r)} — your throw.` : `${roundLabel(r)} — their throw.`);
    doRoll(6, w, r);
  }

  function endTurn(w: "you" | "cpu", r: number) {
    if (w === "you") {
      startTurn("cpu", r);
      return;
    }
    if (r >= 3 && youRef.current !== cpuRef.current) {
      finishMatch();
      return;
    }
    startTurn("you", r + 1);
  }

  function finishMatch() {
    const you = youRef.current;
    const cpu = cpuRef.current;
    setPhase("over");
    setNote(
      you > cpu
        ? `You take it, ${you} to ${cpu}. One mark.`
        : `They take it, ${cpu} to ${you}. Nothing for the purse.`,
    );
    if (!paid.current) {
      paid.current = true;
      onEarn(you > cpu ? 1 : 0);
    }
  }

  function playerFarkle(r: number) {
    setPhase("busy");
    farkleSting();
    setTurnScore(0);
    setKeptCount(0);
    setNote("FARKLE. The bones give nothing. The turn's points are gone.");
    window.setTimeout(() => endTurn("you", r), 1800);
  }

  async function cpuTurn(firstDice: number[], r: number) {
    const id = ++runRef.current;
    const ok = () => runRef.current === id;
    setPhase("busy");
    let tScore = 0;
    let d = firstDice;
    for (;;) {
      if (!ok()) return;
      await delay(1100);
      if (!ok()) return;
      const s = farkleGroups(d);
      if (s.score === 0) {
        farkleSting();
        setNote("FARKLE. The bones give them nothing.");
        tScore = 0;
        await delay(1700);
        if (!ok()) return;
        break;
      }
      const take = d.filter((_, i) => s.scoring[i]);
      tScore += s.score;
      setTurnScore(tScore);
      setKeptCount((c) => c + take.length);
      bankTick();
      if (take.length === d.length) {
        setNote(`They set aside ${s.score} — hot dice. They roll all six again.`);
        await delay(1500);
        if (!ok()) return;
        d = rollCpuDice(6);
        if (!ok()) return;
        continue;
      }
      const remaining = d.length - take.length;
      setNote(`They set aside ${take.length} (${s.score}). Their turn: ${tScore}.`);
      await delay(1500);
      if (!ok()) return;
      const stopAt = 350 + Math.random() * 150;
      if (tScore >= stopAt || remaining <= 2) break;
      d = rollCpuDice(remaining);
      if (!ok()) return;
    }
    if (!ok()) return;
    cpuRef.current += tScore;
    setCpuTotal(cpuRef.current);
    if (tScore > 0) {
      bankTick();
      setNote(`They bank ${tScore}.`);
    }
    await delay(1500);
    if (!ok()) return;
    endTurn("cpu", r);
  }

  function rollCpuDice(n: number): number[] {
    setPhase("shake");
    setShaking(true);
    cupRattle();
    const d = Array.from({ length: n }, rollDie);
    // The visual beat lands via timeouts below; return values now for logic.
    window.setTimeout(() => {
      setDice(d);
      setSelected(d.map(() => false));
      setShaking(false);
      setPhase("busy");
      setRollKey((k) => k + 1);
      diceClatter(n);
    }, 950);
    return d;
  }

  function toggleSelect(i: number) {
    if (phase !== "select") return;
    setSelected((s) => s.map((v, j) => (j === i ? !v : v)));
  }

  function setAside() {
    if (phase !== "select") return;
    const sel = dice.filter((_, i) => selected[i]);
    const s = farkleSelection(sel);
    if (!s.valid) return;
    bankTick();
    const kept = keptCount + sel.length;
    const score = turnScore + s.score;
    setKeptCount(kept);
    setTurnScore(score);
    const rest = dice.filter((_, i) => !selected[i]);
    if (rest.length === 0) {
      setNote("Hot dice — all six score. Roll them all again.");
      doRoll(6, "you", round);
      return;
    }
    setDice(rest);
    setSelected(rest.map(() => false));
    setPhase("decide");
    setNote(`Set aside ${s.score}. Turn: ${score}. Bank it or roll the ${rest.length} remaining.`);
  }

  function onBank() {
    if (phase !== "decide") return;
    bankTick();
    youRef.current += turnScore;
    setYouTotal(youRef.current);
    setNote(`You bank ${turnScore}.`);
    window.setTimeout(() => endTurn("you", round), 1300);
  }

  function onRollRemaining() {
    if (phase !== "decide") return;
    doRoll(dice.length, "you", round);
  }

  useEffect(() => {
    runRef.current += 1;
    youRef.current = 0;
    cpuRef.current = 0;
    startTurn("you", 1);
    return () => {
      runRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selDice = dice.filter((_, i) => selected[i]);
  const sel = farkleSelection(selDice);
  const selValid = sel.valid;
  const selScore = sel.score;

  return (
    <div className="felt">
      <img className="plate" src="/liars-table.jpg" alt="" />
      <p className="table-rule">
        Six bones. Set aside scoring dice — ones are 100, fives are 50, three of a kind scores big.
        Bank your turn's points or push your luck on the rest. Roll no scorers and it's a farkle:
        the turn's points are gone. Three turns each, highest total takes a mark.
      </p>
      <p className="table-end farkle-score">
        You {youTotal} — Them {cpuTotal} · {phase === "over" ? "Match over" : roundLabel(round)}
        {keptCount > 0 && phase !== "over" ? ` · Set aside: ${keptCount}` : ""}
        {phase !== "over" ? ` · Turn: ${turnScore}` : ""}
      </p>
      <div className="farkle-table">
        <div className="farkle-pit dice-pit">
          <div className="farkle-dice">
            {dice.map((d, i) => (
              <button
                key={`f-${i}`}
                type="button"
                className={`farkle-die${selected[i] ? " picked" : ""}`}
                disabled={phase !== "select" || whose !== "you"}
                onClick={() => toggleSelect(i)}
                aria-label={`die ${d}${selected[i] ? " selected" : ""}`}
              >
                <Die3D value={d} rollKey={rollKey} delay={i * 110} />
              </button>
            ))}
          </div>
          <div className={`liar-cup${!shaking ? " lifted" : ""}${shaking ? " shaking" : ""}`} />
        </div>
        <p className="dice-pit-label">{whose === "you" ? "Your throw" : "Their throw"}</p>
      </div>
      <p className="table-end">{note}</p>
      {phase === "select" && whose === "you" && (
        <div className="table-row">
          <button type="button" className="close-book go" disabled={!selValid} onClick={setAside}>
            Set aside{selValid ? ` (${selDice.length} dice, ${selScore})` : ""}
          </button>
        </div>
      )}
      {phase === "decide" && whose === "you" && (
        <div className="table-row">
          <button type="button" className="close-book go" onClick={onBank}>
            Bank {turnScore}
          </button>
          <button type="button" className="close-book go" onClick={onRollRemaining}>
            Roll the {dice.length} remaining
          </button>
        </div>
      )}
      {phase === "shake" && <p className="table-end">The cup rattles.</p>}
    </div>
  );
}

function drawUp(hand: C[], pond: C[]): { hand: C[]; pond: C[] } {  if (hand.length > 0 || pond.length === 0) return { hand, pond };
  const drawn = pond[0]!;
  const got = booksIn([drawn]);
  return { hand: got.hand.length > 0 ? got.hand : [drawn], pond: pond.slice(1) };
}

function booksIn(hand: C[]): { hand: C[]; books: number } {
  const ranks = new Set(hand.map((card) => card.rank));
  let books = 0;
  let next = hand;
  for (const rank of ranks) {
    if (next.filter((card) => card.rank === rank).length >= 4) {
      books += 1;
      next = next.filter((card) => card.rank !== rank);
    }
  }
  return { hand: next, books };
}

export function GoFish({ onEarn }: { onEarn: (n: number) => void }) {
  const [deal] = useState(() => makeDeck([1, 2, 3, 4, 5, 6, 7, 8]));
  const [you, setYou] = useState<C[]>(() => deal.slice(0, 5));
  const [cpu, setCpu] = useState<C[]>(() => deal.slice(5, 10));
  const [stock, setStock] = useState<C[]>(() => deal.slice(10));
  const [yourBooks, setYourBooks] = useState(0);
  const [cpuBooks, setCpuBooks] = useState(0);
  const [note, setNote] = useState("Ask for a rank you already hold.");
  const [turn, setTurn] = useState<"you" | "cpu">("you");
  const [done, setDone] = useState(false);
  const paid = useRef(false);

  function end(yBooks: number, cBooks: number) {
    if (paid.current) return;
    paid.current = true;
    setDone(true);
    onEarn(yBooks > cBooks ? 1 : 0);
    setNote(yBooks > cBooks ? "More books. One mark." : "They collected more. Nothing for the purse.");
  }

  function ask(rank: number) {
    if (turn !== "you" || done) return;
    const hit = cpu.filter((card) => card.rank === rank);
    if (hit.length > 0) {
      const nextCpu = cpu.filter((card) => card.rank !== rank);
      const got = booksIn([...you, ...hit]);
      const filled = drawUp(got.hand, stock);
      setCpu(nextCpu);
      setYou(filled.hand);
      setStock(filled.pond);
      setYourBooks((value) => value + got.books);
      if (got.books > 0) bookSound();
      setNote(`They had ${label(rank)}. Ask again.`);
      if (filled.hand.length === 0 && nextCpu.length === 0) end(yourBooks + got.books, cpuBooks);
      return;
    }
    const drawn = stock[0];
    const rest = stock.slice(1);
    if (!drawn) {
      setTurn("cpu");
      setNote("The pond is empty.");
      return;
    }
    const got = booksIn([...you, drawn]);
    const filled = drawUp(got.hand, rest);
    setStock(filled.pond);
    setYou(filled.hand);
    setYourBooks((value) => value + got.books);
      if (got.books > 0) bookSound();
    if (filled.hand.length === 0 && cpu.length === 0) {
      end(yourBooks + got.books, cpuBooks);
      return;
    }
    if (drawn.rank === rank) {
      setNote(`Go fish. You drew ${label(drawn.rank)}. Ask again.`);
      return;
    }
    setNote(`Go fish. You drew ${label(drawn.rank)}. Their turn.`);
    setTurn("cpu");
  }

  useEffect(() => {
    if (turn !== "cpu" || done) return;
    const timer = window.setTimeout(() => {
      if (cpu.length === 0) {
        if (stock.length === 0) {
          end(yourBooks, cpuBooks);
          return;
        }
        const drawn = stock[0]!;
        const got = booksIn([...cpu, drawn]);
        setStock(stock.slice(1));
        setCpu(got.hand);
        setCpuBooks((value) => value + got.books);
        if (got.books > 0) bookSound();
        setTurn("you");
        setNote("They fished.");
        return;
      }
      const counts = new Map<number, number>();
      for (const card of cpu) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
      const rank = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
      const hit = you.filter((card) => card.rank === rank);
      if (hit.length > 0) {
        const nextYou = you.filter((card) => card.rank !== rank);
        const got = booksIn([...cpu, ...hit]);
        const filled = drawUp(nextYou, stock);
        setYou(filled.hand);
        setStock(filled.pond);
        setCpu(got.hand);
        setCpuBooks((value) => value + got.books);
        if (got.books > 0) bookSound();
        setNote(`They asked for ${label(rank)}. You had it. They go again.`);
        if (filled.hand.length === 0 && got.hand.length === 0 && filled.pond.length === 0) end(yourBooks, cpuBooks + got.books);
        return;
      }
      const drawn = stock[0];
      if (!drawn) {
        setTurn("you");
        setNote(`They asked for ${label(rank)}. Go fish. The pond is empty. Your turn.`);
        return;
      }
      const got = booksIn([...cpu, drawn]);
      setStock(stock.slice(1));
      setCpu(got.hand);
      setCpuBooks((value) => value + got.books);
        if (got.books > 0) bookSound();
      if (drawn.rank === rank) {
        setNote(`They asked for ${label(rank)}, fished, and drew it.`);
        return;
      }
      setTurn("you");
      setNote(`They asked for ${label(rank)}. Go fish. Your turn.`);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [turn, done, cpu, you, stock, yourBooks, cpuBooks]);

  const ranks = [...new Set(you.map((card) => card.rank))];

  return (
    <div className="felt">
      <img className="plate" src="/fish.jpg" alt="" />
      <p className="table-rule">Go Fish. Short deck, ace through eight. Ask for a rank you hold. Four of a kind is a book. More books wins a mark.</p>
      <p className="table-end">
        Your books {yourBooks}. Their books {cpuBooks}. Pond {stock.length}.
      </p>
      <p className="table-rule">{note}</p>
      <div className="table-row">
        {you.map((card, index) => (
          <span key={card.id} className="deal-wrap" style={{ animationDelay: `${index * 70}ms` }}>
            <Face card={card} />
          </span>
        ))}
      </div>
      {!done && turn === "you" && (
        <div className="table-row">
          {ranks.map((rank) => (
            <button key={rank} type="button" className="close-book go" onClick={() => ask(rank)}>
              Ask {label(rank)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Memory({ onEarn }: { onEarn: (n: number) => void }) {
  const [cards] = useState(() => {
    const deck = makeDeck([1, 2, 3, 4, 5, 6, 7, 8]).filter((card) => card.suit === "hearts" || card.suit === "spades");
    return deck;
  });
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const paid = useRef(false);

  function pick(index: number) {
    if (lock || matched.includes(index) || up.includes(index)) return;
    const next = [...up, index];
    if (next.length < 2) {
      setUp(next);
      return;
    }
    const a = cards[next[0]!]!;
    const b = cards[next[1]!]!;
    if (a.rank === b.rank) {
      const found = [...matched, next[0]!, next[1]!];
      setMatched(found);
      setUp([]);
      if (found.length === cards.length && !paid.current) {
        paid.current = true;
        onEarn(1);
      }
      return;
    }
    setUp(next);
    setLock(true);
    window.setTimeout(() => {
      setUp([]);
      setLock(false);
    }, 700);
  }

  return (
    <div className="felt">
      <img className="plate" src="/memory.jpg" alt="" />
      <p className="table-rule">Concentration. Sixteen cards, eight pairs. Turn two. A match stays up. Clear the board for a mark.</p>
      <div className="memory">
        {cards.map((card, index) => {
          const show = up.includes(index) || matched.includes(index);
          return (
            <button key={card.id} type="button" className={show ? "card-btn up" : "card-btn"} onClick={() => pick(index)}>
              <Face card={card} down={!show} />
            </button>
          );
        })}
      </div>
      {matched.length === cards.length && <p className="table-end">All pairs. One mark.</p>}
    </div>
  );
}
