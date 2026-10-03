import Phaser from "phaser";
import { ORDER, scoreFrom, cpuAim, type Throw } from "../logic";
import { takeFirstGameNudge } from "@/lib/reliquary/onboarding";
import { dartThud, wallThud } from "../audio";
import { W, H, makeVignette, makeDot, makeGlow, makeGrain, makeDart } from "../textures";

const BX = 640; // board center x
const BY = 392; // board center y
const S = 2; // board units -> pixels

const GOLD = "#d8b25c";
const PALE = "#e8dcc0";
const DIM = "#8a7a5c";
const BLOOD = 0x6e1a12; // dried blood — the red wedges, muted
const MOSS = 0x152219; // dark moss — the green wedges, muted
const BLACK_WEDGE = 0x0e0b08;
const UMBER = 0x241b11; // aged dark wood for the pale singles

export interface DartsResult {
  you: number;
  house: number;
  won: boolean;
}

function wedgePath(g: Phaser.GameObjects.Graphics, index: number, inner: number, outer: number): void {
  const step = (Math.PI * 2) / 20;
  const start = -Math.PI / 2 - step / 2 + index * step;
  const end = start + step;
  g.beginPath();
  g.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
  g.arc(0, 0, outer, start, end, false);
  g.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
  g.arc(0, 0, inner, end, start, true);
  g.closePath();
  g.fillPath();
}

export class DartsScene extends Phaser.Scene {
  private board!: Phaser.GameObjects.Container;
  private throws: Throw[] = [];
  private cpuThrows: Throw[] = [];
  private flying = false;
  private over = false;
  private cpuTurn = false;

  private youScoreText!: Phaser.GameObjects.Text;
  private houseScoreText!: Phaser.GameObjects.Text;
  private labelText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Image[] = [];
  private lampGlow!: Phaser.GameObjects.Image;
  private lampBaseAlpha = 0.16;
  private houseDimmed = false;
  private crosshair!: Phaser.GameObjects.Container;
  private grainA!: Phaser.GameObjects.TileSprite;
  private grainB!: Phaser.GameObjects.TileSprite;
  private shownYou = 0;
  private shownHouse = 0;
  private elapsed = 0;
  private swayX = 0;
  private swayY = 0;
  private pointerX = BX;
  private pointerY = BY;
  private pointerSeen = false;

  /** Called once when the match ends. Bound by the React bridge before boot. */
  private onMatchEnd: (result: DartsResult) => void = () => undefined;
  // Onboarding nudge: claimed once per scene; while held, the arm's sway is
  // gentled so the first match lands near the aim.
  private nudged = false;

  constructor() {
    super("darts");
  }

  /** The React bridge calls this right after constructing the scene, before the game boots. */
  public bindMatchEnd(cb: (result: DartsResult) => void): void {
    this.onMatchEnd = cb;
  }

