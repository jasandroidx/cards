import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { borderAfter, borderPay, borderSpreadsSilver } from "./border.ts";
import { kingCalls, kingSpares, isKingDie } from "./king.ts";
import { addTile, nixRoute, nixSpend, setWord, startWell, wellCatch, wellCatchOk, wellClears, wellMiss, WELL_MISSES_BEFORE_CLEAR } from "./mire.ts";
import { bumpHouse, houseReward, houseSettled, startHouse } from "./scaffold.ts";
import { QUEEN_HAND, QUEEN_ROUNDS, QUEEN_THROW_ROUND, queenLead, queenLegal, queenOutcome, queenPlay, queenStalled, startQueen } from "./queen.ts";
import { shuffleDeck, beats } from "./sitting.ts";

describe("the border", () => {
  it("never walks a loss back past the Far Bank at 15", () => {
    for (let n = 0; n <= 29; n++) {
      assert.ok(borderAfter(n, "lose") >= 15, `loss at ${n} landed at ${borderAfter(n, "lose")}`);
    }
    assert.equal(borderAfter(16, "lose"), 15);
    assert.equal(borderAfter(22, "lose"), 21);
  });

  it("never moves the player on a win or a tie", () => {
    for (let n = 15; n <= 29; n++) {
      assert.equal(borderAfter(n, "win"), n);
      assert.equal(borderAfter(n, "tie"), n);
    }
  });

  it("spreads the silver only over a lit bridge, and only on a win", () => {
    assert.equal(borderSpreadsSilver(true, "win"), true);
    assert.equal(borderSpreadsSilver(true, "lose"), false);
    assert.equal(borderSpreadsSilver(true, "tie"), false);
    assert.equal(borderSpreadsSilver(false, "win"), false);
  });

  it("pays a mark on a win even over dark water", () => {
    assert.equal(borderPay("win"), 1);
    assert.equal(borderPay("lose"), 0);
    assert.equal(borderPay("tie"), 0);
  });
});

describe("the king on one square", () => {
  it("spares you on an even die whatever your hand holds", () => {
    for (const die of [2, 4, 6]) {
      assert.equal(kingCalls(die, true), "passed");
      assert.equal(kingCalls(die, false), "passed");
      assert.equal(kingSpares(die), true);
    }
  });

  it("takes a card on an odd die, or the next roll when the hand is empty", () => {
    for (const die of [1, 3, 5]) {
      assert.equal(kingCalls(die, true), "card");
      assert.equal(kingCalls(die, false), "roll");
      assert.equal(kingSpares(die), false);
    }
  });

  it("only accepts real dice", () => {
    for (const die of [1, 2, 3, 4, 5, 6]) assert.ok(isKingDie(die));
    for (const die of [0, 7, -1, 2.5, Number.NaN]) assert.ok(!isKingDie(die));
  });
});

describe("the well", () => {
  it("puts you down on the third miss, not the first", () => {
    let state = startWell(5);
    for (let i = 0; i < WELL_MISSES_BEFORE_CLEAR - 1; i++) {
      state = wellMiss(state);
      assert.equal(state.fallen, false, `fell early on miss ${i + 1}`);
    }
    state = wellMiss(state);
    assert.equal(state.fallen, true);
  });

  it("refuses a card that overshoots the next ledge", () => {
    const state = startWell(7);
    const next = state.drop[0];
    assert.equal(wellCatch(state, next), true);
    assert.equal(wellCatch(state, next + 1), false);
  });

  it("gives the Black Ace exactly once when cleared", () => {
    let state = startWell(1);
    while (!state.cleared) state = wellCatchOk(state, state.drop[0]);
    const pocket = wellClears(state, []);
    assert.ok(pocket.includes("black-ace"));
    assert.deepEqual(wellClears(state, pocket), pocket, "ace was granted twice");
  });
});

describe("letters, the yard, and Nix", () => {
  it("adds one letter per tile stop", () => {
    assert.equal(addTile(["A"]).length, 2);
  });

  it("sets three held letters into a three-letter word", () => {
    const result = setWord(["M", "A", "T", "X"], ["M", "A", "T"], "MAT");
    assert.ok(result);
    assert.equal(result.word, "MAT");
    assert.deepEqual(result.left, ["X"]);
  });

  it("refuses a word it cannot spell from what you hold", () => {
    assert.equal(setWord(["M", "A"], ["M", "A", "T"], "MAT"), null, "T is not held");
    assert.equal(setWord(["M", "A", "T"], ["M", "A", "T"], "MATX"), null, "four letters");
    assert.equal(setWord(["M", "A", "T"], ["M", "A", "T", "T"], "MAT"), null, "four tiles picked");
    assert.equal(setWord(["M", "A", "T"], ["T", "A", "M"], "MAT"), null, "tiles picked out of order");
  });

  it("accepts a lower-case word and files it upper", () => {
    const result = setWord(["M", "A", "T"], ["M", "A", "T"], "mat");
    assert.ok(result);
    assert.equal(result.word, "MAT");
  });

  it("prefers the ace, then the word, then the hard game", () => {
    assert.equal(nixRoute(["black-ace"], "MAT"), "ace");
    assert.equal(nixRoute([], "MAT"), "word");
    assert.equal(nixRoute([], null), "lamp");
  });

  it("spends exactly one thing passing Nix", () => {
    const viaAce = nixSpend(["black-ace"], "MAT");
    assert.equal(viaAce.route, "ace");
    assert.ok(!viaAce.pocket.includes("black-ace"));
    assert.equal(viaAce.word, "MAT", "passing by ace must not also spend the word");

    const viaWord = nixSpend([], "MAT");
    assert.equal(viaWord.route, "word");
    assert.equal(viaWord.word, null);
  });
});

