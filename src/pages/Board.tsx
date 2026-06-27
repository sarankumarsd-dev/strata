import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { BoardEditor } from "@/components/board/BoardEditor";
import { getMap } from "@/lib/maps";
import { supabase } from "@/lib/supabase";
import type { BoardDoc } from "@/lib/board-types";
import { EMPTY_BOARD } from "@/lib/board-types";
import { Loader2 } from "lucide-react";

interface StrategyData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  is_public: boolean;
  board_json: BoardDoc;
}

export function Board() {
  const [params] = useSearchParams();
  const mapId = params.get("map") ?? "erangel";
  const strategyId = params.get("strategy");
  const map = getMap(mapId);

  const [initial, setInitial] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(!!strategyId);

  useEffect(() => {
    if (!strategyId) return;
    setLoading(true);
    supabase
      .from("strategies")
      .select("id, title, description, tags, is_public, board_json")
      .eq("id", strategyId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setInitial({
            id: data.id,
            title: data.title,
            description: data.description ?? "",
            tags: data.tags ?? [],
            is_public: data.is_public,
            board_json: (data.board_json as BoardDoc) ?? EMPTY_BOARD,
          });
        }
        setLoading(false);
      });
  }, [strategyId]);

  return (
    <div className="min-h-screen">
      {loading ? (
        <div className="flex h-[100dvh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <BoardEditor map={map} initial={initial ?? undefined} />
      )}
    </div>
  );
}
