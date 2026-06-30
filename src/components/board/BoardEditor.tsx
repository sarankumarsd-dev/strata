import { useState, useEffect, useRef } from "react";
import {
  MousePointer2, Circle as CircleIcon, MapPin, Octagon, Mountain, TrendingDown,
  Crosshair, Route as RouteIcon, Flame, Type as TypeIcon, Undo2, Redo2, Trash2,
  Save, Eye, Sparkles, PanelRightClose, PanelRightOpen, ArrowLeft, Layers, X, Search,
  Video, StopCircle, Download, Mic, MicOff, Music, ChevronDown, Pause, Play, Crop, Check,
} from "lucide-react";
import type { CropRegion } from "@/hooks/useScreenRecorder";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
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

function GlitterDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth || 100;
    const H = canvas.offsetHeight || 32;
    canvas.width = W;
    canvas.height = H;
    const dots = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      opacity: Math.random(),
      fadeDir: Math.random() > 0.5 ? 1 : -1,
      speed: Math.random() * 0.02 + 0.008,
    }));
    let rafId: number;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        d.opacity += d.fadeDir * d.speed;
        if (d.opacity >= 1) { d.opacity = 1; d.fadeDir = -1; }
        if (d.opacity <= 0) {
          d.opacity = 0; d.fadeDir = 1;
          d.x = Math.random() * W;
          d.y = Math.random() * H;
        }
        if (d.x < 0) d.x = W;
        if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H;
        if (d.y > H) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 38, 38, ${d.opacity})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ borderRadius: "inherit" }}
    />
  );
}

