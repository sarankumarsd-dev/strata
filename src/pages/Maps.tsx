import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui";
import { MapThumb } from "@/components/board/MapThumb";
import { MAP_LIST } from "@/lib/maps";

export function Maps() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">New board</div>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Pick a map to start</h1>
            <p className="mt-2 text-muted-foreground">All the maps are in 8K HD satellite imagery and 10× zoomable. Click on any map to open the strategy board.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/drop">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" /> Mark Drop
              </Button>
            </Link>
            <Link to="/my-strata">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Strategy
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MAP_LIST.map((m) => (
            <Link
              key={m.id}
              to={`/board?map=${m.id}`}
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
