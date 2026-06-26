import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { StrategyCard } from "@/components/StrategyCard";
import { Button } from "@/components/ui";

const DEMO = [
  { id: "demo1", map: "erangel", title: "Pochinki center-hold into 3rd circle", description: "Stack the church compound, project AWM lanes north, rotate low through the creek.", tags: ["endgame", "hold", "squad"], like_count: 128, author: { username: "zonecaller" } },
  { id: "demo2", map: "miramar", title: "Hacienda high-ground anchor", description: "Own the south ridge, split 2-2 to pinch El Pozo pushes.", tags: ["highground", "miramar"], like_count: 86, author: { username: "dustdevil" } },
  { id: "demo3", map: "erangel", title: "Georgopol bridge denial", description: "Choke the north bridge with DMR cones, deny the island rotate.", tags: ["choke", "denial"], like_count: 64, author: { username: "bridgewatch" } },
  { id: "demo4", map: "miramar", title: "Los Leones vertical fight", description: "Use rooftop god spots, rush split through the plaza on 4th zone.", tags: ["urban", "rush"], like_count: 51, author: { username: "rooftopgod" } },
];

export function Forum() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">Community</div>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Strategy forum</h1>
            <p className="mt-2 text-muted-foreground">Demo cards shown — publishing &amp; likes need the hosted Strata backend.</p>
          </div>
          <Link to="/maps"><Button className="gap-2">Create a board</Button></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO.map((s) => <StrategyCard key={s.id} {...s} />)}
        </div>
      </section>
    </div>
  );
}
