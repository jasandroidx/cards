import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/reliquary/Board";
import { Chair } from "@/components/reliquary/Chair";
import { Solitaire } from "@/components/reliquary/Solitaire";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mode, setMode] = useState<"wait" | "cards" | "road" | "chair">("wait");
  const [epitaph, setEpitaph] = useState<{ marks: number; boons: string[] }>({ marks: 0, boons: [] });

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

  function again() {
    try {
      localStorage.removeItem("reliquary-v3");
    } catch {
      // a fresh run needs no save
    }
    setEpitaph({ marks: 0, boons: [] });
    setMode("cards");
  }

  return (
    <main className="page">
      {mode === "road" ? (
        <Board
          onReturn={(marks, boons) => {
            setEpitaph({ marks, boons });
            setMode("chair");
          }}
        />
      ) : mode === "cards" ? (
        <Solitaire onFall={fall} />
      ) : mode === "chair" ? (
        <Chair marks={epitaph.marks} boons={epitaph.boons} onAgain={again} />
      ) : (
        <div className="win-sol" />
      )}
    </main>
  );
}
