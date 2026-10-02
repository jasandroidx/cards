import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/reliquary/Board";
import { Solitaire } from "@/components/reliquary/Solitaire";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mode, setMode] = useState<"wait" | "cards" | "road">("wait");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reliquary-v3");
      const data = raw ? (JSON.parse(raw) as { position?: number; fallen?: boolean }) : null;
      const landed = Boolean(data?.fallen) || (typeof data?.position === "number" && data.position >= 0);
      setMode(landed ? "road" : "cards");
    } catch {
      setMode("cards");
    }
  }, []);

  function fall(cards: { rank: number; suit: string }[]) {
    const raw = localStorage.getItem("reliquary-v3");
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(
      "reliquary-v3",
      JSON.stringify({
        marks: 0,
        owned: [],
        mawBeaten: false,
        heard: false,
        ...prev,
        fallen: true,
        position: -1,
        carried: cards,
      }),
    );
    setMode("road");
  }

  return (
    <main className="page">
      {mode === "road" ? <Board /> : mode === "cards" ? <Solitaire onFall={fall} /> : <div className="win-sol" />}
    </main>
  );
}
