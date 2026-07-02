import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, LogOut, User, MapPin } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "@/lib/toast";

interface Strategy {
  id: string;
  map: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface DropCardRecord {
  id: string;
  map: string;
  title: string;
  pins: { teamName: string; color: string; x: number; y: number }[];
  created_at: string;
  updated_at: string;
}

type Tab = "strategy" | "drop";

export function MyStrata() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("strategy");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [dropCards, setDropCards] = useState<DropCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    supabase.from("profiles").select("username").eq("id", user.id).single()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: strats }, { data: drops }] = await Promise.all([
      supabase
        .from("strategies")
        .select("id, map, title, description, tags, is_public, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("drop_cards")
        .select("id, map, title, pins, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false }),
    ]);
    setStrategies(strats ?? []);
    setDropCards(drops ?? []);
    setLoading(false);
  }

  async function deleteStrategy(id: string) {
    const { error } = await supabase.from("strategies").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast.success("Strategy deleted");
    }
  }

  async function deleteDropCard(id: string) {
    const { error } = await supabase.from("drop_cards").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setDropCards((prev) => prev.filter((d) => d.id !== id));
      toast.success("Drop card deleted");
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-sm text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">My Strata</div>
            <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Your saved work</h1>
            <p className="mt-2 text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              {username ? `@${username}` : user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <Link to="/drop">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" /> Mark Drop
              </Button>
            </Link>
            <Link to="/maps">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New board
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit">
          <button
            onClick={() => setTab("strategy")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "strategy"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Strategy Card
          </button>
          <button
            onClick={() => setTab("drop")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              tab === "drop"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Drop Card
          </button>
        </div>

        {/* Strategy Card tab */}
        {tab === "strategy" && (
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
              <p className="text-muted-foreground">No strategies saved yet.</p>
              <Link to="/maps" className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Create your first board
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {strategies.map((s) => (
                <div key={s.id} className="drop-card group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all">
                  <div className="h-2 w-full bg-gradient-to-r from-primary to-secondary opacity-70" />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold truncate group-hover:text-primary transition-colors">{s.title}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.map}</p>
                      </div>
                      {/* Delete button with traveling red border around its own edges */}
                      <button
                        onClick={() => deleteStrategy(s.id)}
                        className="delete-btn relative grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all overflow-hidden"
                        title="Delete"
                      >
                        <svg className="travel-border-svg pointer-events-none absolute inset-0 w-full h-full opacity-0">
                          <rect x="0.75" y="0.75" width="98.5%" height="98.5%" rx="5" ry="5"
                            fill="none" stroke="#ef4444" strokeWidth="1.5"
                            strokeDasharray="12 100" strokeLinecap="round"
                            pathLength="112"
                            style={{ animation: "travel-border 0.9s linear infinite", strokeDashoffset: 12 }}
                          />
                        </svg>
                        <Trash2 className="h-3.5 w-3.5 relative z-10" />
                      </button>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                    )}
                    {s.tags && s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-auto pt-2">
                        {s.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                      <Link
                        to={`/board?map=${s.map}&strategy=${s.id}`}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Drop Card tab */}
        {tab === "drop" && (
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : dropCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
              <p className="text-muted-foreground">No drop cards saved yet.</p>
              <Link to="/drop" className="mt-4">
                <Button variant="outline" className="gap-2">
                  <MapPin className="h-4 w-4" /> Mark your first drop
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dropCards.map((d) => (
                <div key={d.id} className="drop-card group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all">
                  <div className="h-2 w-full bg-gradient-to-r from-primary/60 to-primary opacity-70" />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold truncate transition-colors">{d.title}</h3>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{d.map}</p>
                      </div>
                      {/* Delete button with traveling red border around its own edges */}
                      <button
                        onClick={() => deleteDropCard(d.id)}
                        className="delete-btn relative grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all overflow-hidden"
                        title="Delete"
                      >
                        <svg className="travel-border-svg pointer-events-none absolute inset-0 w-full h-full opacity-0">
                          <rect x="0.75" y="0.75" width="98.5%" height="98.5%" rx="5" ry="5"
                            fill="none" stroke="#ef4444" strokeWidth="1.5"
                            strokeDasharray="12 100" strokeLinecap="round"
                            pathLength="112"
                            style={{ animation: "travel-border 0.9s linear infinite", strokeDashoffset: 12 }}
                          />
                        </svg>
                        <Trash2 className="h-3.5 w-3.5 relative z-10" />
                      </button>
                    </div>
                    {/* Team pins preview */}
                    {d.pins && d.pins.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {d.pins.map((pin, i) => (
                          <div key={i} className="flex items-center gap-1 rounded-full bg-white/5 border border-border px-2 py-0.5">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: pin.color }} />
                            <span className="text-[10px] text-muted-foreground">{pin.teamName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </span>
                      <Link
                        to={`/drop?map=${d.map}&drop=${d.id}`}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
