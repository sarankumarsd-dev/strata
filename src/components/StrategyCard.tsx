import { Link } from "react-router-dom";
import { Heart, Map as MapIcon } from "lucide-react";
import { getMap } from "@/lib/maps";
import { MapThumb } from "@/components/board/MapThumb";

interface Props {
  id: string;
  map: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  like_count?: number;
  author?: { username: string } | null;
}

export function StrategyCard({ id, map, title, description, tags, like_count, author }: Props) {
  const m = getMap(map);
  return (
    <Link
      to={`/board?map=${m.id}&demo=${id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:glow-primary"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <MapThumb map={m} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/80 to-transparent p-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
            <MapIcon className="h-3 w-3" /> {m.name} · {m.biome}
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-base font-semibold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{author ? `@${author.username}` : ""}</span>
          <span className="flex items-center gap-1 font-mono">
            <Heart className="h-3 w-3" /> {like_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
