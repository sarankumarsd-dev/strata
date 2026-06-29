import { useState, useEffect, useRef } from "react";
import {
  MousePointer2, Circle as CircleIcon, MapPin, Octagon, Mountain, TrendingDown,
  Crosshair, Route as RouteIcon, Flame, Type as TypeIcon, Undo2, Redo2, Trash2,
  Save, Eye, Sparkles, PanelRightClose, PanelRightOpen, ArrowLeft, Layers, X,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { BoardDoc, BoardItem, Pt, ToolId } from "@/lib/board-types";
import { EMPTY_BOARD, newId } from "@/lib/board-types";
import { GUNS } from "@/lib/guns";
import type { MapInfo } from "@/lib/maps";
import { MapCanvas } from "@/components/board/MapCanvas";
import type { DropPin } from "@/components/board/MapCanvas";
import { toast } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Button, Input, Label, Textarea, Slider, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui";

interface Props {
  map: MapInfo;
  initial?: {
    id?: string;
    title: string;
    description: string;
    tags: string[];
    is_public: boolean;
    board_json: BoardDoc;
  };
}

const TOOLS: { id: ToolId; icon: any; label: string; hint: string }[] = [
  { id: "select",         icon: MousePointer2, label: "Select",      hint: "Click and drag the zoom tool to move it anywhere" },
  { id: "zone",           icon: CircleIcon,    label: "Zone circle", hint: "Click to drop a play-zone" },
  { id: "godspot",        icon: MapPin,        label: "God spot",    hint: "Click to mark elevated cover" },
  { id: "chokespot",      icon: Octagon,       label: "Choke",       hint: "Click to mark a choke point" },
  { id: "elevation-high", icon: Mountain,      label: "High ground", hint: "Click points, double-click to finish polygon" },
  { id: "elevation-low",  icon: TrendingDown,  label: "Low ground",  hint: "Click points, double-click to finish polygon" },
  { id: "gun-arrow",      icon: Crosshair,     label: "Gun range",   hint: "Click origin, click direction" },
  { id: "rotation",       icon: RouteIcon,     label: "Rotation",    hint: "Click waypoints, double-click to finish" },
  { id: "rush",           icon: Flame,         label: "Rush",        hint: "Click target inside zone" },
  { id: "text",           icon: TypeIcon,      label: "Text label",  hint: "Click to drop a label" },
];

// Shared glass panel styling — fully transparent with heavy blur so the map bleeds through.
const PANEL = "border border-white/10 bg-transparent backdrop-blur-xl shadow-2xl";

export function BoardEditor({ map, initial }: Props) {
  const [tool, setTool] = useState<ToolId>("select");
  const [doc, setDoc] = useState<BoardDoc>(initial?.board_json ?? EMPTY_BOARD);
  const [history, setHistory] = useState<BoardDoc[]>([]);
  const [future, setFuture] = useState<BoardDoc[]>([]);
  const [title, setTitle] = useState(initial?.title ?? "Untitled strategy");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  // Tool config
  const [zoneRadius, setZoneRadius] = useState(0.22);
  const [gunId, setGunId] = useState("m416");
  const [rotationSplit, setRotationSplit] = useState<"none" | "2-2" | "3-1">("2-2");
  const [rushMode, setRushMode] = useState<"split" | "stack">("split");

  // Building polygon/polyline state
  const { user } = useAuth();
  const [building, setBuilding] = useState<Pt[]>([]);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<{ id: string; title: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shakeSave, setShakeSave] = useState(false);
  const [shakeRename, setShakeRename] = useState(false);
  const [renameDupeError, setRenameDupeError] = useState(false);

  // Drop card import
  const [dropPins, setDropPins] = useState<DropPin[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [savedDropCards, setSavedDropCards] = useState<{ id: string; title: string; pins: any[] }[]>([]);
  const [dropCardSearch, setDropCardSearch] = useState("");
  const [bgmiTeams, setBgmiTeams] = useState<{ name: string; logo_url: string }[]>([]);
  const [activeDropCardTitle, setActiveDropCardTitle] = useState<string | null>(null);

  // Auto-show panel when cursor approaches right edge; auto-hide when it leaves.
  useEffect(() => {
    const EDGE_THRESHOLD = 40; // px from right edge to trigger open
    const CLOSE_DELAY = 400;   // ms after leaving before closing

    function onMouseMove(e: MouseEvent) {
      const nearEdge = e.clientX >= window.innerWidth - EDGE_THRESHOLD;
      if (nearEdge && !pinned) {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setPanelOpen(true);
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [pinned]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("strategies")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("map", map.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setSavedStrategies(data); });
  }, [user, map.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("drop_cards")
      .select("id, title, pins")
      .eq("user_id", user.id)
      .eq("map", map.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setSavedDropCards(data); });
  }, [user, map.id]);

  useEffect(() => {
    supabase.from("bgmi_teams").select("name, logo_url").then(({ data }) => { if (data) setBgmiTeams(data); });
  }, []);

  const filteredStrategies = savedStrategies.filter((s) =>
    s.title.toLowerCase().includes(title.toLowerCase()) && s.title !== title
  );

  function onSelectStrategy(s: { id: string; title: string }) {
    setSearchOpen(false);
    window.location.href = `/board/${s.id}`;
  }

  function onPanelMouseLeave() {
    if (pinned) return;
    closeTimer.current = setTimeout(() => setPanelOpen(false), 400);
  }
  function onPanelMouseEnter() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  function commit(next: BoardDoc) {
    setHistory((h) => [...h, doc]);
    setFuture([]);
    setDoc(next);
  }
  function addItem(item: BoardItem) {
    commit({ ...doc, items: [...doc.items, item] });
  }
  function removeItem(id: string) {
    commit({ ...doc, items: doc.items.filter((i) => i.id !== id) });
  }
  function commitBuilding() {
    if (building.length < 2) { setBuilding([]); return; }
    if (tool === "elevation-high" || tool === "elevation-low") {
      const kind = tool === "elevation-high" ? "high" : "low";
      addItem({ id: newId("elv"), type: "elevation", kind, polygon: building, label: kind === "high" ? "High ground" : "Low ground" });
    } else if (tool === "rotation") {
      addItem({ id: newId("rot"), type: "rotation", points: building, split: rotationSplit, label: "Rotation" });
    }
    setBuilding([]);
  }
  function undo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [doc, ...f]);
    setDoc(prev);
  }
  function redo() {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, doc]);
    setDoc(next);
  }
  function clearAll() {
    if (!confirm("Clear every annotation?")) return;
    commit(EMPTY_BOARD);
  }

  function triggerShake() {
    setShakeSave(true);
    setTimeout(() => setShakeSave(false), 500);
  }

  async function handleSave() {
    if (!user) { toast.error("Sign in to save strategies"); return; }
    if (!title.trim()) { triggerShake(); return; }
    // Block save on new strategies with default title
    if (!initial?.id && title.trim() === "Untitled strategy") {
      triggerShake();
      setRenameDialogOpen(true);
      return;
    }
    setSaving(true);
    try {
      const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);
      if (initial?.id) {
        const { error } = await supabase
          .from("strategies")
          .update({ title, description, tags, is_public: isPublic, board_json: doc as any, updated_at: new Date().toISOString() })
          .eq("id", initial.id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Strategy updated");
      } else {
        const { error } = await supabase
          .from("strategies")
          .insert({ user_id: user.id, map: map.id, title, description, tags, is_public: isPublic, board_json: doc as any });
        if (error) throw error;
        toast.success("Strategy saved", { description: "Find it in My Strata." });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  function aiUnavailable() {
    toast("AI suggestions need the cloud backend", {
      description: "This local build runs the full board offline; AI helpers require the hosted Strata API.",
    });
  }

  const aiButtonForTool = (() => {
    if (tool === "zone" || tool === "godspot" || tool === "chokespot") return { label: "Suggest spots" };
    if (tool === "elevation-high" || tool === "elevation-low") return { label: "Suggest elevation" };
    if (tool === "rotation") return { label: "Suggest splits" };
    if (tool === "rush") return { label: "Suggest plan" };
    return null;
  })();

  return (
    <TooltipProvider delayDuration={150}>
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* ===== Full-bleed map — fills the entire viewport ===== */}
      <div className="absolute inset-0">
        <MapCanvas
          map={map} doc={doc} tool={tool}
          zoneRadius={zoneRadius} gunId={gunId}
          rotationSplit={rotationSplit} rushMode={rushMode}
          buildingPoints={building}
          onAdd={addItem}
          onUpdateBuilding={setBuilding}
          onCommitBuilding={commitBuilding}
          onRemove={removeItem}
          dropPins={dropPins}
        />
        {/* In-canvas instruction strip — hidden on mobile (bottom toolbar handles it) */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 hidden rounded-md bg-transparent backdrop-blur-xl border border-white/10 px-3 py-1.5 font-mono text-xs text-muted-foreground md:block">
          {TOOLS.find((t) => t.id === tool)?.hint}
          {(tool === "elevation-high" || tool === "elevation-low" || tool === "rotation") && building.length > 0 && (
            <span className="ml-2 text-primary">· {building.length} pt · dbl-click to finish</span>
          )}
        </div>
      </div>

      {/* ===== Floating top bar ===== */}
      <div className={`absolute left-0 right-0 top-0 z-30 flex items-center gap-2 px-3 py-2 ${PANEL} rounded-none`}>
        <Link to="/maps" className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-accent/50" style={{ color: "#39ff14", border: "1px solid #39ff1466", background: "#39ff140f" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to maps
        </Link>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="font-mono text-sm uppercase tracking-widest text-primary font-bold">{map.name}</span>
          <span className="text-muted-foreground">·</span>
          <div className="relative max-w-[360px] flex-1">
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              className="h-8 border-transparent bg-transparent font-heading text-base font-semibold"
            />
            {searchOpen && filteredStrategies.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-white/10 bg-background/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                {filteredStrategies.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => onSelectStrategy(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/60 truncate"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!history.length}><Undo2 className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>Undo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!future.length}><Redo2 className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>Redo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={clearAll}><Trash2 className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>Clear board</TooltipContent></Tooltip>
        </div>
        <div className="mx-1 hidden items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1 sm:flex">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Public</Label>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
        {aiButtonForTool && (
          <Button onClick={aiUnavailable}
            className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 animate-pulse-glow">
            <Sparkles className="h-4 w-4" /> <span className="hidden md:inline">AI: {aiButtonForTool.label}</span>
          </Button>
        )}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => { setImportDialogOpen(true); setDropCardSearch(""); }}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">{activeDropCardTitle ?? "Import Drop"}</span>
          </Button>
          {activeDropCardTitle && (
            <button
              onClick={() => { setDropPins([]); setActiveDropCardTitle(null); }}
              className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-white shadow hover:bg-destructive/80"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="default"
          className="gap-2"
          style={shakeSave ? { animation: "shake 0.4s ease" } : undefined}
        >
          <Save className="h-4 w-4" /> <span className="hidden sm:inline">{saving ? "Saving…" : initial?.id ? "Update" : "Save"}</span>
        </Button>
      </div>

      {/* ===== Floating left toolbar — desktop only ===== */}
      <aside className={`absolute left-2 top-1/2 z-20 hidden md:flex -translate-y-1/2 flex-col gap-1 rounded-xl p-1.5 ${PANEL}`}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setTool(t.id); setBuilding([]); }}
                  className={`grid h-9 w-9 place-items-center rounded-md transition-all ${
                    active
                      ? "bg-primary text-primary-foreground glow-primary scale-105"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.hint}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>

      {/* ===== Mobile bottom toolbar — visible on small screens only ===== */}
      <div className={`absolute bottom-2 left-2 right-2 z-30 flex items-center gap-1 overflow-x-auto rounded-xl px-2 py-1.5 md:hidden ${PANEL} scrollbar-none`}
        style={{ WebkitOverflowScrolling: "touch" }}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setBuilding([]); }}
              title={t.label}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-all ${
                active
                  ? "bg-primary text-primary-foreground glow-primary scale-105"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-mono text-[8px] uppercase tracking-wide leading-none">{t.label.split(" ")[0]}</span>
            </button>
          );
        })}
        {/* Finish polygon button — only visible when actively drawing */}
        {(tool === "elevation-high" || tool === "elevation-low" || tool === "rotation") && building.length > 0 && (
          <button
            onClick={commitBuilding}
            disabled={building.length < 2}
            className="ml-auto flex shrink-0 flex-col items-center gap-0.5 rounded-lg border border-primary/60 bg-primary/10 px-3 py-1.5 text-primary transition-all"
          >
            <span className="font-mono text-[10px] uppercase tracking-wide">Finish ({building.length}pt)</span>
          </button>
        )}
      </div>

      {/* ===== Floating right panel — slides in from right edge on hover ===== */}
      <aside
        className={`
          absolute z-20 space-y-5 overflow-y-auto rounded-xl p-4 ${PANEL}
          right-2 top-[3rem] bottom-14 w-64 md:bottom-2 md:w-72
          transition-transform duration-300 ease-in-out
          ${panelOpen ? "translate-x-0" : "translate-x-[110%]"}
        `}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
      >
        {/* Pin / shrink button */}
        <button
          onClick={() => { setPinned((v) => !v); setPanelOpen(true); }}
          className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground transition-colors"
          title={pinned ? "Unpin (auto-hide)" : "Pin open"}
        >
          {pinned ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        </button>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Tool · {TOOLS.find((t) => t.id === tool)?.label}</div>
            {tool === "zone" && (
              <div className="space-y-2">
                <Label className="text-xs">Radius <span className="font-mono text-muted-foreground">({(zoneRadius * map.sizeKm).toFixed(1)} km)</span></Label>
                <Slider value={[zoneRadius]} min={0.04} max={0.45} step={0.01} onValueChange={(v) => setZoneRadius(v[0])} />
              </div>
            )}
            {tool === "gun-arrow" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Weapon</Label>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[55vh]">
                  {GUNS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGunId(g.id)}
                      className={`group relative w-full overflow-hidden rounded-md transition-all border shrink-0 ${
                        gunId === g.id
                          ? "border-2 border-primary/80 ring-1 ring-primary/40"
                          : "border border-white/10 hover:border-white/30"
                      }`}
                      style={{ background: "#3a3a3a", aspectRatio: "530 / 185" }}
                    >
                      <img
                        src={g.image}
                        alt={g.name}
                        className={`absolute inset-0 w-full h-full object-contain transition-all duration-300 ${
                          gunId === g.id
                            ? "drop-shadow-[0_0_12px_rgba(168,85,247,0.9)]"
                            : "group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.9)]"
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-1.5 left-2 font-semibold text-xs text-white leading-tight drop-shadow-md">
                        {g.name}
                      </span>
                      <span className="absolute bottom-1.5 right-2 font-mono text-[10px] leading-tight" style={{ color: "oklch(0.80 0.16 295)" }}>
                        {g.category} · {g.effectiveRangeM}m
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tool === "rotation" && (
              <div className="space-y-2">
                <Label className="text-xs">Split</Label>
                <Select value={rotationSplit} onValueChange={(v: any) => setRotationSplit(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No split (stack)</SelectItem>
                    <SelectItem value="2-2">2-2 split</SelectItem>
                    <SelectItem value="3-1">3-1 split</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {tool === "rush" && (
              <div className="space-y-2">
                <Label className="text-xs">Approach</Label>
                <Select value={rushMode} onValueChange={(v: any) => setRushMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split">Split rush (flank)</SelectItem>
                    <SelectItem value="stack">Stack rush (overwhelm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(tool === "elevation-high" || tool === "elevation-low" || tool === "rotation") && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={commitBuilding} disabled={building.length < 2}>Finish ({building.length})</Button>
                <Button size="sm" variant="ghost" onClick={() => setBuilding([])}>Cancel</Button>
              </div>
            )}
            {!["zone", "gun-arrow", "rotation", "rush", "elevation-high", "elevation-low"].includes(tool) && (
              <p className="text-xs text-muted-foreground">{TOOLS.find((t) => t.id === tool)?.hint}</p>
            )}
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Layers</div>
              <div className="font-mono text-[10px] text-muted-foreground">{doc.items.length}</div>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {doc.items.length === 0 && (
                <p className="text-xs text-muted-foreground">Pick a tool and click the map.</p>
              )}
              {doc.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-xs">
                  <span className="font-mono uppercase tracking-wide truncate">{labelFor(it)}</span>
                  <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Strategy details</div>
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the play?" className="h-20 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-xs">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
              <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)}
                placeholder="endgame, rotation, squad" className="font-mono text-xs" />
            </div>
          </div>
        </aside>
    </div>

    {/* ===== Rename before save dialog ===== */}
    {renameDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="font-heading text-lg font-bold mb-1">Name your strategy</h2>
          <p className="text-sm text-muted-foreground mb-4">Give it a name before saving.</p>
          <Input
            value={title === "Untitled strategy" ? "" : title}
            onChange={(e) => { setTitle(e.target.value || "Untitled strategy"); setRenameDupeError(false); }}
            placeholder="e.g. Pochinki Rush Strat"
            autoFocus
            className={renameDupeError ? "border-destructive focus-visible:ring-destructive" : ""}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const t = title.trim();
              if (!t || t === "Untitled strategy") return;
              if (savedStrategies.some((s) => s.title.toLowerCase() === t.toLowerCase())) {
                setRenameDupeError(true);
                setShakeRename(true); setTimeout(() => setShakeRename(false), 500);
                return;
              }
              setRenameDialogOpen(false); handleSave();
            }}
          />
          {renameDupeError && <p key={Date.now()} className="reveal-ltr mt-1.5 text-xs text-destructive">Name already exists</p>}
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              disabled={!title.trim() || title.trim() === "Untitled strategy"}
              style={shakeRename ? { animation: "shake 0.4s ease" } : undefined}
              onClick={() => {
                const t = title.trim();
                if (!t || t === "Untitled strategy") return;
                if (savedStrategies.some((s) => s.title.toLowerCase() === t.toLowerCase())) {
                  setRenameDupeError(true);
                  setShakeRename(true); setTimeout(() => setShakeRename(false), 500);
                  return;
                }
                setRenameDialogOpen(false); handleSave();
              }}
            >
              Save
            </Button>
            <Button variant="outline" onClick={() => { setRenameDialogOpen(false); setRenameDupeError(false); setTitle("Untitled strategy"); }}>Cancel</Button>
          </div>
        </div>
      </div>
    )}

    {/* ===== Import Drop Card dialog ===== */}
    {importDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setImportDialogOpen(false)}>
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-bold">Import Drop Card</h2>
            <button onClick={() => setImportDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <input
            className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60 mb-2"
            placeholder="Search drop cards…"
            value={dropCardSearch}
            onChange={(e) => setDropCardSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
            {savedDropCards
              .filter((dc) => dc.title.toLowerCase().includes(dropCardSearch.toLowerCase()))
              .map((dc) => (
                <button
                  key={dc.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent/60 text-left w-full"
                  onClick={() => {
                    const pins: DropPin[] = (dc.pins ?? []).map((p: any) => ({
                      id: p.id,
                      teamName: p.teamName,
                      color: p.color,
                      x: p.x,
                      y: p.y,
                      logoUrl: bgmiTeams.find((t) => t.name === p.teamName)?.logo_url,
                    }));
                    setDropPins(pins);
                    setActiveDropCardTitle(dc.title);
                    setImportDialogOpen(false);
                  }}
                >
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{dc.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{dc.pins?.length ?? 0} teams</span>
                </button>
              ))}
            {savedDropCards.filter((dc) => dc.title.toLowerCase().includes(dropCardSearch.toLowerCase())).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No drop cards found for this map</p>
            )}
          </div>
        </div>
      </div>
    )}
    </TooltipProvider>
  );
}

function labelFor(it: BoardItem): string {
  switch (it.type) {
    case "zone": return `Zone · r=${(it.r * 100).toFixed(0)}%`;
    case "godspot": return `God · ${it.label ?? ""}`;
    case "chokespot": return `Choke · ${it.label ?? ""}`;
    case "elevation": return `${it.kind === "high" ? "High" : "Low"} · ${it.polygon.length}pt`;
    case "gun-arrow": return `Arrow · ${it.gunId}`;
    case "rotation": return `Rotation · ${it.split} · ${it.points.length}pt`;
    case "rush": return `Rush · ${it.mode}`;
    case "text": return `Text · ${it.text}`;
  }
}
