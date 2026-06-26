import { Link } from "react-router-dom";
import { ArrowRight, Crosshair, MapPin, Mountain, Route as RouteIcon, Sparkles, Target } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { StrategyCard } from "@/components/StrategyCard";
import { Button } from "@/components/ui";

const FEATURES = [
  { icon: Target, title: "God spots & chokes", body: "Mark elevated cover and forced funnels along any zone circle. AI can scan the circle and place them for you.", color: "text-success" },
  { icon: Mountain, title: "High & low ground", body: "Paint elevation polygons to call out advantage and risk before the squad rotates.", color: "text-warning" },
  { icon: Crosshair, title: "Gun range arrows", body: "Pick AKM, M416, Kar98 or AWM and project effective hittable range as a cone on the map.", color: "text-warning" },
  { icon: RouteIcon, title: "Rotation splits", body: "Draw start → end and ask AI to propose 2-2 or 3-1 split paths with rationale.", color: "text-primary" },
  { icon: Sparkles, title: "Rush plans", body: "Drop a target and AI calls split-rush vs stack-rush with a risk read.", color: "text-secondary" },
];

// Demo featured strategies (local build has no community backend).
const FEATURED = [
  { id: "demo1", map: "erangel", title: "Pochinki center-hold into 3rd circle", description: "Stack the church compound, project AWM lanes north, rotate low through the creek.", tags: ["endgame", "hold", "squad"], like_count: 128, author: { username: "zonecaller" } },
  { id: "demo2", map: "miramar", title: "Hacienda high-ground anchor", description: "Own the south ridge, split 2-2 to pinch El Pozo pushes.", tags: ["highground", "miramar"], like_count: 86, author: { username: "dustdevil" } },
  { id: "demo3", map: "erangel", title: "Georgopol bridge denial", description: "Choke the north bridge with DMR cones, deny the island rotate.", tags: ["choke", "denial"], like_count: 64, author: { username: "bridgewatch" } },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 hud-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              BGMI Strategy Analyzer
            </div>
            <h1 className="mt-5 font-heading text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              The strategy board <br />
              your squad <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">deserves</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Plan zone fights like a pro. Mark god spots, draw rotation splits, project gun ranges, and let AI critique your push — all on official BGMI maps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/forum">
                <Button size="lg" variant="outline">Browse the forum</Button>
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground self-center mr-1">Start your strata</div>
              <Link to="/maps">
                <Button size="lg" className="gap-2 glow-primary">
                  Strategy Card <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/drop">
                <Button size="lg" variant="outline" className="gap-2">
                  <MapPin className="h-4 w-4" /> Drop Card
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Toolkit</div>
          <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Five tools, one tactical canvas</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50">
              <f.icon className={`h-6 w-6 ${f.color}`} />
              <h3 className="mt-4 font-heading text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured strategies */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">Community</div>
            <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Top strategies right now</h2>
          </div>
          <Link to="/forum" className="text-sm text-muted-foreground hover:text-foreground">All strategies →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((s) => (
            <StrategyCard key={s.id} {...s} />
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-center font-mono text-xs text-muted-foreground">
          Strata · BGMI Strategy Analyzer · Fan-made, not affiliated with Krafton
        </div>
      </footer>
    </div>
  );
}
