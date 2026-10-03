import { useRef, useState } from "react";
import { canSetWord, nixRoute, setWord, TILE_ALPHABET } from "@/lib/reliquary/mire";
import { War } from "@/components/reliquary/Quick";

export function Tiles({
  onAddLetter,
  letters,
  onClose,
}: {
  onAddLetter: (letter: string) => void;
  letters: string[];
  onClose: () => void;
}) {
  function take() {
    const pool = TILE_ALPHABET.filter((l) => !letters.includes(l));
    if (pool.length === 0) return;
    const letter = pool[Math.floor(Math.random() * pool.length)];
    onAddLetter(letter);
  }
  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col mire-table" role="dialog" aria-label="Letter tile" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker mire-kicker">The mud</p>
          <h2>Letter tile</h2>
          <p className="table-rule">You pluck a letter from the broken tiles in the silt.</p>

          <div className="mire-mud-bed">
            {letters.length > 0 && (
              <div>
                <p className="table-rule" style={{ marginBottom: 8, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Letters carried in pockets:
                </p>
                <div className="table-row" style={{ gap: 8, justifyContent: "center" }}>
                  {letters.map((l, i) => (
                    <span key={`${l}-${i}`} className="mire-tile" style={{ cursor: "default" }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button type="button" className="mire-btn go" onClick={take}>
                Take a letter tile
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="mire-btn" onClick={onClose}>
              Stand up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Yard({
  letters,
  word,
  onSetWord,
  onClose,
}: {
  letters: string[];
  word: string | null;
  onSetWord: (word: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(word ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const canMake = canSetWord(letters);
  function pick(letter: string) {
    if (picked.length >= 3) return;
    if (!letters.includes(letter)) return;
    setPicked((p) => [...p, letter]);
  }
  function clearPick() {
    setPicked([]);
  }
  function make() {
    const res = setWord(letters, picked, form);
    if (!res) return;
    onSetWord(res.word);
    setPicked([]);
    setForm("");
  }
  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col mire-table" role="dialog" aria-label="The yard" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker mire-kicker">The mire</p>
          <h2>The yard</h2>
          <img className="plate" src="/plates/rune-cards.jpg" alt="Old rune-marked cards" />
          <p className="table-rule">Three letters make a word. Pick three from your letters and spell them in order.</p>

          <div className="mire-mud-bed">
            <div>
              <p className="table-rule" style={{ marginBottom: 8, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Picked sequence ({picked.length}/3):
              </p>
              <div className="table-row" style={{ gap: 10, justifyContent: "center", minHeight: 70 }}>
                {[0, 1, 2].map((idx) => (
                  <span key={idx} className={`mire-tile ${picked[idx] ? "picked-slot" : ""}`}>
                    {picked[idx] || "—"}
                  </span>
                ))}
              </div>
            </div>

            <input
              value={form}
              onChange={(e) => setForm(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="THREE LETTER WORD"
              className="mire-input"
            />

            <div>
              <p className="table-rule" style={{ marginBottom: 8, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Available letter tiles:
              </p>
              <div className="table-row" style={{ flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {letters.length === 0 && <span style={{ opacity: 0.6, fontStyle: "italic" }}>No letters held</span>}
                {letters.map((l, i) => (
                  <button key={`${l}-${i}`} type="button" className="mire-tile" onClick={() => pick(l)} disabled={picked.includes(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-row" style={{ justifyContent: "center", gap: 12 }}>
              <button type="button" className="mire-btn" onClick={clearPick}>
                Clear picked
              </button>
              <button type="button" className="mire-btn go" onClick={make} disabled={!canMake || picked.length !== 3 || form.length !== 3}>
                Set word
              </button>
            </div>

            {word && <p className="table-end" style={{ textAlign: "center", margin: 0 }}>Active word: <b>{word}</b></p>}
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="mire-btn" onClick={onClose}>
              Stand up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Nix({
  pocket,
  word,
  onPass,
  onLamp,
  onClose,
}: {
  pocket: string[];
  word: string | null;
  onPass: (route: "ace" | "word") => void;
  onLamp: () => void;
  onClose: () => void;
}) {
  const route = nixRoute(pocket, word);
  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="Nix" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The mire</p>
          <h2>Nix</h2>
          <img className="plate" src="/plates/mud-dice.jpg" alt="Dice and torn cards sunk in the mud" />
          <p className="table-rule">A saint who sank. The Black Ace clears him, or a word from the yard does. Neither, and you go into the lamp.</p>
          {route === "ace" && (
            <button type="button" className="close-book go" onClick={() => onPass("ace")}>
              Spend the Black Ace
            </button>
          )}
          {route === "word" && (
            <button type="button" className="close-book go" onClick={() => onPass("word")}>
              Spend the word ({word})
            </button>
          )}
          {route === "lamp" && (
            <button type="button" className="close-book go" onClick={() => onLamp()}>
              Go into the lamp
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
export function NixLamp({
  onPass,
  onFleece,
  onClose,
}: {
  onPass: () => void;
  onFleece: () => void;
  onClose: () => void;
}) {
  const [duels, setDuels] = useState<boolean[]>([]);
  const [round, setRound] = useState(0);
  const [resting, setResting] = useState(false);
  const fired = useRef(false);
  const you = duels.filter(Boolean).length;
  const nix = duels.length - you;
  const over = you >= 2 || nix >= 2;

  function duelEnd(won: boolean) {
    const next = [...duels, won];
    setDuels(next);
    setResting(true);
    if (!fired.current && (next.filter(Boolean).length >= 2 || next.length - next.filter(Boolean).length >= 2)) {
      fired.current = true;
      if (next.filter(Boolean).length >= 2) onPass();
      else onFleece();
    }
  }

  function nextDuel() {
    setResting(false);
    setRound((r) => r + 1);
  }

  return (
    <div className="journal-back" onClick={onClose}>
      <div className="table one-col" role="dialog" aria-label="Nix's lamp" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The lamp</p>
          <h2>Nix's lamp</h2>
          <p className="table-rule">
            Nix opens the lamp. Loose cards creep in at the edge of the light. Best of three duels of war.
            Take two and he drops. Lose two and he takes two marks.
          </p>
          <p className="table-end">
            You {you} — Nix {nix}
          </p>
          {!over && !resting && (
            <War
              key={round}
              onEarn={() => {}}
              onResult={duelEnd}
              winNote="You take the duel."
              loseNote="Nix takes the duel."
            />
          )}
          {!over && resting && (
            <button type="button" className="close-book go" onClick={nextDuel}>
              Next duel
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
