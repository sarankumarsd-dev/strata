// Scene graph stored in a board document.
// All coordinates are normalized to 0-1 against the map canvas so boards
// re-render correctly at any size.

export type ToolId =
  | "select"
  | "zone"
  | "godspot"
  | "chokespot"
  | "elevation-high"
  | "elevation-low"
  | "gun-arrow"
  | "rotation"
  | "rush"
  | "text";

export interface Pt { x: number; y: number }

export type BoardItem =
  | { id: string; type: "zone"; cx: number; cy: number; r: number; label?: string }
  | { id: string; type: "godspot"; x: number; y: number; label?: string }
  | { id: string; type: "chokespot"; x: number; y: number; label?: string }
  | { id: string; type: "elevation"; kind: "high" | "low"; polygon: Pt[]; label?: string }
  | { id: string; type: "gun-arrow"; gunId: string; from: Pt; to: Pt }
  | { id: string; type: "rotation"; points: Pt[]; split: "none" | "2-2" | "3-1"; label?: string }
  | { id: string; type: "rush"; target: Pt; mode: "split" | "stack"; label?: string }
  | { id: string; type: "text"; x: number; y: number; text: string };

export interface BoardDoc {
  version: 1;
  items: BoardItem[];
}

export const EMPTY_BOARD: BoardDoc = { version: 1, items: [] };

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
