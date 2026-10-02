import { useEffect, useState } from "react";
import { bumpHouse, startHouse, type HouseState } from "@/lib/reliquary/scaffold";

export function Scaffold({ onStand, onFall, onClose }: { onStand: () => void; onFall: () => void; onClose: () => void }) {
  const [state, setState] = useState<HouseState>(() => startHouse());
  const [done, setDone] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let id: number | null = null;
    if (!done && state.standing && !state.fell) {
      id = window.setInterval(() => {
        setState((s) => bumpHouse(s, 400));
      }, 400);
    }
    return () => {
      if (id !== null) window.clearInterval(id);
    };
  }, [done, state.standing, state.fell]);

  useEffect(() => {
    if (reported) return;
    if (state.fell) {
      setDone(true);
      setReported(true);
      onFall();
      return;
    }
    if (state.standing && state.elapsed >= state.time) {
      setDone(true);
      setReported(true);
      onStand();
    }
  }, [state, reported, onFall, onStand]);

  function bump() {
    setState((s) => bumpHouse(s, 200));
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="The scaffold" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The scaffold</p>
          <h2>A house of cards</h2>
          <p className="table-rule">The table bumps. Keep it standing until the lamp settles.</p>
          <div style={{ height: 8, background: "#222", borderRadius: 4, margin: "8px 0" }}>
            <div style={{ height: 8, background: "#8c9", borderRadius: 4, width: `${Math.min(100, (state.elapsed / state.time) * 100)}%` }} />
          </div>
          {!done && (
            <button type="button" className="close-book go" onClick={bump}>
              Brace
            </button>
          )}
          {state.fell && <p className="table-end">It fell.</p>}
          {done && !state.fell && <p className="table-end">It is still standing.</p>}
          {done && (
            <button type="button" className="close-book" onClick={onClose}>
              Stand up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}