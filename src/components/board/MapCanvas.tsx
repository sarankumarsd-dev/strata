import { useEffect, useRef, useState } from "react";
import type { BoardDoc, BoardItem, Pt, ToolId } from "@/lib/board-types";
import { GUNS_BY_ID, gunRangeAsCanvasFraction } from "@/lib/guns";
import type { MapInfo } from "@/lib/maps";
import { MapThumb } from "@/components/board/MapThumb";
import { Minus, Plus, Maximize2 } from "lucide-react";

interface Props {
  map: MapInfo;
  doc: BoardDoc;
  tool: ToolId;
  // Tool config (from properties panel)
  zoneRadius: number;          // 0-0.5
  gunId: string;
  rotationSplit: "none" | "2-2" | "3-1";
  rushMode: "split" | "stack";
  // Building polyline/polygon state
  buildingPoints: Pt[];
  onAdd: (item: BoardItem) => void;
  onUpdateBuilding: (pts: Pt[]) => void;
  onCommitBuilding: () => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

// How many px of movement before a touch-start is treated as a pan drag
// (NOT a tap-to-place). Keep higher than desktop (4px) since fingers wobble.
const TOUCH_DRAG_THRESHOLD = 10;
// Gap in ms for double-tap detection on touch devices
const DOUBLE_TAP_MS = 320;

export function MapCanvas(props: Props) {
  const {
    map, doc, tool, zoneRadius, gunId, rotationSplit, rushMode,
    buildingPoints, onAdd, onUpdateBuilding, onCommitBuilding, onRemove, readOnly,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [pending, setPending] = useState<Pt | null>(null);

  // Zoom + pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Draggable zoom widget position (bottom-left default)
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const zoomDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Pointer tracking
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panStartRef = useRef<{ panX: number; panY: number; px: number; py: number } | null>(null);
  const pinchStartRef = useRef<{ dist: number; zoom: number; cx: number; cy: number; panX: number; panY: number } | null>(null);
  // didDragRef tracks whether current gesture moved MORE than threshold (pan/pinch)
  const didDragRef = useRef(false);
  // dragedDistRef accumulates total movement per gesture
  const dragDistRef = useRef(0);

  // Double-tap detection for mobile (finish polygon)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Reset transient state when tool changes
  useEffect(() => { setPending(null); }, [tool]);

  // Native non-passive wheel listener — React's synthetic onWheel can't reliably
  // call preventDefault in Chrome/Safari, which lets the browser zoom the whole page.
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const newZ = Math.max(1, Math.min(16,currentZoom * factor));
      const wx = (cx - currentPan.x) / currentZoom;
      const wy = (cy - currentPan.y) / currentZoom;
      const minX = rect.width * (1 - newZ);
      const minY = rect.height * (1 - newZ);
      const newPan = {
        x: Math.min(0, Math.max(minX, cx - wx * newZ)),
        y: Math.min(0, Math.max(minY, cy - wy * newZ)),
      };
      setZoom(newZ);
      setPan(newPan);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // --- Coordinate helpers ---

  /** Convert a clientX/Y to normalized [0,1] SVG point via the SVG element. */
  function ptFromClient(clientX: number, clientY: number): Pt {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  }

  function ptFromEvent(e: { clientX: number; clientY: number }): Pt {
    return ptFromClient(e.clientX, e.clientY);
  }

  // --- Zoom / pan helpers ---

  function clampZoom(z: number) { return Math.max(1, Math.min(16,z)); }

  function clampPan(px: number, py: number, z: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: px, y: py };
    const minX = rect.width * (1 - z);
    const minY = rect.height * (1 - z);
    return { x: Math.min(0, Math.max(minX, px)), y: Math.min(0, Math.max(minY, py)) };
  }

  function zoomAround(cx: number, cy: number, newZoom: number, currentZoom: number, currentPan: { x: number; y: number }) {
    const z = clampZoom(newZoom);
    const wx = (cx - currentPan.x) / currentZoom;
    const wy = (cy - currentPan.y) / currentZoom;
    return { zoom: z, pan: clampPan(cx - wx * z, cy - wy * z, z) };
  }

  // --- Pointer events (mouse + touch unified via Pointer API) ---

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didDragRef.current = false;
    dragDistRef.current = 0;

    if (pointersRef.current.size === 2) {
      // Start pinch
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
      const rect = containerRef.current!.getBoundingClientRect();
      pinchStartRef.current = {
        dist: Math.hypot(dx, dy),
        zoom,
        cx: (pts[0].x + pts[1].x) / 2 - rect.left,
        cy: (pts[0].y + pts[1].y) / 2 - rect.top,
        panX: pan.x, panY: pan.y,
      };
      panStartRef.current = null;
    } else {
      panStartRef.current = { panX: pan.x, panY: pan.y, px: e.clientX, py: e.clientY };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch zoom
    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const s = pinchStartRef.current;
      const newZoom = clampZoom(s.zoom * (dist / s.dist));
      const wx = (s.cx - s.panX) / s.zoom;
      const wy = (s.cy - s.panY) / s.zoom;
      setZoom(newZoom);
      setPan(clampPan(s.cx - wx * newZoom, s.cy - wy * newZoom, newZoom));
      didDragRef.current = true;
      return;
    }

    // Single-pointer pan (only when zoomed in)
    if (panStartRef.current && pointersRef.current.size === 1) {
      const dx = e.clientX - panStartRef.current.px;
      const dy = e.clientY - panStartRef.current.py;
      const dist = Math.hypot(dx, dy);
      dragDistRef.current = dist;

      // Use stricter threshold for touch (pointerType === "touch") to avoid
      // swallowing placement taps that wobble slightly.
      const threshold = e.pointerType === "touch" ? TOUCH_DRAG_THRESHOLD : 4;
      if (dist > threshold && zoom > 1) {
        didDragRef.current = true;
        setPan(clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy, zoom));
      }
    }

