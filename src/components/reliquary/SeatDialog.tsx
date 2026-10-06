import React from "react";
import type { Square } from "@/lib/reliquary/road";

type Props = {
  square: Square;
  onClose: () => void;
  onChoice: (side: "left" | "right") => void;
};

export function SeatDialog({ square, onClose, onChoice }: Props) {
  const { character, characterDesc, dialogue, choice } = square;
  return (
    <div className="seat-dialog" role="dialog" aria-label="Seat Dialog">
      <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
      {character && (
        <img src={`/characters/${character.toLowerCase()}.png`} alt={character} className="character-portrait" />
      )}
      {characterDesc && <p className="character-desc">{characterDesc}</p>}
      {dialogue && dialogue.map((line, i) => (
        <p key={i} className="dialogue-line">{line}</p>
      ))}
      {choice && (
        <div className="choice-buttons">
          <button className="choice-btn left" onClick={() => onChoice("left")}>{choice.left.text}</button>
          <button className="choice-btn right" onClick={() => onChoice("right")}>{choice.right.text}</button>
        </div>
      )}
    </div>
  );
}
