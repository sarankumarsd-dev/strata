import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus, Save, X, MapPin, Maximize2, Minus, Plus as PlusIcon } from "lucide-react";
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
  teamIdx: number;
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
  const [bgmiTeams, setBgmiTeams] = useState<{ name: string; short_name: string; logo_url: string }[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [shakeDrop, setShakeDrop] = useState(false);
  const [dropDupeError, setDropDupeError] = useState(false);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const pinAreaRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const zoomDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const MAX_ZOOM = 16;
  function clampZoom(z: number) { return Math.min(MAX_ZOOM, Math.max(1, z)); }
  function clampPan(x: number, y: number, z: number) {
    const maxX = 0, minX = -(z - 1) * (mapRef.current?.clientWidth ?? 0);
    const maxY = 0, minY = -(z - 1) * (mapRef.current?.clientHeight ?? 0);
    return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
  }
  function zoomAround(cx: number, cy: number, newZ: number) {
    const z = clampZoom(newZ);
    const wx = (cx - pan.x) / zoom;
    const wy = (cy - pan.y) / zoom;
    setPan(clampPan(cx - wx * z, cy - wy * z, z));
    setZoom(z);
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  useEffect(() => {
    supabase.from("bgmi_teams").select("name, short_name, logo_url").order("name")
      .then(({ data }) => { if (data) setBgmiTeams(data); });
  }, []);

  useEffect(() => {
    if (!saveDialogOpen || !user || !selectedMap) return;
    supabase.from("drop_cards").select("title").eq("user_id", user.id).eq("map", selectedMap)
      .then(({ data }) => { if (data) setExistingTitles(data.map((d) => d.title.toLowerCase())); });
  }, [saveDialogOpen, user, selectedMap]);

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
    if (selectedTeamIdx === null || !pinAreaRef.current) return;
    // Use the actual rendered bounds of the pin area div (which matches the image)
    const rect = pinAreaRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const team = teams[selectedTeamIdx];
    setPins((prev) => [
      ...prev.filter((p) => p.teamIdx !== selectedTeamIdx),
      { id: crypto.randomUUID(), teamName: team.name, teamIdx: selectedTeamIdx, color: team.color, x, y },
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
    setTeams((prev) => prev.filter((_, idx) => idx !== i));
    setPins((prev) => prev.filter((p) => p.teamIdx !== i).map((p) => ({ ...p, teamIdx: p.teamIdx > i ? p.teamIdx - 1 : p.teamIdx })));
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
  const PANEL = "border border-white/10 bg-transparent backdrop-blur-xl shadow-2xl";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* Full-bleed map */}
      <div
        ref={mapRef}
        className={`absolute inset-0 overflow-hidden ${selectedTeamIdx !== null ? "cursor-crosshair" : "cursor-default"}`}
        onClick={handleMapClick}
        onWheel={(e) => {
          e.preventDefault();
          const rect = mapRef.current!.getBoundingClientRect();
          zoomAround(e.clientX - rect.left, e.clientY - rect.top, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
        }}
      >
        {/* Zoomable inner layer */}
        <div style={{ position: "absolute", inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <MapThumb map={mapInfo} />
          {/* Pins — inside centered square matching object-contain image bounds */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div ref={pinAreaRef} style={{ position: "relative", aspectRatio: "1 / 1", width: "100%", maxHeight: "100%" }}>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  className="absolute group"
                  style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: `translate(-50%, -100%) scale(${1 / zoom})`, transformOrigin: "bottom center" }}
                >
                  <div className="relative flex items-center rounded-lg bg-black/80 shadow-lg overflow-hidden">
                    {(() => { const logo = bgmiTeams.find(t => t.name === pin.teamName)?.logo_url; return logo
                      ? <img src={logo} alt={pin.teamName} className="h-6 w-6 object-contain shrink-0" />
                      : <div className="h-6 w-6 rounded-full shrink-0 border-2 border-white/60 m-1" style={{ backgroundColor: pin.color }} />;
                    })()}
                    <span className="pr-3 text-[10px] font-semibold text-white whitespace-nowrap">{pin.teamName}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: pin.color }} />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removePin(pin.id); }}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div
          className={`absolute z-10 flex flex-col gap-1 rounded-md p-1 cursor-grab active:cursor-grabbing ${PANEL}`}
          style={zoomPos ? { left: zoomPos.x, top: zoomPos.y, bottom: "auto" } : { bottom: 12, left: 12 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const parent = el.parentElement!.getBoundingClientRect();
            zoomDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left - parent.left, origY: rect.top - parent.top };
            function onMove(ev: MouseEvent) {
              if (!zoomDragRef.current) return;
              setZoomPos({ x: zoomDragRef.current.origX + (ev.clientX - zoomDragRef.current.startX), y: zoomDragRef.current.origY + (ev.clientY - zoomDragRef.current.startY) });
            }
            function onUp() { zoomDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" aria-label="Zoom in" className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
            onClick={() => { const r = mapRef.current!.getBoundingClientRect(); zoomAround(r.width / 2, r.height / 2, zoom * 1.25); }}>
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Zoom out" className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
            onClick={() => { const r = mapRef.current!.getBoundingClientRect(); zoomAround(r.width / 2, r.height / 2, zoom / 1.25); }}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Reset view" className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
            onClick={resetView}>
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {zoom > 1.001 && (
          <div className="absolute top-12 right-[268px] z-10 rounded-md px-2 py-1 font-mono text-xs text-primary pointer-events-none border border-white/10 bg-transparent backdrop-blur-xl">
            {zoom.toFixed(1)}×
          </div>
        )}
      </div>

      {/* Top bar — absolute, glass panel matching strategy board */}
      <div className={`absolute left-0 right-0 top-0 z-30 flex items-center gap-2 px-3 py-2 ${PANEL} rounded-none`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-accent/50"
          style={{ color: "#39ff14", border: "1px solid #39ff1466", background: "#39ff140f" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to maps
        </button>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <span className="font-mono text-sm uppercase tracking-widest text-primary font-bold">{mapInfo.name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-heading text-base font-semibold text-foreground/80">Drop Card</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={() => setSaveDialogOpen(true)} disabled={pins.length === 0}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* Side panel — absolute right, glass panel */}
      <div className={`absolute right-0 top-[45px] bottom-0 z-20 flex w-64 flex-col border-l p-4 gap-4 overflow-y-auto ${PANEL} rounded-none`}>
        {/* Teams */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm uppercase tracking-widest font-bold text-primary">Teams</span>
            <button
              onClick={() => { setAddingTeam(true); setTeamSearch(""); setNewTeamName(""); }}
              className="group flex items-center gap-1 overflow-hidden rounded-full border-2 border-pink-400/70 bg-gradient-to-r from-purple-400/30 to-pink-400/30 px-1.5 py-0.5 text-pink-300 transition-all duration-300 hover:from-purple-400/50 hover:to-pink-400/50 hover:border-pink-300 hover:text-pink-200 hover:shadow-[0_0_12px_rgba(236,72,153,0.5)]"
            >
              <span className="max-w-0 overflow-hidden whitespace-nowrap font-mono text-xs font-bold tracking-wider opacity-0 transition-all duration-300 group-hover:max-w-[2rem] group-hover:opacity-100">Add</span>
              <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>

          {addingTeam && (
            <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex flex-col gap-2">
              <div className="relative">
                <Input
                  value={teamSearch}
                  onChange={(e) => { setTeamSearch(e.target.value); setNewTeamName(e.target.value); setTeamDropdownOpen(true); }}
                  onFocus={() => setTeamDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setTeamDropdownOpen(false), 150)}
                  placeholder="Search team..."
                  className="h-10 text-sm"
                  autoFocus
                />
                {teamDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl">
                    {bgmiTeams
                      .filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()) && teams.filter((a) => a.name === t.name).length < 2)
                      .map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onMouseDown={() => { setNewTeamName(t.name); setTeamSearch(t.name); setTeamDropdownOpen(false); }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/60"
                        >
                          {t.logo_url && <img src={t.logo_url} alt={t.name} className="h-7 w-7 object-contain shrink-0" />}
                          <span className="truncate">{t.name}</span>
                          <span className="ml-auto font-mono text-xs text-muted-foreground">{t.short_name}</span>
                        </button>
                      ))}
                    {bgmiTeams.filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()) && !teams.find((a) => a.name === t.name)).length === 0 && teamSearch && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No match — will add as custom</div>
                    )}
                  </div>
                )}
              </div>
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
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setAddingTeam(false); setNewTeamName(""); setTeamSearch(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {teams.map((team, i) => (
              <div
                key={i}
                onClick={() => setSelectedTeamIdx(i === selectedTeamIdx ? null : i)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer transition-all border ${
                  selectedTeamIdx === i ? "bg-primary/15 border-primary/40" : "hover:bg-accent/50 border-transparent"
                }`}
              >
                {(() => { const logo = bgmiTeams.find(t => t.name === team.name)?.logo_url; return logo
                  ? <img src={logo} alt={team.name} className="h-6 w-6 object-contain shrink-0" />
                  : <div className="h-4 w-4 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: team.color }} />;
                })()}
                <span className="flex-1 text-sm truncate">{team.name}</span>
                {pins.find((p) => p.teamIdx === i) && (
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeTeam(i); }}
                  className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {teams.length === 0 && !addingTeam && (
              <p className="text-xs text-muted-foreground text-center py-4">Add teams to start marking drops</p>
            )}
          </div>
        </div>
      </div>

      {/* Hint text */}
      {selectedTeamIdx !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-full border border-primary/30 bg-background/80 backdrop-blur px-4 py-1.5 font-mono text-xs text-primary pointer-events-none">
          Click map to place {teams[selectedTeamIdx]?.name}'s drop
        </div>
      )}

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
                  onChange={(e) => { setTitle(e.target.value); setDropDupeError(false); }}
                  placeholder="e.g. BGMI Pro League Drops"
                  autoFocus
                  className={dropDupeError ? "border-destructive focus-visible:ring-destructive" : ""}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (!dropId && existingTitles.includes(title.trim().toLowerCase())) {
                      setDropDupeError(true);
                      setShakeDrop(true); setTimeout(() => setShakeDrop(false), 500);
                      return;
                    }
                    saveDropCard();
                  }}
                />
                {dropDupeError && <p className="mt-1.5 text-xs text-destructive">Name already exists</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={!title.trim() || saving}
                  style={shakeDrop ? { animation: "shake 0.4s ease" } : undefined}
                  onClick={() => {
                    if (!dropId && existingTitles.includes(title.trim().toLowerCase())) {
                      setDropDupeError(true);
                      setShakeDrop(true); setTimeout(() => setShakeDrop(false), 500);
                      return;
                    }
                    saveDropCard();
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={() => { setSaveDialogOpen(false); setDropDupeError(false); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