    // Update hover (used for ghost preview on desktop)
    if (e.pointerType !== "touch") {
      setHover(ptFromClient(e.clientX, e.clientY));
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const wasDrag = didDragRef.current;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) panStartRef.current = null;

    // On touch, handle tap → place item here (not via SVG onClick, since
    // SVG onClick on mobile can be unreliable when nested inside a panned div).
    if (e.pointerType === "touch" && !wasDrag && !readOnly) {
      const p = ptFromClient(e.clientX, e.clientY);

      // Double-tap detection → finish polygon/polyline
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40
      ) {
        lastTapRef.current = null;
        if (tool === "elevation-high" || tool === "elevation-low" || tool === "rotation") {
          onCommitBuilding();
          return;
        }
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

      handlePlace(p);
    }
  }

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // --- Placement logic (shared between mouse click and touch tap) ---

  function handlePlace(p: Pt) {
    switch (tool) {
      case "select": return;
      case "zone":
        onAdd({ id: newId("zone"), type: "zone", cx: p.x, cy: p.y, r: zoneRadius });
        return;
      case "godspot":
        onAdd({ id: newId("god"), type: "godspot", x: p.x, y: p.y, label: "God spot" });
        return;
      case "chokespot":
        onAdd({ id: newId("chk"), type: "chokespot", x: p.x, y: p.y, label: "Choke" });
        return;
      case "rush":
        onAdd({ id: newId("rsh"), type: "rush", target: p, mode: rushMode, label: rushMode === "split" ? "Split rush" : "Stack rush" });
        return;
      case "text": {
        const text = window.prompt("Label text?")?.trim();
        if (text) onAdd({ id: newId("txt"), type: "text", x: p.x, y: p.y, text });
        return;
      }
      case "gun-arrow": {
        if (!pending) { setPending(p); return; }
        onAdd({ id: newId("arr"), type: "gun-arrow", gunId, from: pending, to: p });
        setPending(null);
        return;
      }
      case "elevation-high":
      case "elevation-low":
      case "rotation":
        onUpdateBuilding([...buildingPoints, p]);
        return;
    }
  }

  // --- SVG mouse events (desktop only) ---

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (readOnly) return;
    if (didDragRef.current) { didDragRef.current = false; return; }
    handlePlace(ptFromEvent(e));
  }

  function handleDouble(_e: React.MouseEvent<SVGSVGElement>) {
    if (readOnly) return;
    if (tool === "elevation-high" || tool === "elevation-low" || tool === "rotation") {
      onCommitBuilding();
    }
  }

  const w = 1000;
  const h = 1000;
  const panCursor = zoom > 1 ? "grab" : "";

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-background touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseLeave={() => setHover(null)}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div className="absolute inset-0">
          <MapThumb map={map} showLabels />
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className={`absolute inset-0 h-full w-full ${readOnly ? "" : panCursor || "cursor-crosshair"}`}
          onClick={handleClick}
          onDoubleClick={handleDouble}
        >
          {doc.items.map((it) => (
            <ItemView key={it.id} item={it} map={map} onRemove={readOnly ? undefined : onRemove} />
          ))}

          {buildingPoints.length > 0 && hover && (
            <BuildingPreview tool={tool} points={buildingPoints} hover={hover} />
          )}

          {pending && hover && tool === "gun-arrow" && (
            <PendingArrow from={pending} to={hover} gunId={gunId} mapSizeKm={map.sizeKm} />
          )}

          {hover && !readOnly && (tool === "godspot" || tool === "chokespot" || tool === "rush") && (
            <circle cx={hover.x * w} cy={hover.y * h} r={14 / zoom} fill="none"
              stroke={tool === "godspot" ? "var(--success)" : tool === "chokespot" ? "var(--danger)" : "var(--secondary)"}
              strokeWidth={2 / zoom} opacity="0.7" />
          )}

          {hover && !readOnly && tool === "zone" && (
            <circle cx={hover.x * w} cy={hover.y * h} r={zoneRadius * w}
              fill="none" stroke="var(--primary)" strokeWidth={2 / zoom} strokeDasharray="6 4" opacity="0.5" />
          )}
        </svg>
      </div>

      {/* ===== Zoom controls (draggable) ===== */}
      <div
        className="absolute z-10 flex flex-col gap-1 rounded-md border border-white/10 bg-transparent backdrop-blur-xl p-1 shadow-2xl cursor-grab active:cursor-grabbing"
        style={zoomPos ? { left: zoomPos.x, top: zoomPos.y, bottom: "auto" } : { bottom: 12, left: 12 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const parent = el.parentElement!.getBoundingClientRect();
          zoomDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: rect.left - parent.left,
            origY: rect.top - parent.top,
          };
          function onMove(ev: MouseEvent) {
            if (!zoomDragRef.current) return;
            setZoomPos({
              x: zoomDragRef.current.origX + (ev.clientX - zoomDragRef.current.startX),
              y: zoomDragRef.current.origY + (ev.clientY - zoomDragRef.current.startY),
            });
          }
          function onUp() {
            zoomDragRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          }
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
          onClick={() => {
            const r = containerRef.current!.getBoundingClientRect();
            const result = zoomAround(r.width / 2, r.height / 2, zoom * 1.25, zoom, pan);
            setZoom(result.zoom);
            setPan(result.pan);
          }}
        ><Plus className="h-3.5 w-3.5" /></button>
        <button
          type="button"
          aria-label="Zoom out"
          className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
          onClick={() => {
            const r = containerRef.current!.getBoundingClientRect();
            const result = zoomAround(r.width / 2, r.height / 2, zoom / 1.25, zoom, pan);
            setZoom(result.zoom);
            setPan(result.pan);
          }}
        ><Minus className="h-3.5 w-3.5" /></button>
        <button
          type="button"
          aria-label="Reset view"
          className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-foreground"
          onClick={resetView}
        ><Maximize2 className="h-3.5 w-3.5" /></button>
      </div>

      {zoom > 1.001 && (
        <div className="absolute top-3 right-3 z-10 rounded-md border border-white/10 bg-transparent backdrop-blur-xl px-2 py-1 font-mono text-xs text-primary shadow-2xl">
          {zoom.toFixed(1)}×
        </div>
      )}

      {/* ===== Touch hint — shows on touch devices when placing multi-point items ===== */}
      {buildingPoints.length > 0 && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full border border-white/10 bg-transparent backdrop-blur-xl px-3 py-1.5 font-mono text-[11px] text-primary shadow-lg md:hidden">
          {buildingPoints.length} pt · double-tap to finish
        </div>
      )}

      {/* ===== Mobile touch indicator — shows active tool name below the map ===== */}
      {!readOnly && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 z-10 rounded-full border border-white/10 bg-transparent backdrop-blur-xl px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground shadow md:hidden">
          {tool} · tap to place
        </div>
      )}
    </div>
  );
}