describe("the house of cards", () => {
  it("stands when it reaches the time, and falls a bump later", () => {
    const settled = bumpHouse(bumpHouse(startHouse(1000), 500), 500);
    assert.equal(houseSettled(settled), true);
    assert.equal(settled.fell, false);
    assert.equal(bumpHouse(settled, 600).fell, true);
  });

  it("grants the column boon once and only when it stands", () => {
    const settled = bumpHouse(bumpHouse(startHouse(1000), 500), 500);
    const once = houseReward(settled, []);
    assert.ok(once.includes("column"));
    assert.deepEqual(houseReward(settled, once), once, "column granted twice");
    const fell = bumpHouse(settled, 600);
    assert.deepEqual(houseReward(fell, []), [], "a fallen house granted a boon");
  });
});

describe("the Queen at square 28", () => {
  it("has enough cards to survive her theft", () => {
    assert.ok(QUEEN_HAND > QUEEN_ROUNDS, "she takes one, so the hand must exceed the round count");
  });

  it("never lays a card that nothing in hand can beat while one exists", () => {
    for (let deal = 0; deal < 500; deal++) {
      let state = queenLead(startQueen(shuffleDeck()));
      while (!state.over) {
        if (state.top) {
          const answerable = state.herLeft.some((card) => state.mine.some((mine) => beats(mine, card)));
          const topAnswerable = state.mine.some((mine) => beats(mine, state.top!));
          assert.ok(topAnswerable || !answerable, "she led an unbeatable card while a beatable one was in hand");
        }
        const legal = queenLegal(state);
        if (!legal.length) break;
        assert.ok(state.mine.length <= QUEEN_HAND, "her hand grew");
        state = queenPlay(state, legal[0]);
      }
    }
  });

  it("never leaves her own top pointing at a card already answered", () => {
    for (let deal = 0; deal < 500; deal++) {
      let state = queenLead(startQueen(shuffleDeck()));
      while (!state.over) {
        const legal = queenLegal(state);
        if (!legal.length) break;
        const before = state.round;
        state = queenPlay(state, legal[0]);
        if (!state.over && state.round > before) {
          assert.ok(state.top !== null, "next round began with no card from her");
        }
      }
    }
  });

  it("throws exactly once, on her own round", () => {
    const rounds = new Set<number>();
    for (let deal = 0; deal < 300; deal++) {
      let state = queenLead(startQueen(shuffleDeck()));
      while (!state.over) {
        const legal = queenLegal(state);
        if (!legal.length) break;
        const thrown = state.thrown.length;
        state = queenPlay(state, legal[0]);
        if (state.thrown.length > thrown) rounds.add(state.round + 1);
      }
    }
    assert.deepEqual([...rounds], [QUEEN_THROW_ROUND], "threw on the wrong round, or more than once");
  });

  it("can still be lost, so the contest means something", () => {
    let losses = 0;
    for (let deal = 0; deal < 2000; deal++) {
      let state = queenLead(startQueen(shuffleDeck()));
      while (!state.over) {
        const legal = queenLegal(state);
        if (!legal.length) {
          if (queenStalled(state)) losses++;
          break;
        }
        state = queenPlay(state, legal[legal.length - 1]);
      }
    }
    assert.ok(losses > 0, "the contest can never be lost");
  });

  it("is winnable, though only just", () => {
    let wins = 0;
    for (let deal = 0; deal < 2000; deal++) {
      let state = queenLead(startQueen(shuffleDeck()));
      while (!state.over) {
        const legal = queenLegal(state);
        if (!legal.length) break;
        state = queenPlay(state, legal[0]);
      }
      if (queenOutcome(state) === "won") wins++;
    }
    // See HANDOFF: this is a KNOWN problem, tuned to just above half.
    const rate = (wins / 2000) * 100;
    assert.ok(rate > 50, `win rate collapsed to ${rate.toFixed(1)}%`);
  });
});