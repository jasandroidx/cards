import { useEffect, useRef, useState } from "react";
import { Die3D } from "@/components/reliquary/Quick";
import { face, mabelThrow, yachtScore } from "@/lib/reliquary/bouts";
import { cupRattle, cupThunk, diceClatter } from "@/lib/reliquary/atmosphere";
import { borderSeriesDone, borderSeriesResult } from "@/lib/reliquary/border";
import type { BorderResult } from "@/lib/reliquary/border";

export function Yacht({ onEarn, onWin, onClose }: { onEarn: (n: number) => void; onWin?: (won: boolean) => void; onClose: () => void }) {
  const [dice, setDice] = useState<number[]>([0, 0, 0, 0, 0]);
  const [dieKeys, setDieKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [hold, setHold] = useState<boolean[]>([false, false, false, false, false]);
  const [left, setLeft] = useState(3);
  const [hers, setHers] = useState<number[] | null>(null);
  const paid = useRef(false);

  function reveal(yours: number[]) {
    const her = mabelThrow();
    setHers(her);
    if (paid.current) return;
    paid.current = true;
    const you = yachtScore(yours).score;
    const she = yachtScore(her).score;
    onEarn(you > she ? 2 : you === she ? 1 : 0);
    onWin?.(you > she);
  }

  function roll() {
    if (hers || left <= 0) return;
    const rerolled = dice.map((_, index) => !(left < 3 && hold[index]));
    const next = dice.map((die, index) => (rerolled[index] ? face() : die));
    const remain = left - 1;
    setDice(next);
    setDieKeys((keys) => keys.map((key, index) => (rerolled[index] ? key + 1 : key)));
    setLeft(remain);
    if (remain === 0) reveal(next);
  }

  const yours = yachtScore(dice);
  const hersScore = hers ? yachtScore(hers) : null;

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="Yacht" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">Mabel</p>
          <h2>Yacht</h2>
          <p className="table-rule">Five dice. Three throws. Hold what you want to keep. Beat her score. Two marks if you win, one if you tie.</p>
          <img className="plate" src="/yacht.jpg" alt="" />
          <div className="table-row">
            {dice.map((die, index) => (
              <button
                key={index}
                type="button"
                className={`die${hold[index] ? " held" : ""}${die > 0 ? " has-cube" : ""}`}
                disabled={Boolean(hers) || left === 3}
                onClick={() => setHold(hold.map((kept, i) => (i === index ? !kept : kept)))}
              >
                {die > 0 ? <Die3D value={die} rollKey={dieKeys[index]} delay={index * 130} /> : "·"}
              </button>
            ))}
          </div>
          {!hers && (
            <div className="table-row">
              <button type="button" className="close-book go" onClick={roll}>
                {left === 3 ? "Throw" : `Throw again (${left})`}
              </button>
              {left < 3 && (
                <button type="button" className="close-book" onClick={() => reveal(dice)}>
                  Stand
                </button>
              )}
            </div>
          )}
          {hers && hersScore && (
            <>
              <p className="table-end">
                You: {yours.name}, {yours.score}. Mabel: {hersScore.name}, {hersScore.score}.
              </p>
              <p className="table-rule">Her dice: {hers.join(" ")}</p>
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

function moveQueen(queen: number, pair: [number, number]): number {
  if (queen === pair[0]) return pair[1];
  if (queen === pair[1]) return pair[0];
  return queen;
}

const SWAPS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 1],
];

const SWAP_WORDS = ["Left and center trade.", "Center and right trade.", "Left and center trade."];

export function Monte({ onEarn, onWin, onClose }: { onEarn: (n: number) => void; onWin?: (won: boolean) => void; onClose: () => void }) {
  const [queen, setQueen] = useState(1);
  const [shown, setShown] = useState(true);
  const [step, setStep] = useState(0);
  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const paid = useRef(false);
  const busy = useRef(false);

  function next() {
    if (busy.current || picking) return;
    if (shown) {
      setShown(false);
      return;
    }
    const pair = SWAPS[step];
    if (!pair) return;
    busy.current = true;
    setQueen((current) => moveQueen(current, pair));
    if (step < 2) {
      setStep(step + 1);
      busy.current = false;
      return;
    }
    window.setTimeout(() => {
      setQueen((current) => moveQueen(current, [0, 2]));
      setPicking(true);
      busy.current = false;
    }, 600);
  }

  function pick(index: number) {
    if (!picking || choice !== null) return;
    setChoice(index);
    if (paid.current) return;
    paid.current = true;
    const won = index === queen;
    onEarn(won ? 2 : 0);
    onWin?.(won);
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="Monte" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The false queen</p>
          <h2>Monte</h2>
          <img className="plate" src="/monte.jpg" alt="" />
          <p className="table-rule">
            {shown
              ? "The queen starts in the center. Three trades — and the hands cheat once, one more move they will not name. Watch the hands, not the words."
              : picking
                ? "Pick the queen. Remember the cheat."
                : SWAP_WORDS[step]}
          </p>
          <div className="table-row">
            {[0, 1, 2].map((index) => (
              <button key={index} type="button" className="card-btn" disabled={!picking || choice !== null} onClick={() => pick(index)}>
                <span className="card">
                  <b>{shown || choice !== null ? (index === queen ? "Q" : "") : ""}</b>
                  <i>{index === 0 ? "L" : index === 1 ? "C" : "R"}</i>
                </span>
              </button>
            ))}
          </div>
          {choice !== null && (
            <p className="table-end">{choice === queen ? "You kept her through the cheat. Two marks." : "The cheat took her, as they said it would. Nothing for the purse."}</p>
          )}
          {!picking && (
            <button type="button" className="close-book go" onClick={next}>
              {shown ? "Turn them down" : "They trade"}
            </button>
          )}
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
        </div>
      </div>
    </div>
  );
}

const BORDER_CSS = `
.border-score { display: flex; gap: 16px; align-items: baseline; justify-content: center; margin: 8px 0 2px; color: #efe2c8; }
.border-tick { display: inline-block; animation: border-tick .45s cubic-bezier(.2,.8,.3,1); font-size: 22px; font-weight: bold; }
@keyframes border-tick { 0% { transform: scale(1.6); color: #d8b25c; } 100% { transform: scale(1); } }
.border-thrownum { font-size: 14px; opacity: .75; }
.border-dice { display: flex; gap: 10px; align-items: center; justify-content: center; margin: 10px 0 4px; transition: opacity .3s, filter .3s; min-height: 56px; }
.border-dice.dim { opacity: .3; filter: blur(2px); }
.border-side { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.border-sum { color: #efe2c8; font-size: 15px; min-height: 22px; }
.border-vs { color: #8a7a5c; font-size: 13px; align-self: center; }
.border-tie { display: inline-block; animation: border-tie-pulse 1s ease-in-out 2; color: #d8b25c; }
@keyframes border-tie-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
`;

export function Border({
  onResult,
  onClose,
}: {
  onResult: (result: BorderResult) => void;
  onClose: () => void;
}) {
  const [tally, setTally] = useState({ you: 0, them: 0 });
  const [last, setLast] = useState<{ yours: number[]; theirs: number[] } | null>(null);
  const [throwing, setThrowing] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [decisive, setDecisive] = useState<"you" | "them" | null>(null);
  const sent = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const done = borderSeriesDone(tally.you, tally.them);

  function throwDice() {
    if (done || throwing) return;
    // The math is identical to before — computed up front, revealed in stages.
    const yours = [face(), face(), face()];
    const theirs = [face(), face()];
    const a = yours.reduce((total, die) => total + die, 0);
    const b = theirs.reduce((total, die) => total + die, 0);
    const tied = a === b;
    const you = tally.you + (!tied && a > b ? 1 : 0);
    const them = tally.them + (!tied && a < b ? 1 : 0);
    const result = borderSeriesResult(you, them);
    const decided = result !== null;

    // The ceremony: rattle, tumble, land, then the tally ticks.
    setThrowing(true);
    setDecisive(null);
    cupRattle();
    setLast({ yours, theirs });
    setRollKey((k) => k + 1);
    diceClatter(5);

    window.setTimeout(() => {
      if (!mounted.current) return;
      if (tied) {
        // A tie gets its own beat before the rethrow.
        cupThunk();
        window.setTimeout(() => {
          if (mounted.current) setThrowing(false);
        }, 1000);
        return;
      }
      setTally({ you, them });
      cupThunk();
      if (decided && !sent.current) {
        // The series-winning throw lands harder: glow, pause, then the result.
        setDecisive(a > b ? "you" : "them");
        window.setTimeout(() => {
          if (!mounted.current) return;
          sent.current = true;
          onResult(result as BorderResult);
        }, 1100);
        return;
      }
      setThrowing(false);
    }, 1250);
  }

  const yourSum = last?.yours.reduce((total, die) => total + die, 0);
  const theirSum = last?.theirs.reduce((total, die) => total + die, 0);
  const tied = last !== null && yourSum === theirSum;
  const throwNum = tally.you + tally.them + 1;

  function throwText(): string {
    if (!last || yourSum === undefined || theirSum === undefined) return "";
    return yourSum > theirSum ? "Your throw takes it." : "The border takes the throw.";
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="The border" onClick={(event) => event.stopPropagation()}>
        <style>{BORDER_CSS}</style>
        <div className="table-top">
          <p className="leaf-kicker">The border</p>
          <h2>Three dice</h2>
          <p className="table-rule">Best of three throws. You throw three, the border throws two, higher sum takes the throw. Take two throws and the square is yours, with a mark. Lose two and it pushes you back a square.</p>
          <div className="border-score">
            <span key={`y${tally.you}`} className="border-tick">
              You {tally.you}
            </span>
            <span className="border-thrownum">{done ? "Series decided" : `Throw ${throwNum} of 3`}</span>
            <span key={`t${tally.them}`} className="border-tick">
              Border {tally.them}
            </span>
          </div>
          {last && (
            <div className={`border-dice${throwing ? " dim" : ""}`}>
              <div className="border-side">
                <div style={{ display: "flex", gap: 10 }}>
                  {last.yours.map((d, i) => (
                    <Die3D key={`y${i}`} value={d} rollKey={rollKey} delay={i * 130} highlight={decisive === "you"} />
                  ))}
                </div>
                <span className="border-sum">{!throwing ? `You · ${yourSum}` : " "}</span>
              </div>
              <span className="border-vs">vs</span>
              <div className="border-side">
                <div style={{ display: "flex", gap: 10 }}>
                  {last.theirs.map((d, i) => (
                    <Die3D key={`t${i}`} value={d} rollKey={rollKey} delay={70 + i * 130} highlight={decisive === "them"} />
                  ))}
                </div>
                <span className="border-sum">{!throwing ? `Border · ${theirSum}` : " "}</span>
              </div>
            </div>
          )}
          {last && !throwing && (
            <p className="table-end" key={`r${rollKey}`}>
              {tied ? <span className="border-tie">A tie. Throw again.</span> : throwText()}
            </p>
          )}
          {throwing && <p className="table-end">The bones are in the air.</p>}
          {done && (
            <p className="table-rule">
              {tally.you >= 2 ? "You took it. One mark." : "It pushes you back a square."}
            </p>
          )}
          {!done && (
            <button type="button" className="close-book go" onClick={throwDice} disabled={throwing}>
              {throwing ? "Throwing…" : last ? "Throw again" : "Throw"}
            </button>
          )}
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
        </div>
      </div>
    </div>
  );
}
