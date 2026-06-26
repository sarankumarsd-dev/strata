import { useSearchParams, Link } from "react-router-dom";
import { BoardEditor } from "@/components/board/BoardEditor";
import { getMap } from "@/lib/maps";

export function Board() {
  const [params] = useSearchParams();
  const mapId = params.get("map") ?? "erangel";
  const map = getMap(mapId);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="font-heading text-lg font-bold tracking-tight">
            Stra<span className="text-primary">ta</span>
          </Link>
          <Link to="/maps" className="rounded-md px-4 py-1.5 text-sm font-semibold transition-colors" style={{ color: "#39ff14", border: "1px solid #39ff1466", background: "#39ff140f" }}>
            ← Back to maps
          </Link>
        </div>
      </header>
      <BoardEditor map={map} />
    </div>
  );
}
