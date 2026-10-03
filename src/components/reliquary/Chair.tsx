/** The chair: the ending. Won the last Klondike at the Reliquary. */
export function Chair({
  marks,
  boons,
  onAgain,
}: {
  marks: number;
  boons: string[];
  onAgain: () => void;
}) {
  return (
    <div className="win-sol chair-end">
      <header className="win-bar">
        <span>The chair</span>
        <span className="win-menu">End</span>
      </header>
      <div className="chair-vista">
        <p className="leaf-kicker">Back where you started</p>
        <h2>You are back in the chair.</h2>
        <p className="leaf-body">
          The deck is the one you carried. The room is the same room. Nothing
          here remembers the road but you.
        </p>
        <p className="leaf-relic">
          {marks} mark{marks === 1 ? "" : "s"} carried home
          {boons.length > 0 ? ` · boons: ${boons.join(", ")}` : " · no boons"}
        </p>
        <button type="button" className="close-book go" onClick={onAgain}>
          Begin again
        </button>
      </div>
    </div>
  );
}