// ============================================================
// Item rendering
// ============================================================

function ItemView({ item, map, onRemove }: { item: BoardItem; map: MapInfo; onRemove?: (id: string) => void }) {
  const W = 1000, H = 1000;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove && (e.shiftKey || e.altKey)) onRemove(item.id);
  };
  const cursor = onRemove ? "cursor-pointer" : "";

  switch (item.type) {
    case "zone":
      return (
        <g onClick={handleClick} className={cursor}>
          <circle cx={item.cx * W} cy={item.cy * H} r={item.r * W}
            fill="color-mix(in oklab, var(--primary) 8%, transparent)"
            stroke="var(--primary)" strokeWidth="3" />
          <circle cx={item.cx * W} cy={item.cy * H} r="4" fill="var(--primary)" />
        </g>
      );
    case "godspot":
      return (
        <g onClick={handleClick} className={cursor}>
          <circle cx={item.x * W} cy={item.y * H} r="16"
            fill="color-mix(in oklab, var(--success) 30%, transparent)"
            stroke="var(--success)" strokeWidth="2" />
          <path d={`M${item.x * W} ${item.y * H - 6} L${item.x * W - 5} ${item.y * H + 3} L${item.x * W + 5} ${item.y * H + 3} Z`} fill="var(--success)" />
          {item.label && <Tag x={item.x * W} y={item.y * H - 22} text={item.label} color="var(--success)" />}
        </g>
      );
    case "chokespot":
      return (
        <g onClick={handleClick} className={cursor}>
          <circle cx={item.x * W} cy={item.y * H} r="16"
            fill="color-mix(in oklab, var(--danger) 30%, transparent)"
            stroke="var(--danger)" strokeWidth="2" />
          <path d={`M${item.x * W - 5} ${item.y * H - 5} L${item.x * W + 5} ${item.y * H + 5} M${item.x * W + 5} ${item.y * H - 5} L${item.x * W - 5} ${item.y * H + 5}`} stroke="var(--danger)" strokeWidth="2.5" />
          {item.label && <Tag x={item.x * W} y={item.y * H - 22} text={item.label} color="var(--danger)" />}
        </g>
      );
    case "elevation": {
      const fill = item.kind === "high" ? "var(--success)" : "var(--danger)";
      const pts = item.polygon.map((p) => `${p.x * W},${p.y * H}`).join(" ");
      const cx = item.polygon.reduce((s, p) => s + p.x, 0) / item.polygon.length * W;
      const cy = item.polygon.reduce((s, p) => s + p.y, 0) / item.polygon.length * H;
      return (
        <g onClick={handleClick} className={cursor}>
          <polygon points={pts} fill={`color-mix(in oklab, ${fill} 18%, transparent)`} stroke={fill} strokeWidth="2.5" strokeDasharray="4 4" />
          <Tag x={cx} y={cy} text={item.label ?? (item.kind === "high" ? "HIGH GROUND" : "LOW GROUND")} color={fill} />
        </g>
      );
    }
    case "gun-arrow": {
      const gun = GUNS_BY_ID[item.gunId];
      if (!gun) return null;
      return (
        <g onClick={handleClick} className={cursor}>
          <ArrowCone from={item.from} to={item.to} gun={gun} mapSizeKm={map.sizeKm} />
        </g>
      );
    }
    case "rotation": {
      const pts = item.points.map((p) => `${p.x * W},${p.y * H}`).join(" ");
      const splitColor = "var(--primary)";
      return (
        <g onClick={handleClick} className={cursor}>
          <polyline points={pts} fill="none" stroke={splitColor} strokeWidth="4" strokeDasharray="10 6" strokeLinejoin="round" />
          {item.points.map((p, i) => (
            <circle key={i} cx={p.x * W} cy={p.y * H} r="6" fill={splitColor} />
          ))}
          {item.split !== "none" && (
            <Tag x={item.points[0].x * W} y={item.points[0].y * H - 18} text={`SPLIT ${item.split}`} color="var(--primary)" />
          )}
        </g>
      );
    }
    case "rush": {
      const color = item.mode === "split" ? "var(--primary)" : "var(--secondary)";
      return (
        <g onClick={handleClick} className={cursor}>
          <circle cx={item.target.x * W} cy={item.target.y * H} r="22" fill="none" stroke={color} strokeWidth="2.5" />
          <circle cx={item.target.x * W} cy={item.target.y * H} r="6" fill={color} />
          <Tag x={item.target.x * W} y={item.target.y * H - 32} text={item.mode === "split" ? "SPLIT RUSH" : "STACK RUSH"} color={color} />
        </g>
      );
    }
    case "text":
      return (
        <g onClick={handleClick} className={cursor}>
          <Tag x={item.x * W} y={item.y * H} text={item.text} color="var(--foreground)" />
        </g>
      );
  }
}