function GunCard({ g, selected, onSelect }: { g: import("@/lib/guns").Gun; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`group relative w-full overflow-hidden rounded-md transition-all border shrink-0 ${
        selected ? "border-2 border-primary/80 ring-1 ring-primary/40" : "border border-white/10 hover:border-white/30"
      }`}
      style={{ background: "#3a3a3a", aspectRatio: "530 / 185" }}
    >
      <img
        src={g.image}
        alt={g.name}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
          selected ? "drop-shadow-[0_0_12px_rgba(168,85,247,0.9)]" : "group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.9)]"
        }`}
        style={{ transform: "rotate(345deg) scale(1)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      <span className="absolute bottom-1.5 left-2 font-semibold text-xs text-white leading-tight drop-shadow-md">{g.name}</span>
      <span className="absolute bottom-1.5 right-2 font-mono text-[10px] leading-tight" style={{ color: "oklch(0.80 0.16 295)" }}>
        {g.category} · {g.effectiveRangeM}m
      </span>
    </button>
  );
}

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
  const [gunSearch, setGunSearch] = useState("");
  const [rotationSplit, setRotationSplit] = useState<"none" | "2-2" | "3-1">("2-2");
  const [rushMode, setRushMode] = useState<"split" | "stack">("split");

  // Building polygon/polyline state
  const { user } = useAuth();
  const [building, setBuilding] = useState<Pt[]>([]);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelHovered, setPanelHovered] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<{ id: string; title: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const gunListRef = useRef<HTMLDivElement>(null);

  // Preload all gun images on mount so scroll is instant
  useEffect(() => {
    GUNS.forEach((g) => { const img = new Image(); img.src = g.image; });
  }, []);

  useEffect(() => {
    const el = gunListRef.current;
    if (!el) return;
    let target = el.scrollTop;
    let current = el.scrollTop;
    let rafId: number;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target += e.deltaY * 0.7;
      target = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight));
      const animate = () => {
        current += (target - current) * 0.09;
        el.scrollTop = current;
        if (Math.abs(target - current) > 0.5) {
          rafId = requestAnimationFrame(animate);
        } else {
          el.scrollTop = target;
          current = target;
        }
      };
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafId);
    };
  }, []);
  const [pinned, setPinned] = useState(true);
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

  // Screen recorder
  const recorder = useScreenRecorder();
  const [recPanelOpen, setRecPanelOpen] = useState(false);
  const [recMic, setRecMic] = useState(false);
  const [recMusicFile, setRecMusicFile] = useState<File | null>(null);
  const [recQuality, setRecQuality] = useState<"720p" | "1080p">("720p");
  const [recVideoUrl, setRecVideoUrl] = useState<string | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const floatDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [shakeRec, setShakeRec] = useState(false);

  // Region selection
  const [recRegionMode, setRecRegionMode] = useState(false);
  const [recRegionSelecting, setRecRegionSelecting] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const selStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selRect, setSelRect] = useState<CropRegion | null>(null);

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
    // Load ALL strategies across all maps for global title uniqueness check
    supabase
      .from("strategies")
      .select("id, title")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setSavedStrategies(data); });
  }, [user]);

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

  useEffect(() => {
    if (recorder.blob) {
      const url = URL.createObjectURL(recorder.blob);
      setRecVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [recorder.blob]);

  function formatDuration(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  async function handleStartRecording() {
    setRecPanelOpen(false);
    setFloatPos(null);
    if (recRegionMode) {
      setCropRegion(null);
      setSelRect(null);
      setRecRegionSelecting(true);
      return;
    }
    await doStartRecording(null);
  }

  async function doStartRecording(region: CropRegion | null) {
    try {
      await recorder.start({ mic: recMic, musicFile: recMusicFile, quality: recQuality, cropRegion: region });
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") toast.error("Could not start recording");
    }
  }

  function handleDownloadRecording() {
    if (!recorder.blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(recorder.blob);
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "strata"}-${recQuality}.webm`;
    a.click();
  }

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
        if (savedStrategies.some((s) => s.title.toLowerCase() === title.trim().toLowerCase())) {
          toast.error("A strategy with this name already exists", { description: "Use a different name across all maps." });
          setSaving(false);
          return;
        }
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
        <Link to="/maps" className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors hover:bg-accent/50 shrink-0" style={{ color: "#39ff14", border: "1px solid #39ff1466", background: "#39ff140f" }}>
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={!history.length}><Undo2 className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Undo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={!future.length}><Redo2 className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Redo</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearAll}><Trash2 className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Clear board</TooltipContent></Tooltip>
        </div>
        {/* ===== Record button ===== */}
        <div className="relative">
          {recorder.state === "idle" && (
            <button
              onClick={() => {
                if (!initial?.id) {
                  toast.error("Save your strategy first before recording.");
                  setShakeRec(true);
                  setTimeout(() => setShakeRec(false), 500);
                  return;
                }
                setRecPanelOpen((v) => !v);
              }}
              className="relative flex h-8 items-center gap-1.5 rounded-md border border-red-600/70 bg-black px-2.5 text-xs font-semibold text-red-400 hover:border-red-500 overflow-hidden transition-colors"
              style={shakeRec ? { animation: "shake 0.4s ease" } : undefined}
            >
              <GlitterDots />
              <Video className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 hidden sm:inline">Record</span>
              <ChevronDown className="relative z-10 h-3 w-3 opacity-60" />
            </button>
          )}
          {recorder.state === "recording" && (
            <button
              onClick={recorder.stop}
              className="flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 bg-red-500/20 px-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <span className="animate-rec-pulse h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <span className="font-mono text-red-300">{formatDuration(recorder.duration)}</span>
              <StopCircle className="h-3.5 w-3.5 ml-0.5" />
            </button>
          )}

          {/* Record options panel */}
          {recPanelOpen && recorder.state === "idle" && (
            <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl p-3 space-y-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Record options</div>

              {/* Quality */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Quality</div>
                <div className="flex gap-1.5">
                  {(["720p", "1080p"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setRecQuality(q)}
                      className={`flex-1 rounded-md border py-1 text-xs font-mono font-semibold transition-colors ${
                        recQuality === q
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-white/10 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mic toggle */}
              <button
                onClick={() => setRecMic((v) => !v)}
                className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${
                  recMic
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {recMic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                {recMic ? "Mic on" : "Mic off"}
              </button>

              {/* Music file */}
              <div>
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setRecMusicFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => musicInputRef.current?.click()}
                  className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${
                    recMusicFile
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <Music className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{recMusicFile ? recMusicFile.name : "Add music (optional)"}</span>
                  {recMusicFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRecMusicFile(null); if (musicInputRef.current) musicInputRef.current.value = ""; }}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </button>
              </div>

              {/* Crop region toggle */}
              <button
                onClick={() => { setRecRegionMode(v => !v); if (recRegionMode) setCropRegion(null); }}
                className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${
                  recRegionMode
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                <Crop className="h-3.5 w-3.5 shrink-0" />
                {recRegionMode
                  ? cropRegion ? `Region: ${Math.round(cropRegion.w)}×${Math.round(cropRegion.h)}px` : "Draw region on map"
                  : "Select region (optional)"}
              </button>

              {/* Start button */}
              <button
                onClick={handleStartRecording}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                {recRegionMode && !cropRegion ? "Draw Region First" : "Start Recording"}
              </button>
              <p className="text-[10px] text-muted-foreground leading-tight">You'll choose which tab/window to capture.</p>
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-8 items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 sm:flex">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Public</Label>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
        {aiButtonForTool && (
          <Button onClick={aiUnavailable} size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 animate-pulse-glow text-xs">
            <Sparkles className="h-3.5 w-3.5" /> <span className="hidden md:inline">AI: {aiButtonForTool.label}</span>
          </Button>
        )}
        <div className="relative">
          <button
            onClick={() => { setImportDialogOpen(true); setDropCardSearch(""); }}
            className="flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{activeDropCardTitle ?? "Import Drop"}</span>
          </button>
          {activeDropCardTitle && (
            <button
              onClick={() => { setDropPins([]); setActiveDropCardTitle(null); }}
              className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-white shadow hover:bg-destructive/80"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          style={shakeSave ? { animation: "shake 0.4s ease" } : undefined}
        >
          <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{saving ? "Saving…" : initial?.id ? "Update" : "Save"}</span>
        </button>
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

      {/* ===== Region selection overlay ===== */}
      {recRegionSelecting && (
        <div
          className="absolute inset-0 z-50 cursor-crosshair select-none"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onMouseDown={(e) => {
            selStartRef.current = { x: e.clientX, y: e.clientY };
            setSelRect(null);
          }}
          onMouseMove={(e) => {
            if (!selStartRef.current) return;
            const x = Math.min(selStartRef.current.x, e.clientX);
            const y = Math.min(selStartRef.current.y, e.clientY);
            const w = Math.abs(e.clientX - selStartRef.current.x);
            const h = Math.abs(e.clientY - selStartRef.current.y);
            setSelRect({ x, y, w, h });
          }}
          onMouseUp={() => {
            if (selRect && selRect.w > 20 && selRect.h > 20) {
              setCropRegion(selRect);
            }
            selStartRef.current = null;
          }}
        >
          {/* Instruction */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-xl px-4 py-2 text-xs text-white font-semibold pointer-events-none">
            <Crop className="h-3.5 w-3.5 text-primary" /> Drag to select recording region
          </div>

          {/* Selection rectangle */}
          {selRect && selRect.w > 4 && selRect.h > 4 && (
            <div
              className="absolute pointer-events-none"
              style={{ left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h,
                border: "2px dashed rgba(239,68,68,0.9)", background: "rgba(239,68,68,0.08)" }}
            >
              <span className="absolute -top-5 left-0 font-mono text-[10px] text-red-400">
                {Math.round(selRect.w)} × {Math.round(selRect.h)}
              </span>
            </div>
          )}

          {/* Confirmed region highlight + action buttons */}
          {cropRegion && (
            <>
              <div
                className="absolute pointer-events-none"
                style={{ left: cropRegion.x, top: cropRegion.y, width: cropRegion.w, height: cropRegion.h,
                  border: "2px solid rgba(239,68,68,0.9)", background: "rgba(239,68,68,0.06)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
              />
              <div
                className="absolute flex gap-2"
                style={{ left: cropRegion.x, top: cropRegion.y + cropRegion.h + 10 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setRecRegionSelecting(false); doStartRecording(cropRegion); }}
                  className="flex items-center gap-1.5 rounded-md bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <Video className="h-3.5 w-3.5" /> Record this region
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCropRegion(null); setSelRect(null); }}
                  className="flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 hover:bg-white/10 px-3 py-1.5 text-xs text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Redraw
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRecRegionSelecting(false); setCropRegion(null); }}
                  className="flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 hover:bg-white/10 px-3 py-1.5 text-xs text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== Floating recording controls (draggable, icon-only) ===== */}
      {(recorder.state === "recording" || recorder.state === "paused") && (
        <div
          className="absolute z-40 flex items-center gap-1 rounded-full border border-red-500/40 bg-black/85 backdrop-blur-xl px-2 py-1 shadow-2xl cursor-grab active:cursor-grabbing select-none"
          style={floatPos ? { left: floatPos.x, top: floatPos.y } : { bottom: 80, left: "50%", transform: "translateX(-50%)" }}
          onMouseDown={(e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const parent = el.offsetParent as HTMLElement ?? document.body;
            const elRect = el.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            const origX = elRect.left - parentRect.left;
            const origY = elRect.top - parentRect.top;
            floatDragRef.current = { startX: e.clientX, startY: e.clientY, origX, origY };
            function onMove(ev: MouseEvent) {
              if (!floatDragRef.current) return;
              setFloatPos({
                x: floatDragRef.current.origX + (ev.clientX - floatDragRef.current.startX),
                y: floatDragRef.current.origY + (ev.clientY - floatDragRef.current.startY),
              });
            }
            function onUp() {
              floatDragRef.current = null;
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            }
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        >
          <span className={`h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 ${recorder.state === "recording" ? "animate-rec-pulse" : "opacity-30"}`} />
          <span className="font-mono text-[9px] text-red-300 w-8 text-center tabular-nums">{formatDuration(recorder.duration)}</span>
          <div className="w-px h-2.5 bg-white/15" />
          <Tooltip>
            <TooltipTrigger asChild>
              {recorder.state === "recording" ? (
                <button onClick={recorder.pause} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors">
                  <Pause className="h-2.5 w-2.5" />
                </button>
              ) : (
                <button onClick={recorder.resume} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 text-primary transition-colors">
                  <Play className="h-2.5 w-2.5" />
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent>{recorder.state === "recording" ? "Pause" : "Resume"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={recorder.stop} className="grid h-5 w-5 place-items-center rounded-full hover:bg-red-500/30 text-red-400 transition-colors">
                <StopCircle className="h-2.5 w-2.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Stop recording</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ===== Floating right panel — slides in from right edge on hover ===== */}
      <aside
        className={`
          absolute z-20 space-y-5 overflow-y-auto rounded-xl p-4 ${PANEL}
          right-0 top-[3rem] bottom-14 w-64 md:bottom-0 md:w-72 md:top-[3rem] md:rounded-r-none
          transition-transform duration-300 ease-in-out
          ${panelOpen ? "translate-x-0" : "translate-x-[110%]"}
        `}
        onMouseEnter={() => { onPanelMouseEnter(); setPanelHovered(true); }}
        onMouseLeave={() => { onPanelMouseLeave(); setPanelHovered(false); }}
      >
        {/* Unpin hint row */}
        {pinned && panelHovered && (
          <div className="flex items-center justify-center py-0.5 -mt-1 mb-1 border-b border-white/5">
            <span className="font-mono text-[9px] uppercase tracking-widest animate-glow-pulse select-none">
              unpin to close toolbar
            </span>
          </div>
        )}
        {/* Pin button */}
        <button
          onClick={() => { setPinned((v) => { const next = !v; if (!next) setPanelOpen(false); return next; }); }}
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
                {/* Search */}
                <div className="relative -mx-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    value={gunSearch}
                    onChange={(e) => setGunSearch(e.target.value)}
                    placeholder="Search weapon..."
                    className="w-full bg-white/5 border border-white/15 rounded-md pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-muted-foreground outline-none focus:bg-white/8 focus:border-primary/50 transition-colors"
                  />
                  {gunSearch && (
                    <button onClick={() => setGunSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div ref={gunListRef} className="flex flex-col gap-2 overflow-y-auto max-h-[345px] -mx-4">
                  {gunSearch.trim() ? (
                    /* All guns: matches climb to top, rest stay dimmed below */
                    (() => {
                      const q = gunSearch.toLowerCase();
                      const matches = GUNS.filter((g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
                      const rest = GUNS.filter((g) => !g.name.toLowerCase().includes(q) && !g.category.toLowerCase().includes(q));
                      return [...matches, ...rest].map((g) => {
                        const isMatch = matches.includes(g);
                        return (
                          <div key={g.id} className={isMatch ? "gun-climb" : "opacity-30 pointer-events-none"}>
                            <GunCard g={g} selected={gunId === g.id} onSelect={() => { setGunId(g.id); setGunSearch(""); }} />
                          </div>
                        );
                      });
                    })()
                  ) : (
                    /* Grouped by category */
                    (["AR", "SMG", "DMR", "SR", "LMG", "SG"] as const).map((cat) => {
                      const categoryGuns = GUNS.filter((g) => g.category === cat);
                      const labels: Record<string, string> = { AR: "Assault Rifles", SMG: "SMGs", DMR: "Marksman", SR: "Snipers", LMG: "LMGs", SG: "Shotguns" };
                      return (
                        <div key={cat} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 px-1">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-bold">{labels[cat]}</span>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>
                          {categoryGuns.map((g) => (
                            <GunCard key={g.id} g={g} selected={gunId === g.id} onSelect={() => setGunId(g.id)} />
                          ))}
                        </div>
                      );
                    })
                  )}
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

    {/* ===== Recording preview dialog ===== */}
    {recorder.state === "stopped" && recVideoUrl && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="font-heading text-lg font-bold">Recording ready</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{recQuality} · WebM · {formatDuration(recorder.duration)}</p>
            </div>
            <button
              onClick={() => { recorder.reset(); setRecVideoUrl(null); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <video
            src={recVideoUrl}
            controls
            className="w-full bg-black max-h-64 object-contain"
          />
          <div className="p-4 flex gap-2">
            <button
              onClick={handleDownloadRecording}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 rounded-md border border-white/10 text-muted-foreground text-sm font-semibold py-2.5 cursor-not-allowed opacity-50"
                >
                  Post to Forum
                </button>
              </TooltipTrigger>
              <TooltipContent>Forum video posts — coming soon</TooltipContent>
            </Tooltip>
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