  create(): void {
    this.nudged = takeFirstGameNudge();
    makeVignette(this);
    makeDot(this);
    makeGlow(this);
    makeGrain(this);
    makeDart(this);

    this.drawDark();

    // ---- the board ----
    this.board = this.add.container(BX, BY).setDepth(2);
    const g = this.add.graphics();
    this.drawBoard(g);
    this.board.add(g);

    // numbers ring — small, dim, bone-colored
    for (let i = 0; i < 20; i++) {
      const step = (Math.PI * 2) / 20;
      const a = -Math.PI / 2 + i * step;
      const t = this.add
        .text(Math.cos(a) * 318, Math.sin(a) * 318, String(ORDER[i]), {
          fontFamily: "Georgia, serif",
          fontSize: "19px",
          color: "#a89878",
        })
        .setOrigin(0.5)
        .setAlpha(0.85);
      this.board.add(t);
    }

    // pointer tracking + the swaying crosshair
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.pointerX = p.x;
      this.pointerY = p.y;
      this.pointerSeen = true;
    });
    this.drawCrosshair();
    const cursorApi = this.input as unknown as { setDefaultCursor?: (c: string) => void };
    cursorApi.setDefaultCursor?.("none");

    // invisible hit area
    const zone = this.add.zone(BX, BY, 680, 680).setInteractive({ useHandCursor: false });
    zone.on("pointerdown", (p: Phaser.Input.Pointer) => this.onAim(p.x, p.y));

    // ---- lamp glow from the right, like the one that lit the checkers board ----
    this.lampGlow = this.add
      .image(W - 170, 250, "glow")
      .setDepth(5)
      .setScale(3.2)
      .setAlpha(this.lampBaseAlpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    const lampCore = this.add
      .image(W - 170, 250, "glow")
      .setDepth(5)
      .setScale(1.1)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD);

    // grain + vignette over everything but the UI
    this.grainA = this.add.tileSprite(W / 2, H / 2, W, H, "grain").setDepth(6).setAlpha(0.045);
    this.grainB = this.add.tileSprite(W / 2, H / 2, W, H, "grain").setDepth(6).setAlpha(0.03);
    this.add.image(W / 2, H / 2, "vignette").setDepth(6).setDisplaySize(W, H);
    lampCore.setDepth(5);

    this.drawUI();

    this.hintText.setText("Your arm wavers. Time the throw.");
  }

  // ---------- backdrop ----------

  private drawDark(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x050403, 1);
    g.fillRect(0, 0, W, H);
    // a breath of warm air on the right, where the lamp stands
    for (let r = 620; r > 0; r -= 31) {
      const a = 0.022 * (1 - r / 620);
      g.fillStyle(0xff9a4a, a);
      g.fillCircle(W - 170, 250, r);
    }
    // the dark pools at the bottom
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, H - 150, W, 150);
  }

  private drawBoard(g: Phaser.GameObjects.Graphics): void {
    // drop shadow
    g.fillStyle(0x000000, 0.7);
    g.fillEllipse(14, 22, 700, 700);
    // worn wood surround
    g.fillStyle(0x1a120a, 1);
    g.fillCircle(0, 0, 348);
    g.fillStyle(0x100b06, 1);
    g.fillCircle(0, 0, 340);
    g.lineStyle(3, 0x060403, 1);
    g.strokeCircle(0, 0, 346);
    // aged brass band
    g.lineStyle(12, 0x8a6a2a, 1);
    g.strokeCircle(0, 0, 332);
    g.lineStyle(2, 0xc7a54e, 0.45);
    g.strokeCircle(0, 0, 326);
    g.lineStyle(2, 0x3a2c10, 1);
    g.strokeCircle(0, 0, 338);
    // number ring bed
    g.fillStyle(0x060403, 1);
    g.fillCircle(0, 0, 326);
    // felt bed
    g.fillStyle(0x0a0705, 1);
    g.fillCircle(0, 0, 300);

    // wedges — dried blood and dark moss
    for (let i = 0; i < 20; i++) {
      const alt = i % 2 === 0;
      g.fillStyle(alt ? BLOOD : MOSS, 1);
      wedgePath(g, i, 272, 300); // doubles
      g.fillStyle(alt ? BLACK_WEDGE : UMBER, 1);
      wedgePath(g, i, 44, 272); // singles
      g.fillStyle(alt ? BLOOD : MOSS, 1);
      wedgePath(g, i, 192, 224); // triples
    }
    // bulls
    g.fillStyle(MOSS, 1);
    g.fillCircle(0, 0, 44);
    g.fillStyle(BLOOD, 1);
    g.fillCircle(0, 0, 20);

    // brass wires, dulled
    g.lineStyle(2, 0x8a6a2a, 0.4);
    for (const r of [300, 272, 224, 192, 44, 20]) g.strokeCircle(0, 0, r);
    g.lineStyle(1.5, 0x8a6a2a, 0.25);
    const step = (Math.PI * 2) / 20;
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 - step / 2 + i * step;
      g.beginPath();
      g.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
      g.lineTo(Math.cos(a) * 300, Math.sin(a) * 300);
      g.strokePath();
    }
    // wear: pale scuffs where darts have landed for years
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 220;
      g.fillStyle(0xc7b088, 0.03 + Math.random() * 0.04);
      g.fillCircle(Math.cos(a) * r, Math.sin(a) * r, 2 + Math.random() * 5);
    }
    // seat the board: soft dark rim inside the felt edge
    for (let r = 300; r > 282; r -= 3) {
      g.lineStyle(3, 0x000000, 0.16 * (1 - (300 - r) / 18));
      g.strokeCircle(0, 0, r);
    }
  }

  private drawCrosshair(): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0xd8b25c, 0.95);
    g.strokeCircle(0, 0, 13);
    g.lineStyle(2, 0xd8b25c, 0.7);
    g.lineBetween(-24, 0, -17, 0);
    g.lineBetween(17, 0, 24, 0);
    g.lineBetween(0, -24, 0, -17);
    g.lineBetween(0, 17, 0, 24);
    g.fillStyle(0xd8b25c, 0.95);
    g.fillCircle(0, 0, 2);
    this.crosshair = this.add.container(this.pointerX, this.pointerY, [g]).setDepth(7);
  }

  // ---------- UI ----------

  private drawUI(): void {
    const ui = this.add.container(0, 0).setDepth(10);

    // scores — small, no boxes, no shouting
    ui.add(
      this.add
        .text(96, 92, "you", { fontFamily: "Georgia, serif", fontSize: "15px", color: DIM, fontStyle: "italic" })
        .setOrigin(0.5),
    );
    this.youScoreText = this.add
      .text(96, 138, "0", { fontFamily: "Georgia, serif", fontSize: "46px", color: PALE })
      .setOrigin(0.5);
    ui.add(this.youScoreText);
    ui.add(
      this.add
        .text(W - 96, 92, "house", { fontFamily: "Georgia, serif", fontSize: "15px", color: DIM, fontStyle: "italic" })
        .setOrigin(0.5),
    );
    this.houseScoreText = this.add
      .text(W - 96, 138, "0", { fontFamily: "Georgia, serif", fontSize: "46px", color: PALE })
      .setOrigin(0.5);
    ui.add(this.houseScoreText);

    // dart pips under your score
    for (let i = 0; i < 3; i++) {
      const pip = this.add.image(64 + i * 32, 210, "dart").setScale(0.32).setAlpha(0.4);
      ui.add(pip);
      this.pips.push(pip);
    }

    // throw label + hint
    this.labelText = this.add
      .text(W / 2, H - 108, "", {
        fontFamily: "Georgia, serif",
        fontSize: "21px",
        color: GOLD,
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    ui.add(this.labelText);
    this.hintText = this.add
      .text(W / 2, H - 72, "", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#6a5c42",
      })
      .setOrigin(0.5);
    ui.add(this.hintText);

    // banner (hidden until the match ends; not interactive — no restart in the game)
    this.banner = this.add.container(W / 2, H / 2).setDepth(20).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x070503, 0.95);
    bg.fillRoundedRect(-300, -110, 600, 220, 10);
    bg.lineStyle(2, 0x8a6a2a, 0.7);
    bg.strokeRoundedRect(-300, -110, 600, 220, 10);
    this.bannerText = this.add
      .text(0, -10, "", {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color: PALE,
        align: "center",
        wordWrap: { width: 540 },
      })
      .setOrigin(0.5);
    this.banner.add([bg, this.bannerText]);
  }

  // ---------- gameplay ----------

  private onAim(px: number, py: number): void {
    // No restart: once the match is over the board is dead, like the original.
    if (this.over) return;
    if (this.flying || this.cpuTurn || this.throws.length >= 3) return;

    this.pointerX = px;
    this.pointerY = py;
    this.pointerSeen = true;

    // the dart goes where the swaying crosshair is, plus a breath of error
    const bx = (px - BX) / S + this.swayX;
    const by = (py - BY) / S + this.swayY;
    const jx = (Math.random() - 0.5) * 7;
    const jy = (Math.random() - 0.5) * 7;
    const hit = scoreFrom(bx + jx, by + jy);
    const hx = BX + (bx + jx) * S;
    const hy = BY + (by + jy) * S;
    const missed = hit.label === "Miss";

    this.flying = true;
    this.crosshair.setVisible(false);
    this.flyDart(hx, hy, () => this.landPlayerDart(hit, hx, hy, missed));
  }

  /** Tween a dart from below the board to the hit point. */
  private flyDart(hx: number, hy: number, onLand: () => void): void {
    const startX = BX + (Math.random() - 0.5) * 60;
    const dart = this.add
      .image(startX, H + 70, "dart")
      .setDepth(4)
      .setScale(1.5)
      .setAngle(-12);
    this.tweens.add({
      targets: dart,
      x: hx,
      y: hy,
      scale: 0.85,
      angle: 4,
      duration: 380,
      ease: "Quad.easeIn",
      onComplete: () => {
        dart.destroy();
        onLand();
      },
    });
  }

  private landPlayerDart(hit: Throw, hx: number, hy: number, missed: boolean): void {
    this.throws.push(hit);
    if (missed) {
      wallThud();
      this.stickDart(hx, hy, false);
    } else {
      dartThud();
      this.stickDart(hx, hy, true);
      this.dustBurst(hx, hy);
      if (this.isPremium(hit)) this.flareLamp();
    }
    this.wobbleBoard(this.isPremium(hit) ? 1.8 : 1);
    this.flying = false;
    this.pips[this.throws.length - 1]?.setAlpha(1);
    this.labelText.setText(missed ? "Into the dark — nothing." : `${hit.label} — ${hit.score}`);
    this.countUp(this.youScoreText, this.shownYou, this.total(this.throws), (v) => (this.shownYou = v));

    if (this.throws.length >= 3) {
      this.time.delayedCall(900, () => this.startHouseTurn());
    } else {
      this.crosshair.setVisible(true);
    }
  }

  private startHouseTurn(): void {
    this.cpuTurn = true;
    this.crosshair.setVisible(false);
    this.labelText.setText("The house takes aim…");
    this.hintText.setText("Do not breathe.");
    this.dimLamp();
    this.time.delayedCall(1200, () => this.cpuSequence(0));
  }

  private cpuSequence(n: number): void {
    if (n >= 3) {
      this.cpuTurn = false;
      this.restoreLamp();
      this.finish();
      return;
    }
    const aim = cpuAim();
    const hit = scoreFrom(aim.dx, aim.dy);
    const hx = BX + aim.dx * S;
    const hy = BY + aim.dy * S;
    const missed = hit.label === "Miss";
    this.flying = true;
    this.flyDart(hx, hy, () => {
      this.cpuThrows.push(hit);
      if (missed) {
        wallThud();
        this.stickDart(hx, hy, false);
      } else {
        dartThud();
        this.stickDart(hx, hy, true);
        this.dustBurst(hx, hy);
        if (this.isPremium(hit)) this.flareLamp();
      }
      this.wobbleBoard(this.isPremium(hit) ? 1.8 : 1);
      this.flying = false;
      this.labelText.setText(missed ? "The house misses. It does not miss often." : `The house throws — ${hit.label}`);
      this.countUp(this.houseScoreText, this.shownHouse, this.total(this.cpuThrows), (v) => (this.shownHouse = v));
      this.time.delayedCall(850, () => this.cpuSequence(n + 1));
    });
  }

  private finish(): void {
    this.over = true;
    const you = this.total(this.throws);
    const house = this.total(this.cpuThrows);
    const won = you > house;
    this.bannerText.setText(won ? "You take the match.\nOne poker chip." : "The house takes the match.\nNothing for the purse.");
    this.bannerText.setColor(won ? "#f4dc9a" : "#9a8a6a");
    this.banner.setVisible(true);
    this.banner.setAlpha(0);
    this.banner.setScale(0.92);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 450, ease: "Cubic.easeOut" });
    this.hintText.setText(won ? "The lamp pays." : "The cards have not moved.");
    this.onMatchEnd({ you, house, won });
  }

  private isPremium(hit: Throw): boolean {
    return hit.label.startsWith("Triple") || hit.label.startsWith("Double") || hit.label === "Bull";
  }

  private dimLamp(): void {
    this.houseDimmed = true;
    this.tweens.killTweensOf(this.lampGlow);
    this.tweens.add({ targets: this.lampGlow, alpha: 0.05, duration: 700, ease: "Sine.easeInOut" });
  }

  private restoreLamp(): void {
    this.houseDimmed = false;
    this.tweens.killTweensOf(this.lampGlow);
    this.tweens.add({ targets: this.lampGlow, alpha: this.lampBaseAlpha, duration: 700, ease: "Sine.easeInOut" });
  }

  /** The lamp flares when a treble, double, or bull lands. */
  private flareLamp(): void {
    this.tweens.killTweensOf(this.lampGlow);
    this.lampGlow.setAlpha(0.4);
    this.tweens.add({
      targets: this.lampGlow,
      alpha: this.houseDimmed ? 0.05 : this.lampBaseAlpha,
      duration: 550,
      ease: "Sine.easeOut",
    });
  }

  // ---------- effects ----------

  private stickDart(hx: number, hy: number, onBoard: boolean, house = false): void {
    // tip of the texture is at top-center; origin y ~0.02 plants the tip at the hit point
    const d = this.add
      .image(onBoard ? hx - BX : hx, onBoard ? hy - BY : hy, "dart")
      .setOrigin(0.5, 0.02)
      .setScale(0.5)
      .setAngle(-6 + Math.random() * 12);
    if (onBoard) {
      this.board.add(d);
    } else {
      d.setDepth(2).setAlpha(0.85); // in the wall beyond the board — it does not wobble with it
    }
    if (house) d.setAlpha(0.92);
    // fading hit glow
    const glowDot = this.add
      .image(hx, hy, "dot")
      .setDepth(3)
      .setScale(0.9)
      .setAlpha(onBoard ? 0.8 : 0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd98a);
    this.tweens.add({ targets: glowDot, alpha: 0, scale: 1.6, duration: 500, onComplete: () => glowDot.destroy() });
  }

  private dustBurst(hx: number, hy: number): void {
    const p = this.add.particles(hx, hy, "dot", {
      speed: { min: 40, max: 170 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.65, end: 0 },
      lifespan: { min: 300, max: 650 },
      quantity: 16,
      tint: [0xd8c49a, 0x8a6a3a, 0x5c4a2a],
      emitting: false,
    });
    p.setDepth(4);
    p.explode(16);
    this.time.delayedCall(900, () => p.destroy());
  }

  private wobbleBoard(strength = 1): void {
    const b = this.board;
    this.tweens.killTweensOf(b);
    b.setAngle(0);
    this.tweens.add({
      targets: b,
      angle: 1.1 * strength,
      duration: 70,
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: b,
          angle: -0.6 * strength,
          duration: 110,
          onComplete: () => {
            this.tweens.add({ targets: b, angle: 0, duration: 220, ease: "Sine.easeOut" });
          },
        });
      },
    });
  }

  private total(throws: Throw[]): number {
    return throws.reduce((t, d) => t + d.score, 0);
  }

  private countUp(text: Phaser.GameObjects.Text, from: number, to: number, set: (v: number) => void): void {
    if (from === to) return;
    const obj = { v: from };
    this.tweens.add({
      targets: obj,
      v: to,
      duration: 350,
      ease: "Sine.easeOut",
      onUpdate: () => {
        const r = Math.round(obj.v);
        set(r);
        text.setText(String(r));
      },
    });
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta / 1000;
    const t = this.elapsed;

    // the arm's sway: layered sines the player times their throw against
    const k = this.nudged ? 0.35 : 1;
    this.swayX = (Math.sin(t * 1.9) * 10 + Math.sin(t * 3.7 + 1.3) * 6) * k;
    this.swayY = (Math.cos(t * 1.6 + 0.5) * 10 + Math.sin(t * 4.3 + 2.1) * 6) * k;
    if (!this.flying && !this.cpuTurn && !this.over && this.pointerSeen) {
      this.crosshair.setPosition(this.pointerX + this.swayX * S, this.pointerY + this.swayY * S);
    }

    // grain drifts, barely
    this.grainA.tilePositionX += delta * 0.004;
    this.grainB.tilePositionY -= delta * 0.003;

    // candle flicker: layered sines + the odd random dip
    const n =
      Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.7 + 1.7) * 0.3 + Math.sin(t * 29.1 + 0.6) * 0.2;
    let a = this.lampBaseAlpha + n * 0.028;
    if (Math.random() < 0.006) a -= 0.05; // the flame gutters for a heartbeat
    if (!this.houseDimmed && !this.tweens.isTweening(this.lampGlow)) {
      this.lampGlow.setAlpha(Phaser.Math.Clamp(a, 0.05, 0.24));
    }
  }
}
