// Scoring constants + score calculation for Rotation Master.
// All weights live here for easy tuning.

import type { SimResult } from "@/game/types";

export const SCORE_BASE = 1000;
export const ZONE_DAMAGE_WEIGHT = 5;
export const EXPOSURE_TICK_WEIGHT = 15;
export const OVERTIME_WEIGHT = 2;

export const STAR_THRESHOLDS = { three: 850, two: 650, one: 400 } as const;

// Player squad movement speed, map-units per tick
export const PLAYER_SPEED = 0.003;

export interface ScoreResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
  breakdown: {
    zoneDamagePenalty: number;
    exposurePenalty: number;
    overtimePenalty: number;
  };
}

export function computeScore(result: SimResult, parTimeSec: number): ScoreResult {
  if (result.outcome !== "reached-goal") {
    return {
      score: 0,
      stars: 0,
      breakdown: { zoneDamagePenalty: 0, exposurePenalty: 0, overtimePenalty: 0 },
    };
  }

  const zoneDamagePenalty = result.zoneDamageTaken * ZONE_DAMAGE_WEIGHT;
  const exposurePenalty = result.exposureTicks * EXPOSURE_TICK_WEIGHT;
  const overtimePenalty = Math.max(0, result.finishTimeSec - parTimeSec) * OVERTIME_WEIGHT;

  const score = Math.max(0, SCORE_BASE - zoneDamagePenalty - exposurePenalty - overtimePenalty);

  const stars: 0 | 1 | 2 | 3 =
    score >= STAR_THRESHOLDS.three ? 3 :
    score >= STAR_THRESHOLDS.two ? 2 :
    score >= STAR_THRESHOLDS.one ? 1 : 0;

  return { score, stars, breakdown: { zoneDamagePenalty, exposurePenalty, overtimePenalty } };
}
