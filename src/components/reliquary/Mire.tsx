import { useState } from "react";
import { canSetWord, nixRoute, setWord, TILE_ALPHABET } from "@/lib/reliquary/mire";

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
      <div className="table one-col" role="dialog" aria-label="Letter tile" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The mud</p>
          <h2>Letter tile</h2>
          <p className="table-rule">You pluck a letter from the broken tiles.</p>
          {letters.length > 0 && <p className="table-rule">Held: {letters.join(", ")}</p>}
          <button type="button" className="close-book go" onClick={take}>
            Take a letter
          </button>
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
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
      <div className="table one-col" role="dialog" aria-label="The yard" onClick={(event) => event.stopPropagation()}>
        <div className="table-top">
          <p className="leaf-kicker">The mire</p>
          <h2>The yard</h2>
          <p className="table-rule">Three letters make a word. Pick three from your letters and spell them in order.</p>
          <p className="table-rule">Letters: {letters.join(", ") || "none"}</p>
          <p className="table-rule">Picked: {picked.join(", ") || "none"}</p>
          <input
            value={form}
            onChange={(e) => setForm(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="THREE LETTER WORD"
            className="table-rule"
            style={{ width: "100%" }}
          />
          <div className="table-row" style={{ flexWrap: "wrap", gap: 4 }}>
            {letters.map((l) => (
              <button key={l} type="button" className="close-book" onClick={() => pick(l)} disabled={picked.includes(l)}>
                {l}
              </button>
            ))}
          </div>
          <div className="table-row">
            <button type="button" className="close-book" onClick={clearPick}>
              Clear
            </button>
            <button type="button" className="close-book go" onClick={make} disabled={!canMake || picked.length !== 3 || form.length !== 3}>
              Set word
            </button>
          </div>
          {word && <p className="table-end">Word: {word}</p>}
          <button type="button" className="close-book" onClick={onClose}>
            Stand up
          </button>
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