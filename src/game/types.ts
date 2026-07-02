// Rotation Master challenge mode — core types.
// All coordinates are normalized 0-1 against the map canvas, matching
// the board scene graph in lib/board-types.ts.

import type { Pt } from "@/lib/board-types";
import type { BgmiMap } from "@/lib/maps";

export type { Pt };

export interface ZonePhase {
  center: Pt;
  radius: number;
  startSec: number;
  dps: number; // damage per second when outside the zone during this phase
}

export type EnemyArchetype = "aggressive" | "edge-rat" | "camper" | "rotator";

export interface EnemySquad {
  id: string;
  archetype: EnemyArchetype;
  sightRadius: number;
  speed: number; // map-units per tick
  route: Pt[];
  loop: boolean; // true = patrol back and forth, false = stop at final waypoint
}

export interface CoverPolygon {
  type: "polygon";
  points: Pt[];
}

export interface Scenario {
  id: string;
  map: BgmiMap;
  title: string;
  start: Pt;
  parTimeSec: number;
  maxTimeSec: number;
  zonePhases: ZonePhase[];
  goal: { x: number; y: number; radius: number };
  enemies: EnemySquad[];
  cover: CoverPolygon[];
}

export interface PathPoint extends Pt {
  holdSec: number;
}

export interface PlayerPath {
  points: PathPoint[];
}

export interface TickEntry {
  t: number;
  player: Pt;
  enemies: Array<{ id: string; pos: Pt }>;
  zone: { center: Pt; radius: number };
  hp: number;
  zoneDamage: number; // damage taken this tick
  exposedBy: string[]; // enemy squad ids with line of sight this tick
}

export type SimOutcome = "reached-goal" | "did-not-reach" | "knocked" | "timeout";

export interface SimResult {
  outcome: SimOutcome;
  finishTimeSec: number; // tick at which run ended
  zoneDamageTaken: number;
  exposureTicks: number;
  exposureBySquad: Record<string, number>;
  hpRemaining: number;
  ticks: TickEntry[];
}
