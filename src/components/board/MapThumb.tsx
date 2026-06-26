import React from "react";
import type { MapInfo } from "@/lib/maps";
import erangelAsset from "../../../public/maps/erangel.png.asset.json";
import miramarAsset from "../../../public/maps/miramar.png.asset.json";
import rondoAsset from "../../../public/maps/rondo.png.asset.json";
import sanhokAsset from "../../../public/maps/sanhok.png.asset.json";
import vikendiAsset from "../../../public/maps/vikendi.png.asset.json";
import livikAsset from "../../../public/maps/livik.png.asset.json";

const REAL_MAP_IMAGES: Record<string, string> = {
  erangel: erangelAsset.url,
  miramar: miramarAsset.url,
  rondo: rondoAsset.url,
  sanhok: sanhokAsset.url,
  vikendi: vikendiAsset.url,
  livik: livikAsset.url,
};

interface Props {
  map: MapInfo;
  className?: string;
  showLabels?: boolean;
}

// Tactical map render — real satellite image where available, otherwise
// procedural terrain blobs + grid + landmarks.
// Used as both background of the board canvas and as card thumbnails.
export function MapThumb({ map, className = "", showLabels = false }: Props) {
  const realImage = REAL_MAP_IMAGES[map.id];
  // Deterministic terrain blobs derived from map id so each map looks consistent.
  const seed = hashStr(map.id);
  const blobs = Array.from({ length: 8 }, (_, i) => {
    const cx = ((seed * (i + 7)) % 700) / 1000 + 0.15;
    const cy = ((seed * (i + 13)) % 700) / 1000 + 0.15;
    const r = 0.10 + (((seed * (i + 3)) % 80) / 800);
    return { cx, cy, r };
  });

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{
      background: `radial-gradient(ellipse at 50% 50%, color-mix(in oklab, ${map.accent} 18%, var(--surface)) 0%, var(--background) 80%)`,
    }}>
      {realImage ? (
        <img
          src={realImage}
          alt={`${map.name} map`}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ imageRendering: "high-quality" as React.CSSProperties["imageRendering"], filter: "brightness(1.15) contrast(1.1) saturate(1.1)" }}
        />
      ) : (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-50">
          <defs>
            <filter id={`blur-${map.id}`}><feGaussianBlur stdDeviation="0.03" /></filter>
          </defs>
          <g filter={`url(#blur-${map.id})`}>
            {blobs.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r}
                fill={map.accent} opacity={0.35 - i * 0.02} />
            ))}
          </g>
        </svg>
      )}

      {/* Procedural-only decoration: fake roads + HUD grid. On real satellite
          maps these just add blocky lines when zoomed, so we omit them. */}
      {!realImage && (
        <>
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {map.landmarks.slice(0, -1).map((l, i) => {
              const next = map.landmarks[i + 1];
              return (
                <line key={i} x1={l.x} y1={l.y} x2={next.x} y2={next.y}
                  stroke="color-mix(in oklab, var(--foreground) 18%, transparent)"
                  strokeWidth="0.004" strokeDasharray="0.01 0.008" />
              );
            })}
          </svg>
          <div className="absolute inset-0 hud-grid opacity-60" />
        </>
      )}
      {/* landmarks — only on procedural maps; real satellite images have their own geography */}
      {showLabels && !realImage && (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {map.landmarks.map((l) => (
            <g key={l.name}>
              <circle cx={l.x} cy={l.y} r="0.006" fill="var(--primary)" />
              <text x={l.x + 0.012} y={l.y + 0.004}
                fontSize="0.018" fill="var(--foreground)"
                fontFamily="JetBrains Mono"
                style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 0.003 }}>
                {l.name}
              </text>
            </g>
          ))}
        </svg>
      )}
      {/* corner brackets */}
      <Bracket pos="tl" />
      <Bracket pos="tr" />
      <Bracket pos="bl" />
      <Bracket pos="br" />
    </div>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: "top-2 left-2 border-l-2 border-t-2 rounded-tl",
    tr: "top-2 right-2 border-r-2 border-t-2 rounded-tr",
    bl: "bottom-2 left-2 border-l-2 border-b-2 rounded-bl",
    br: "bottom-2 right-2 border-r-2 border-b-2 rounded-br",
  }[pos];
  return <div className={`absolute h-3 w-3 border-primary/60 ${map}`} />;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
