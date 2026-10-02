import { useRef, useState } from "react";
import { face, mabelThrow, yachtScore } from "@/lib/reliquary/bouts";
import type { BorderResult } from "@/lib/reliquary/border";

export function Yacht({ onEarn, onWin, onClose }: { onEarn: (n: number) => void; onWin?: (won: boolean) => void; onClose: () => void }) {
  const [dice, setDice] = useState<number[]>([0, 0, 0, 0, 0]);
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
    const next = dice.map((die, index) => (left < 3 && hold[index] ? die : face()));
    const remain = left - 1;
    setDice(next);
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
                className={hold[index] ? "die held" : "die"}
                disabled={Boolean(hers) || left === 3}
                onClick={() => setHold(hold.map((kept, i) => (i === index ? !kept : kept)))}
              >
                {die || "·"}
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
              ? "The queen starts in the center. Watch the cards, not the words."
              : picking
                ? "Pick the queen."
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
            <p className="table-end">{choice === queen ? "You kept her. Two marks." : "That was not her. The hands moved once without saying so."}</p>
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

export function Border({
  onResult,
  onClose,
}: {
  onResult: (result: BorderResult) => void;
  onClose: () => void;
}) {
  const [you, setYou] = useState<number[] | null>(null);
  const [them, setThem] = useState<number[] | null>(null);
  const sent = useRef(false);

  function throwDice() {
    if (you) return;
    const yours = [face(), face(), face()];
    const theirs = [face(), face()];
    setYou(yours);
    setThem(theirs);
    if (sent.current) return;
    sent.current = true;
    const a = yours.reduce((total, die) => total + die, 0);
    const b = theirs.reduce((total, die) => total + die, 0);
    onResult(a > b ? "win" : a < b ? "lose" : "tie");
  }

  

  const yourSum = you?.reduce((total, die) => total + die, 0);
  const theirSum = them?.reduce((total, die) => total + die, 0);

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="The border" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The border</p>
          <h2>Three dice</h2>
          <p className="table-rule">You throw three. The border throws two. Higher sum takes the square. Lose, and it pushes you back one.</p>
          {you && them && (
            <>
              <p className="table-end">
                You {you.join(" ")} ({yourSum}). Border {them.join(" ")} ({theirSum}).
              </p>
              <p className="table-rule">
                {yourSum !== undefined && theirSum !== undefined && yourSum > theirSum
                  ? "You took it. One mark."
                  : yourSum === theirSum
                    ? "A tie. Nobody moves."
                    : "It pushes you back a square."}
              </p>
            </>
          )}
          {!you && (
            <button type="button" className="close-book go" onClick={throwDice}>
              Throw
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
