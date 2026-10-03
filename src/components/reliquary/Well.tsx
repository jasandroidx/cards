import { useEffect, useState } from "react";
import { WELL_MISSES_BEFORE_CLEAR, startWell, type WellState, wellCatch, wellCatchOk, wellMiss } from "@/lib/reliquary/mire";

export function Well({ onClear, onFail, onClose }: { onClear: () => void; onFail: () => void; onClose: () => void }) {
  const [state, setState] = useState<WellState>(() => startWell(1));
  const [his, setHis] = useState<number[]>([]);
  const [left, setLeft] = useState<number[]>(() => Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 13)));
  const [done, setDone] = useState(false);
  const [reportedFlag, setReportedFlag] = useState(false);

  useEffect(() => {
    if (done || reportedFlag) return;
    if (state.cleared) {
      setDone(true);
      setReportedFlag(true);
      onClear();
      return;
    }
    if (state.fallen) {
      setDone(true);
      setReportedFlag(true);
      onFail();
    }
  }, [state, done, reportedFlag, onClear, onFail]);

  function play(rank: number) {
    if (done || state.fallen || state.cleared) return;
    if (wellCatch(state, rank)) {
      const next = wellCatchOk(state, rank);
      setLeft((list) => list.filter((r) => r !== rank));
      setHis((list) => [...list, next.you]);
      setState(next);
      return;
    }
    const next = wellMiss(state);
    setLeft((list) => list.filter((r) => r !== rank));
    setState(next);
  }

  const nextLedge = state.drop.length ? state.drop[0] : null;

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col mire-table" role="dialog" aria-label="The well" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker mire-kicker">The mire</p>
          <h2>The well</h2>
          <p className="table-rule">Kicking off the ledges. Play a card low enough to catch the next ledge. Miss three times and you go down.</p>

          <div className="mire-well-pool">
            {!done && nextLedge !== null && (
              <div className="mire-ledge-bar">
                <span>Next ledge: <b>{nextLedge}</b></span>
                <span>Bumps: <b>{state.bumps}/{WELL_MISSES_BEFORE_CLEAR - 1}</b></span>
              </div>
            )}

            {state.cleared && <p className="table-end">You caught the last ledge. You carry the Black Ace.</p>}
            {state.fallen && <p className="table-end">You fell into the well.</p>}

            <div className="table-row" style={{ flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {left.map((rank, i) => (
                <button key={`${rank}-${i}`} type="button" className="mire-tile" onClick={() => play(rank)}>
                  {rank}
                </button>
              ))}
            </div>

            {his.length > 0 && (
              <p className="table-rule" style={{ margin: 0, textAlign: "center", fontSize: "14px" }}>
                Caught ledges: {his.join(", ")}
              </p>
            )}
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="mire-btn" onClick={onClose}>
              {done ? "Stand up" : "Leave the well"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}