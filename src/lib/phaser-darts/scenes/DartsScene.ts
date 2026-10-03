import Phaser from "phaser";
import { ORDER, scoreFrom, cpuAim, playerScatter, type Throw } from "../logic";
import { takeFirstGameNudge } from "@/lib/reliquary/onboarding";
import { dartThud } from "../audio";
import { W, H, makeVignette, makeDot, makeGlow, makeDart } from "../textures";

const BX = 640; // board center x
const BY = 392; // board center y
const S = 2; // board units -> pixels (original viewBox 320, radius 150)

const GOLD = "#d8b25c";
const PALE = "#f0e4ca";
const RED = 0x8a221c;
const GREEN = 0x1e4a2e;
const BLACK_WEDGE = 0x14100d;
const PARCHMENT = 0xc7b088;

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
  private glow!: Phaser.GameObjects.Image;
  private shownYou = 0;
  private shownHouse = 0;
  private elapsed = 0;

  /** Called once when the match ends. Bound by the React bridge before boot. */
  private onMatchEnd: (result: DartsResult) => void = () => undefined;
  // Onboarding nudge: claimed once per scene; while held, the player's
  // scatter is gentled so the first match lands near the aim.
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
    makeDart(this);

    this.drawTavernWall();

    // ---- the board ----
    this.board = this.add.container(BX, BY).setDepth(2);
    const g = this.add.graphics();
    this.drawBoard(g);
    this.board.add(g);

    // numbers ring
    for (let i = 0; i < 20; i++) {
      const step = (Math.PI * 2) / 20;
      const a = -Math.PI / 2 + i * step;
      const t = this.add
        .text(Math.cos(a) * 315, Math.sin(a) * 315, String(ORDER[i]), {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: i % 2 === 0 ? "#f4ead6" : GOLD,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.board.add(t);
    }

    // invisible hit area
    const zone = this.add.zone(BX, BY, 640, 640).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (p: Phaser.Input.Pointer) => this.onAim(p.x, p.y));

    // ---- candle glow + vignette ----
    this.glow = this.add
      .image(BX, BY - 20, "glow")
      .setDepth(5)
      .setScale(2.4)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(W / 2, H / 2, "vignette").setDepth(6).setDisplaySize(W, H);

    this.drawUI();

    this.hintText.setText("Click the board — your arm wavers, and the house aims at triple twenty.");
  }

  // ---------- backdrop ----------

  private drawTavernWall(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x0d0906, 1);
    g.fillRect(0, 0, W, H);
    // planks
    const plankW = 92;
    let x = 0;
    let i = 0;
    while (x < W) {
      const shades = [0x120c07, 0x0f0a06, 0x141009, 0x100b07];
      g.fillStyle(shades[i % shades.length], 1);
      g.fillRect(x, 0, plankW, H);
      g.fillStyle(0x060403, 1);
      g.fillRect(x, 0, 3, H);
      // grain
      g.lineStyle(1, 0x1c130a, 0.5);
      for (let k = 0; k < 4; k++) {
        const gx = x + 12 + ((k * 37 + i * 53) % (plankW - 24));
        g.beginPath();
        g.moveTo(gx, 0);
        g.lineTo(gx + ((i * 7 + k * 13) % 9) - 4, H);
        g.strokePath();
      }
      x += plankW;
      i++;
    }
    // warm wash upper-left, as if from an unseen candle
    for (let r = 560; r > 0; r -= 28) {
      const a = 0.028 * (1 - r / 560);
      g.fillStyle(0xff9a4a, a);
      g.fillCircle(180, 120, r);
    }
    // floor shadow at the bottom
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, H - 130, W, 130);
  }

  private drawBoard(g: Phaser.GameObjects.Graphics): void {
    // drop shadow
    g.fillStyle(0x000000, 0.65);
    g.fillEllipse(14, 22, 700, 700);
    // wood surround
    g.fillStyle(0x2a1a0e, 1);
    g.fillCircle(0, 0, 348);
    g.fillStyle(0x1c1208, 1);
    g.fillCircle(0, 0, 340);
    g.lineStyle(3, 0x0a0603, 1);
    g.strokeCircle(0, 0, 346);
    // brass band
    g.lineStyle(12, 0xd8b25c, 1);
    g.strokeCircle(0, 0, 332);
    g.lineStyle(2, 0xf4dc9a, 0.9);
    g.strokeCircle(0, 0, 326);
    g.lineStyle(2, 0x5c4416, 1);
    g.strokeCircle(0, 0, 338);
    // number ring bed
    g.fillStyle(0x0a0705, 1);
    g.fillCircle(0, 0, 326);
    // felt bed
    g.fillStyle(0x0d0907, 1);
    g.fillCircle(0, 0, 300);

    // wedges
    for (let i = 0; i < 20; i++) {
      const alt = i % 2 === 0;
      g.fillStyle(alt ? RED : GREEN, 1);
      wedgePath(g, i, 272, 300); // doubles
      g.fillStyle(alt ? BLACK_WEDGE : PARCHMENT, 1);
      wedgePath(g, i, 44, 272); // singles
      g.fillStyle(alt ? RED : GREEN, 1);
      wedgePath(g, i, 192, 224); // triples
    }
    // bulls
    g.fillStyle(GREEN, 1);
    g.fillCircle(0, 0, 44);
    g.fillStyle(RED, 1);
    g.fillCircle(0, 0, 20);

    // brass wires
    g.lineStyle(2, 0xd8b25c, 0.5);
    for (const r of [300, 272, 224, 192, 44, 20]) g.strokeCircle(0, 0, r);
    g.lineStyle(1.5, 0xd8b25c, 0.32);
    const step = (Math.PI * 2) / 20;
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 - step / 2 + i * step;
      g.beginPath();
      g.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
      g.lineTo(Math.cos(a) * 300, Math.sin(a) * 300);
      g.strokePath();
    }
    // seat the board: soft dark rim inside the felt edge
    for (let r = 300; r > 282; r -= 3) {
      g.lineStyle(3, 0x000000, 0.16 * (1 - (300 - r) / 18));
      g.strokeCircle(0, 0, r);
    }
  }

  // ---------- UI ----------

  private drawUI(): void {
    const ui = this.add.container(0, 0).setDepth(10);

    // title
    ui.add(
      this.add
        .text(W / 2, 34, "D A R T S", {
          fontFamily: "Georgia, serif",
          fontSize: "30px",
          color: GOLD,
        })
        .setOrigin(0.5),
    );
    ui.add(
      this.add
        .text(W / 2, 66, "Three throws against the house. Beat their score for a mark.", {
          fontFamily: "Georgia, serif",
          fontSize: "16px",
          color: "#9a8a6a",
          fontStyle: "italic",
        })
        .setOrigin(0.5),
    );

    // totems
    this.makeTotem(ui, 150, "YOU");
    this.makeTotem(ui, W - 150, "HOUSE");
    this.youScoreText = this.add
      .text(150, 248, "0", { fontFamily: "Georgia, serif", fontSize: "58px", color: PALE })
      .setOrigin(0.5);
    ui.add(this.youScoreText);
    this.houseScoreText = this.add
      .text(W - 150, 248, "0", { fontFamily: "Georgia, serif", fontSize: "58px", color: PALE })
      .setOrigin(0.5);
    ui.add(this.houseScoreText);

    // dart pips under YOU
    for (let i = 0; i < 3; i++) {
      const pip = this.add.image(108 + i * 42, 340, "dart").setScale(0.4).setAlpha(0.5);
      ui.add(pip);
      this.pips.push(pip);
    }

    // throw label + hint
    this.labelText = this.add
      .text(W / 2, H - 108, "", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: GOLD,
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    ui.add(this.labelText);
    this.hintText = this.add
      .text(W / 2, H - 72, "", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#7a6a4a",
      })
      .setOrigin(0.5);
    ui.add(this.hintText);

    // banner (hidden until the match ends; not interactive — no restart in the game)
    this.banner = this.add.container(W / 2, H / 2).setDepth(20).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0705, 0.94);
    bg.fillRoundedRect(-300, -110, 600, 220, 10);
    bg.lineStyle(2, 0xd8b25c, 0.8);
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

  private makeTotem(ui: Phaser.GameObjects.Container, x: number, name: string): void {
    const g = this.add.graphics();
    g.fillStyle(0x120c07, 0.92);
    g.fillRoundedRect(x - 110, 120, 220, 190, 8);
    g.lineStyle(2, 0xd8b25c, 0.55);
    g.strokeRoundedRect(x - 110, 120, 220, 190, 8);
    g.lineStyle(1, 0xd8b25c, 0.3);
    g.strokeRoundedRect(x - 104, 126, 208, 178, 6);
    ui.add(g);
    ui.add(
      this.add
        .text(x, 158, name, { fontFamily: "Georgia, serif", fontSize: "20px", color: GOLD })
        .setOrigin(0.5),
    );
  }

  // ---------- gameplay ----------

  private onAim(px: number, py: number): void {
    // No restart: once the match is over the board is dead, like the original.
    if (this.over) return;
    if (this.flying || this.cpuTurn || this.throws.length >= 3) return;

    // to board units, then scatter (gentled for the first-game nudge)
    const bx = (px - BX) / S;
    const by = (py - BY) / S;
    const raw = playerScatter(bx, by);
    const s = this.nudged
      ? { dx: bx + (raw.dx - bx) * 0.35, dy: by + (raw.dy - by) * 0.35 }
      : raw;
    const hit = scoreFrom(s.dx, s.dy);
    const hx = BX + s.dx * S;
    const hy = BY + s.dy * S;

    this.flying = true;
    this.flyDart(hx, hy, () => this.landPlayerDart(hit, hx, hy));
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

  private landPlayerDart(hit: Throw, hx: number, hy: number): void {
    this.throws.push(hit);
    dartThud();
    this.stickDart(hx, hy);
    this.dustBurst(hx, hy);
    this.wobbleBoard();
    this.flying = false;
    this.pips[this.throws.length - 1]?.setAlpha(1);
    this.labelText.setText(`${hit.label} — ${hit.score}`);
    this.countUp(this.youScoreText, this.shownYou, this.total(this.throws), (v) => (this.shownYou = v));

    if (this.throws.length >= 3) {
      this.hintText.setText("The house takes its turn…");
      this.time.delayedCall(900, () => this.cpuSequence(0));
    }
  }

  private cpuSequence(n: number): void {
    if (n === 0) this.cpuTurn = true;
    if (n >= 3) {
      this.cpuTurn = false;
      this.finish();
      return;
    }
    const aim = cpuAim();
    const hit = scoreFrom(aim.dx, aim.dy);
    const hx = BX + aim.dx * S;
    const hy = BY + aim.dy * S;
    this.flying = true;
    this.flyDart(hx, hy, () => {
      this.cpuThrows.push(hit);
      dartThud();
      this.stickDart(hx, hy, true);
      this.dustBurst(hx, hy);
      this.wobbleBoard();
      this.flying = false;
      this.labelText.setText(`The house throws — ${hit.label}`);
      this.countUp(this.houseScoreText, this.shownHouse, this.total(this.cpuThrows), (v) => (this.shownHouse = v));
      this.time.delayedCall(650, () => this.cpuSequence(n + 1));
    });
  }

  private finish(): void {
    this.over = true;
    const you = this.total(this.throws);
    const house = this.total(this.cpuThrows);
    const won = you > house;
    this.bannerText.setText(won ? "You take the match.\nOne mark." : "The house takes the match.\nNothing for the purse.");
    this.bannerText.setColor(won ? "#f4dc9a" : "#9a8a6a");
    this.banner.setVisible(true);
    this.banner.setAlpha(0);
    this.banner.setScale(0.92);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 450, ease: "Cubic.easeOut" });
    this.hintText.setText(won ? "The lamp pays." : "The cards have not moved.");
    this.onMatchEnd({ you, house, won });
  }

  // ---------- effects ----------

  private stickDart(hx: number, hy: number, dim = false): void {
    // tip of the texture is at top-center; origin y ~0.02 plants the tip at the hit point
    const d = this.add
      .image(hx - BX, hy - BY, "dart")
      .setOrigin(0.5, 0.02)
      .setScale(0.5)
      .setAngle(-6 + Math.random() * 12);
    if (dim) d.setAlpha(0.92);
    this.board.add(d);
    // fading hit glow
    const glowDot = this.add
      .image(hx, hy, "dot")
      .setDepth(3)
      .setScale(0.9)
      .setAlpha(0.8)
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

  private wobbleBoard(): void {
    const b = this.board;
    this.tweens.killTweensOf(b);
    b.setAngle(0);
    this.tweens.add({
      targets: b,
      angle: 1.1,
      duration: 70,
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: b,
          angle: -0.6,
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
    // candle flicker: layered sines + the odd random dip
    this.elapsed += delta / 1000;
    const t = this.elapsed;
    const n =
      Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.7 + 1.7) * 0.3 + Math.sin(t * 29.1 + 0.6) * 0.2;
    let a = 0.13 + n * 0.028;
    if (Math.random() < 0.006) a -= 0.05; // the flame gutters for a heartbeat
    this.glow.setAlpha(Phaser.Math.Clamp(a, 0.05, 0.22));
  }
}
