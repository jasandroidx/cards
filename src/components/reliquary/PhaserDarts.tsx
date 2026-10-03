import { useEffect, useRef, useState } from "react";
import type { DartsResult } from "@/lib/phaser-darts/scenes/DartsScene";

/**
 * Darts, rendered by Phaser. Same contract as the SVG version it replaces:
 * three throws, the house answers, onEarn fires exactly once per mount —
 * 1 on a strict win, 0 otherwise (a tie is a loss). No in-place restart;
 * replaying means unmounting and remounting, as before.
 *
 * The Phaser game is created inside the effect (never at module level, so
 * server rendering never touches window) and destroyed on unmount. The
 * `destroyed` flag guards the async boot against StrictMode's mount →
 * unmount → mount cycle: a game whose imports resolve after cleanup is
 * never created.
 */
export function Darts({ onEarn }: { onEarn: (n: number) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const onEarnRef = useRef(onEarn);
  onEarnRef.current = onEarn;
  const paidRef = useRef(false);
  const [result, setResult] = useState<DartsResult | null>(null);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const [phaserModule, sceneModule] = await Promise.all([
        import("phaser"),
        import("@/lib/phaser-darts/scenes/DartsScene"),
      ]);
      if (destroyed || !mountRef.current || gameRef.current) return;
      const Phaser = phaserModule.default;
      const game = new Phaser.Game({
        type: (new URLSearchParams(window.location.search).get("r") === "canvas" ? phaserModule.CANVAS : phaserModule.AUTO) as typeof Phaser.AUTO,
        parent: "phaser-darts-mount",
        width: 1280,
        height: 800,
        backgroundColor: "#070605",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: { antialias: true },
        scene: [sceneModule.DartsScene],
      });
      gameRef.current = game;
      // The scene isn't registered until boot finishes; bind on ready (well
      // before any match can end).
      game.events.once("ready", () => {
        if (destroyed) return;
        const dartsScene = game.scene.getScene("darts") as InstanceType<typeof sceneModule.DartsScene>;
        dartsScene.bindMatchEnd((r: DartsResult) => {
          if (paidRef.current) return;
          paidRef.current = true;
          setResult(r);
          onEarnRef.current(r.won ? 1 : 0);
        });
      });
    })().catch(() => {
      /* Phaser failed to boot — the table-end line below still explains the game */
    });
    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="felt">
      <img className="plate" src="/darts.jpg" alt="" />
      <p className="table-rule">Darts. Three throws. Your arm wavers — time it. Beat the house for a poker chip.</p>
      <div ref={mountRef} id="phaser-darts-mount" className="phaser-darts-mount" role="img" aria-label="Dartboard" />
      <p className="table-end">
        {result
          ? result.won
            ? `You scored ${result.you}. They scored ${result.house}. You win a poker chip.`
            : `You scored ${result.you}. They scored ${result.house}. No poker chip.`
          : "Click to throw."}
      </p>
    </div>
  );
}
