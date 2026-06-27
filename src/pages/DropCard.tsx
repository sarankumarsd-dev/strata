import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus, Save, X, MapPin } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button, Input } from "@/components/ui";
import { MapThumb } from "@/components/board/MapThumb";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { MAP_LIST, getMap } from "@/lib/maps";
import type { BgmiMap } from "@/lib/maps";

interface DropPin {
  id: string;
  teamName: string;
  color: string;
  x: number;
  y: number;
}

const TEAM_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  "#14b8a6", "#f59e0b",
];

export function DropCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const mapId = searchParams.get("map") as BgmiMap | null;
  const dropId = searchParams.get("drop");

  const [selectedMap, setSelectedMap] = useState<BgmiMap | null>(mapId);
  const [pins, setPins] = useState<DropPin[]>([]);
  const [teams, setTeams] = useState<{ name: string; color: string }[]>([]);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropId) return;
    supabase.from("drop_cards").select("*").eq("id", dropId).single().then(({ data }) => {
      if (!data) return;
      setSelectedMap(data.map as BgmiMap);
      setTitle(data.title);
      const loadedPins: DropPin[] = data.pins ?? [];
      setPins(loadedPins);
      const teamMap = new Map<string, string>();
      loadedPins.forEach((p) => teamMap.set(p.teamName, p.color));
      setTeams(Array.from(teamMap.entries()).map(([name, color]) => ({ name, color })));
    });
  }, [dropId]);

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (selectedTeamIdx === null || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const team = teams[selectedTeamIdx];
    setPins((prev) => [
      ...prev.filter((p) => p.teamName !== team.name),
      { id: crypto.randomUUID(), teamName: team.name, color: team.color, x, y },
    ]);
  }

  function addTeam() {
    if (!newTeamName.trim()) return;
    const newTeam = { name: newTeamName.trim(), color: newTeamColor };
    setTeams((prev) => [...prev, newTeam]);
    setSelectedTeamIdx(teams.length);
    setNewTeamName("");
    setNewTeamColor(TEAM_COLORS[(teams.length + 1) % TEAM_COLORS.length]);
    setAddingTeam(false);
  }

  function removeTeam(i: number) {
    const teamName = teams[i].name;
    setTeams((prev) => prev.filter((_, idx) => idx !== i));
    setPins((prev) => prev.filter((p) => p.teamName !== teamName));
    if (selectedTeamIdx === i) setSelectedTeamIdx(null);
    else if (selectedTeamIdx !== null && selectedTeamIdx > i) setSelectedTeamIdx(selectedTeamIdx - 1);
  }

  function removePin(id: string) {
    setPins((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveDropCard() {
    if (!title.trim() || !selectedMap || !user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      map: selectedMap,
      title: title.trim(),
      pins,
      updated_at: new Date().toISOString(),
    };
    const { error } = dropId
      ? await supabase.from("drop_cards").update(payload).eq("id", dropId)
      : await supabase.from("drop_cards").insert({ ...payload, created_at: new Date().toISOString() });

    setSaving(false);
    if (error) {
      toast.error("Failed to save drop card");
    } else {
      toast.success("Drop card saved!");
      setSaveDialogOpen(false);
      navigate("/my-strata");
    }
  }

  // Map picker screen
  if (!selectedMap) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Drop Card</div>
            <h1 className="mt-2 font-heading text-3xl font-bold">Pick a map</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose the map to mark team drop locations</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MAP_LIST.map((map) => (
              <button
                key={map.id}
                onClick={() => setSelectedMap(map.id)}
                className="group block overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:glow-primary"
              >
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <MapThumb map={map} showLabels />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors">{map.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{map.biome}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const mapInfo = getMap(selectedMap);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Map area */}
        <div className="relative flex flex-1 items-center justify-center bg-black/30 p-4">
          <div
            ref={mapRef}
            onClick={handleMapClick}
            className={`relative overflow-hidden rounded-xl border border-border ${selectedTeamIdx !== null ? "cursor-crosshair" : "cursor-default"}`}
            style={{ width: "min(100%, calc(100vh - 140px))", aspectRatio: "1 / 1" }}
          >
            <MapThumb map={mapInfo} />
            {/* Pins */}
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="absolute group"
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: "translate(-50%, -100%)" }}
              >
                <div className="relative flex flex-col items-center">
                  <div
                    className="h-5 w-5 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: pin.color }}
                    title={pin.teamName}
                  />
                  <div className="mt-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white whitespace-nowrap">
                    {pin.teamName}
                  </div>
                  {/* Hover delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removePin(pin.id); }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">
                    {pin.teamName}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedTeamIdx !== null && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-background/80 backdrop-blur px-4 py-1.5 font-mono text-xs text-primary pointer-events-none">
              Click map to place {teams[selectedTeamIdx]?.name}'s drop
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex w-64 shrink-0 flex-col border-l border-border bg-card/80 backdrop-blur p-4 gap-4 overflow-y-auto">
          {/* Map label */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Map</div>
            <div className="mt-1 font-heading font-semibold text-sm">{mapInfo.name}</div>
          </div>

          <div className="border-t border-border" />

          {/* Teams */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Teams</span>
              <button
                onClick={() => setAddingTeam(true)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Add team"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {addingTeam && (
              <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex flex-col gap-2">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Team name"
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && addTeam()}
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTeamColor(c)}
                      className={`h-5 w-5 rounded-full border-2 transition-transform ${newTeamColor === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 flex-1 text-[11px]" onClick={addTeam}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setAddingTeam(false); setNewTeamName(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              {teams.map((team, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTeamIdx(i === selectedTeamIdx ? null : i)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-all border ${
                    selectedTeamIdx === i
                      ? "bg-primary/15 border-primary/40"
                      : "hover:bg-accent/50 border-transparent"
                  }`}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="flex-1 text-xs truncate">{team.name}</span>
                  {pins.find((p) => p.teamName === team.name) && (
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTeam(i); }}
                    className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {teams.length === 0 && !addingTeam && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Add teams to start marking drops
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" className="gap-2 justify-start text-muted-foreground" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="gap-2"
              onClick={() => setSaveDialogOpen(true)}
              disabled={pins.length === 0}
            >
              <Save className="h-4 w-4" /> Save drop card
            </Button>
          </div>
        </div>
      </div>

      {/* Save dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="font-heading text-lg font-bold mb-1">Save Drop Card</h2>
            <p className="text-sm text-muted-foreground mb-4">{pins.length} team{pins.length !== 1 ? "s" : ""} marked on {mapInfo.name}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BGMI Pro League Drops"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveDropCard()}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={saveDropCard} disabled={!title.trim() || saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