function Tag({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const w = Math.max(text.length * 7.5 + 14, 50);
  return (
    <g>
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx="3"
        fill="var(--background)" stroke={color} strokeWidth="1.5" opacity="0.95" />
      <text x={x} y={y + 4} fontSize="12" fontFamily="JetBrains Mono" fontWeight="600"
        textAnchor="middle" fill={color} style={{ letterSpacing: "0.05em" }}>
        {text.toUpperCase()}
      </text>
    </g>
  );
}

function BuildingPreview({ tool, points, hover }: { tool: ToolId; points: Pt[]; hover: Pt }) {
  const W = 1000, H = 1000;
  const all = [...points, hover];
  const pts = all.map((p) => `${p.x * W},${p.y * H}`).join(" ");
  const isPoly = tool === "elevation-high" || tool === "elevation-low";
  const color = tool === "elevation-low" ? "var(--danger)" : tool === "elevation-high" ? "var(--success)" : "var(--primary)";
  return (
    <g>
      {isPoly ? (
        <polygon points={pts} fill={`color-mix(in oklab, ${color} 10%, transparent)`} stroke={color} strokeWidth="2" strokeDasharray="4 4" />
      ) : (
        <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeDasharray="8 4" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x * W} cy={p.y * H} r="5" fill={color} />
      ))}
    </g>
  );
}

