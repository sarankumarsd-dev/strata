import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MapThumb } from "@/components/board/MapThumb";
import { MAP_LIST } from "@/lib/maps";

type Mode = "strategy" | "drop";

export function Maps() {
  const [mode, setMode] = useState<Mode>("strategy");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Pick a map to start</h1>
            <p className="mt-2 text-muted-foreground">All the maps are in 8K HD satellite imagery and 10× zoomable. Click on any map to open.</p>
          </div>
          <div className="relative flex items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
            {/* sliding active indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-md bg-primary shadow transition-all duration-300 ease-in-out"
              style={{
                width: "calc(50% - 6px)",
                left: mode === "strategy" ? "4px" : "calc(50% + 2px)",
              }}
            />
            <button
              onClick={() => setMode("strategy")}
              className={`relative z-10 flex w-36 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                mode === "strategy" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" /> New Strategy
            </button>
            <button
              onClick={() => setMode("drop")}
              className={`relative z-10 flex w-36 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                mode === "drop" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-4 w-4" /> Mark Drop
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MAP_LIST.map((m) => (
            <Link
              key={m.id}
              to={mode === "strategy" ? `/board?map=${m.id}` : `/drop?map=${m.id}`}
              className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:glow-primary"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <MapThumb map={m} showLabels />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors">{m.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.biome}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
