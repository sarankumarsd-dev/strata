// Pure tick-based simulation for Rotation Master.
// (scenario, playerPath) => SimResult with a full tick log; the replay
// layer just renders the log, and it can run server-side for validation.

import type {
  EnemySquad, PlayerPath, Pt, Scenario, SimResult, TickEntry, ZonePhase,
} from "@/game/types";
import { dist, isBlocked } from "@/game/lineOfSight";
import { PLAYER_SPEED } from "@/game/scoring";

export const START_HP = 100;

// --- Path walker: advances a fixed distance per tick along waypoints,
// pausing at vertices with remaining hold time.

interface Walker {
  pos: Pt;
  segIndex: number; // index of segment start vertex
  holdLeft: number; // seconds left to hold at current vertex
  done: boolean;
}

function makeWalker(points: Array<Pt & { holdSec?: number }>): Walker {
  return {
    pos: { ...points[0] },
    segIndex: 0,
    holdLeft: points[0]?.holdSec ?? 0,
    done: points.length <= 1,
  };
}

function advanceWalker(w: Walker, points: Array<Pt & { holdSec?: number }>, speed: number): void {
  if (w.done) return;
  if (w.holdLeft > 0) { w.holdLeft -= 1; return; }

  let remaining = speed;
  while (remaining > 0 && !w.done) {
    const target = points[w.segIndex + 1];
    if (!target) { w.done = true; break; }
    const d = dist(w.pos, target);
    // epsilon absorbs float error so exact arrivals don't spill a tick
    if (d <= remaining + 1e-9) {
      remaining -= d;
      w.pos = { x: target.x, y: target.y };
      w.segIndex += 1;
      w.holdLeft = target.holdSec ?? 0;
      if (w.segIndex >= points.length - 1) w.done = true;
      if (w.holdLeft > 0) break; // start holding; consume rest of tick here
    } else {
      const f = remaining / d;
      w.pos = { x: w.pos.x + (target.x - w.pos.x) * f, y: w.pos.y + (target.y - w.pos.y) * f };
      remaining = 0;
    }
  }
}

// --- Enemy movement: same walker, with ping-pong patrol when loop=true.

interface EnemyState {
  squad: EnemySquad;
  route: Pt[]; // current direction of travel
  walker: Walker;
}

function makeEnemyState(squad: EnemySquad): EnemyState {
  return { squad, route: squad.route, walker: makeWalker(squad.route) };
}

function advanceEnemy(e: EnemyState): void {
  if (e.walker.done && e.squad.loop && e.squad.route.length > 1) {
    e.route = [...e.route].reverse();
    e.walker = makeWalker(e.route);
    // keep position continuous: walker starts at reversed route's first point,
    // which is where the enemy just stopped.
  }
  advanceWalker(e.walker, e.route, e.squad.speed);
}

// --- Zone interpolation: circle lerps from previous phase to the next
// phase over [prev.startSec, next.startSec]; holds after the last phase.

export function zoneAt(phases: ZonePhase[], t: number): { center: Pt; radius: number; dps: number } {
  let cur = 0;
  for (let i = 0; i < phases.length; i++) {
    if (t >= phases[i].startSec) cur = i;
  }
  const phase = phases[cur];
  const next = phases[cur + 1];
  if (!next) return { center: phase.center, radius: phase.radius, dps: phase.dps };
  const f = (t - phase.startSec) / (next.startSec - phase.startSec);
  return {
    center: {
      x: phase.center.x + (next.center.x - phase.center.x) * f,
      y: phase.center.y + (next.center.y - phase.center.y) * f,
    },
    radius: phase.radius + (next.radius - phase.radius) * f,
    dps: phase.dps,
  };
}

// --- Main simulation ---

export function simulate(scenario: Scenario, path: PlayerPath): SimResult {
  const points = path.points;
  const goal = scenario.goal;

  const endsInGoal =
    points.length > 0 &&
    dist(points[points.length - 1], goal) <= goal.radius;

  const player = makeWalker(points.length > 0 ? points : [scenario.start]);
  const enemies = scenario.enemies.map(makeEnemyState);

  let hp = START_HP;
  let zoneDamageTaken = 0;
  let exposureTicks = 0;
  const exposureBySquad: Record<string, number> = {};
  const ticks: TickEntry[] = [];

  let outcome: SimResult["outcome"] | null = null;
  let t = 0;

  for (t = 1; t <= scenario.maxTimeSec; t++) {
    advanceWalker(player, points, PLAYER_SPEED);
    for (const e of enemies) advanceEnemy(e);

    const zone = zoneAt(scenario.zonePhases, t);
    let zoneDamage = 0;
    if (dist(player.pos, zone.center) > zone.radius) {
      zoneDamage = zone.dps;
      zoneDamageTaken += zone.dps;
      hp -= zone.dps;
    }

    const exposedBy: string[] = [];
    for (const e of enemies) {
      if (
        dist(player.pos, e.walker.pos) < e.squad.sightRadius &&
        !isBlocked(player.pos, e.walker.pos, scenario.cover)
      ) {
        exposedBy.push(e.squad.id);
        exposureBySquad[e.squad.id] = (exposureBySquad[e.squad.id] ?? 0) + 1;
        exposureTicks += 1;
      }
    }

    ticks.push({
      t,
      player: { ...player.pos },
      enemies: enemies.map((e) => ({ id: e.squad.id, pos: { ...e.walker.pos } })),
      zone: { center: zone.center, radius: zone.radius },
      hp,
      zoneDamage,
      exposedBy,
    });

    if (hp <= 0) { outcome = "knocked"; break; }
    if (player.done) {
      outcome = endsInGoal ? "reached-goal" : "did-not-reach";
      break;
    }
  }

  if (!outcome) outcome = "timeout";

  return {
    outcome,
    finishTimeSec: Math.min(t, scenario.maxTimeSec),
    zoneDamageTaken,
    exposureTicks,
    exposureBySquad,
    hpRemaining: Math.max(0, hp),
    ticks,
  };
}
