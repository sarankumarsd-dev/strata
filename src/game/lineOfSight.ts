// Segment-polygon intersection for cover line-of-sight checks.

import type { CoverPolygon, Pt } from "@/game/types";

/** Orientation of ordered triplet (p, q, r): 0 = collinear, 1 = cw, 2 = ccw. */
function orientation(p: Pt, q: Pt, r: Pt): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: Pt, q: Pt, r: Pt): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-12 && q.x >= Math.min(p.x, r.x) - 1e-12 &&
    q.y <= Math.max(p.y, r.y) + 1e-12 && q.y >= Math.min(p.y, r.y) - 1e-12
  );
}

export function segmentsIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;

  return false;
}

/** True if the segment from→to crosses any edge of any cover polygon. */
export function isBlocked(from: Pt, to: Pt, cover: CoverPolygon[]): boolean {
  for (const poly of cover) {
    const pts = poly.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      if (segmentsIntersect(from, to, pts[i], pts[j])) return true;
    }
  }
  return false;
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