function PendingArrow({ from, to, gunId, mapSizeKm }: { from: Pt; to: Pt; gunId: string; mapSizeKm: number }) {
  const gun = GUNS_BY_ID[gunId];
  if (!gun) return null;
  return <ArrowCone from={from} to={to} gun={gun} mapSizeKm={mapSizeKm} preview />;
}

function ArrowCone({ from, to, gun, mapSizeKm, preview }: { from: Pt; to: Pt; gun: ReturnType<typeof Object>; mapSizeKm: number; preview?: boolean }) {
  const W = 1000, H = 1000;
  const dx = to.x - from.x, dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const rangeFrac = gunRangeAsCanvasFraction(gun as any, mapSizeKm);
  const spread = ((gun as any).spreadDeg * Math.PI) / 180;
  const len = rangeFrac;
  const tipX = from.x + Math.cos(angle) * len;
  const tipY = from.y + Math.sin(angle) * len;
  const leftX = from.x + Math.cos(angle - spread) * len * 0.92;
  const leftY = from.y + Math.sin(angle - spread) * len * 0.92;
  const rightX = from.x + Math.cos(angle + spread) * len * 0.92;
  const rightY = from.y + Math.sin(angle + spread) * len * 0.92;
  const opacity = preview ? 0.45 : 0.85;
  return (
    <g opacity={opacity}>
      <polygon
        points={`${from.x * W},${from.y * H} ${leftX * W},${leftY * H} ${tipX * W},${tipY * H} ${rightX * W},${rightY * H}`}
        fill="color-mix(in oklab, var(--warning) 20%, transparent)"
        stroke="var(--warning)" strokeWidth="2" />
      <circle cx={from.x * W} cy={from.y * H} r="6" fill="var(--warning)" />
      <line x1={from.x * W} y1={from.y * H} x2={tipX * W} y2={tipY * H} stroke="var(--warning)" strokeWidth="2.5" />
      <Tag x={(from.x + tipX) / 2 * W} y={(from.y + tipY) / 2 * H} text={`${(gun as any).name} · ${(gun as any).effectiveRangeM}m`} color="var(--warning)" />
    </g>
  );
}

function clamp(n: number) { return Math.max(0, Math.min(1, n)); }
function newId(p: string) { return `${p}_${Math.random().toString(36).slice(2, 9)}`; }
