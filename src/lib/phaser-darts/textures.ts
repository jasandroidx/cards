import Phaser from "phaser";

export const W = 1280;
export const H = 800;

/** Fullscreen radial vignette: transparent center -> near-black edges. */
export function makeVignette(scene: Phaser.Scene): void {
  if (scene.textures.exists("vignette")) return;
  const tex = scene.textures.createCanvas("vignette", W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.62, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  tex.refresh();
}

/** Soft radial dot, used for dust particles and glow. */
export function makeDot(scene: Phaser.Scene): void {
  if (scene.textures.exists("dot")) return;
  const s = 64;
  const tex = scene.textures.createCanvas("dot", s, s);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,244,220,1)");
  g.addColorStop(0.4, "rgba(232,214,170,0.55)");
  g.addColorStop(1, "rgba(232,214,170,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  tex.refresh();
}

/** Warm candle glow, additive-blended over the board. */
export function makeGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists("glow")) return;
  const s = 512;
  const tex = scene.textures.createCanvas("glow", s, s);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,190,110,0.85)");
  g.addColorStop(0.45, "rgba(230,150,70,0.28)");
  g.addColorStop(1, "rgba(230,150,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  tex.refresh();
}

/**
 * A dart pointing up (tip at top). ~26x90. Drawn once, reused for flights
 * and stuck darts.
 */
export function makeDart(scene: Phaser.Scene): void {
  if (scene.textures.exists("dart")) return;
  const w = 36;
  const h = 110;
  const tex = scene.textures.createCanvas("dart", w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const cx = w / 2;

  // flights: dark red vanes with a gold spine
  ctx.fillStyle = "#5c130d";
  ctx.beginPath();
  ctx.moveTo(cx, 34);
  ctx.lineTo(cx - 13, 66);
  ctx.lineTo(cx - 13, 96);
  ctx.lineTo(cx, 82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7a1e14";
  ctx.beginPath();
  ctx.moveTo(cx, 34);
  ctx.lineTo(cx + 13, 66);
  ctx.lineTo(cx + 13, 96);
  ctx.lineTo(cx, 82);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d8b25c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 34);
  ctx.lineTo(cx, 84);
  ctx.stroke();

  // shaft: brass
  const shaft = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
  shaft.addColorStop(0, "#8a6a22");
  shaft.addColorStop(0.5, "#f4dc9a");
  shaft.addColorStop(1, "#8a6a22");
  ctx.fillStyle = shaft;
  ctx.fillRect(cx - 3.5, 30, 7, 44);

  // collar
  ctx.fillStyle = "#3a2a10";
  ctx.fillRect(cx - 5, 70, 10, 6);

  // tip: steel needle
  const steel = ctx.createLinearGradient(cx - 3, 0, cx + 3, 0);
  steel.addColorStop(0, "#7a828c");
  steel.addColorStop(0.5, "#f2f5f7");
  steel.addColorStop(1, "#7a828c");
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(cx - 3.5, 30);
  ctx.lineTo(cx, 2);
  ctx.lineTo(cx + 3.5, 30);
  ctx.closePath();
  ctx.fill();

  tex.refresh();
}
