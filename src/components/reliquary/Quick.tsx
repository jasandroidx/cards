import { useEffect, useRef, useState } from "react";

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
  if (!card || down) return <span className="card empty">Card</span>;
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const mark = card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : card.suit === "clubs" ? "♣" : "♠";
  return (
    <span className={red ? "card red" : "card"}>
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

export function War({ onEarn }: { onEarn: (n: number) => void }) {
  const [state, setState] = useState(() => {
    const deck = makeDeck([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    return { yours: deck.slice(0, 26), theirs: deck.slice(26), flips: 0, youCard: undefined as C | undefined, cpuCard: undefined as C | undefined, war: false, done: false };
  });
  const paid = useRef(false);

  function finish(yours: C[], theirs: C[]) {
    if (paid.current) return;
    paid.current = true;
    onEarn(yours.length > theirs.length ? 1 : 0);
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
    setState({ yours: next.yours, theirs: next.theirs, flips, youCard: next.youCard, cpuCard: next.cpuCard, war: next.war, done });
    if (done) finish(next.yours, next.theirs);
  }

  return (
    <div className="felt">
      <img className="plate" src="/war.jpg" alt="" />
      <p className="table-rule">War. Twelve flips. Higher card takes both. Same rank means war: one card down, one card up. Most cards left wins a mark.</p>
      <div className="table-row">
        <div>
          <Face key={state.youCard?.id ?? "you"} card={state.youCard} />
          <span>You {state.yours.length}</span>
        </div>
        <div>
          <Face key={state.cpuCard?.id ?? "them"} card={state.cpuCard} />
          <span>Them {state.theirs.length}</span>
        </div>
      </div>
      {state.war && !state.done && <p className="table-end">War.</p>}
      {state.done && (
        <p className="table-end">{state.yours.length > state.theirs.length ? "You have more cards. One mark." : "They have more. Nothing for the purse."}</p>
      )}
      {!state.done && (
        <button type="button" className="close-book go" onClick={flip}>
          Flip ({12 - state.flips} left)
        </button>
      )}
    </div>
  );
}

function drawUp(hand: C[], pond: C[]): { hand: C[]; pond: C[] } {
  if (hand.length > 0 || pond.length === 0) return { hand, pond };
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
        {you.map((card) => (
          <Face key={card.id} card={card} />
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
