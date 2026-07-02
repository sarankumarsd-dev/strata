import { describe, expect, it } from "vitest";
import { simulate, zoneAt, START_HP } from "@/game/simulate";
import { computeScore, PLAYER_SPEED } from "@/game/scoring";
import { isBlocked, segmentsIntersect } from "@/game/lineOfSight";
import type { PlayerPath, Scenario } from "@/game/types";
import erangel001 from "@/game/scenarios/erangel-001.json";

// Minimal scenario: player starts inside a static zone, goal is close by,
// one stationary enemy far away.
function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test-001",
    map: "erangel",
    title: "Test",
    start: { x: 0.5, y: 0.5 },
    parTimeSec: 60,
    maxTimeSec: 120,
    zonePhases: [
      { center: { x: 0.5, y: 0.5 }, radius: 0.3, startSec: 0, dps: 1 },
    ],
    goal: { x: 0.53, y: 0.5, radius: 0.02 },
    enemies: [],
    cover: [],
    ...overrides,
  };
}

const straightPath: PlayerPath = {
  points: [
    { x: 0.5, y: 0.5, holdSec: 0 },
    { x: 0.53, y: 0.5, holdSec: 0 },
  ],
};

describe("simulate", () => {
  it("reaches the goal along a straight path in the expected time", () => {
    const result = simulate(baseScenario(), straightPath);
    expect(result.outcome).toBe("reached-goal");
    // 0.03 map-units at 0.003/tick = 10 ticks
    expect(result.finishTimeSec).toBe(Math.ceil(0.03 / PLAYER_SPEED));
    expect(result.zoneDamageTaken).toBe(0);
    expect(result.exposureTicks).toBe(0);
    expect(result.hpRemaining).toBe(START_HP);
  });

  it("holds add hold seconds to finish time", () => {
    const withHold: PlayerPath = {
      points: [
        { x: 0.5, y: 0.5, holdSec: 0 },
        { x: 0.515, y: 0.5, holdSec: 5 },
        { x: 0.53, y: 0.5, holdSec: 0 },
      ],
    };
    const plain = simulate(baseScenario(), straightPath);
    const held = simulate(baseScenario(), withHold);
    expect(held.outcome).toBe("reached-goal");
    expect(held.finishTimeSec).toBe(plain.finishTimeSec + 5);
  });

  it("fails with did-not-reach when path ends outside the goal circle", () => {
    const result = simulate(baseScenario(), {
      points: [
        { x: 0.5, y: 0.5, holdSec: 0 },
        { x: 0.5, y: 0.45, holdSec: 0 },
      ],
    });
    expect(result.outcome).toBe("did-not-reach");
  });

  it("takes zone damage per tick while outside the circle", () => {
    // Zone far away — player is outside it for the whole run.
    const scenario = baseScenario({
      zonePhases: [{ center: { x: 0.9, y: 0.9 }, radius: 0.05, startSec: 0, dps: 2 }],
    });
    const result = simulate(scenario, straightPath);
    expect(result.outcome).toBe("reached-goal");
    expect(result.zoneDamageTaken).toBe(result.finishTimeSec * 2);
    expect(result.hpRemaining).toBe(START_HP - result.zoneDamageTaken);
  });

  it("knocks the player when zone damage reaches 100", () => {
    const scenario = baseScenario({
      maxTimeSec: 300,
      zonePhases: [{ center: { x: 0.9, y: 0.9 }, radius: 0.01, startSec: 0, dps: 50 }],
    });
    // Long hold keeps the player outside the zone long enough to die.
    const result = simulate(scenario, {
      points: [
        { x: 0.5, y: 0.5, holdSec: 0 },
        { x: 0.51, y: 0.5, holdSec: 60 },
        { x: 0.53, y: 0.5, holdSec: 0 },
      ],
    });
    expect(result.outcome).toBe("knocked");
    expect(result.hpRemaining).toBe(0);
    expect(result.finishTimeSec).toBe(2); // 50 dps → dead on tick 2
  });

  it("times out when the path takes longer than maxTimeSec", () => {
    const scenario = baseScenario({ maxTimeSec: 5 });
    const result = simulate(scenario, {
      points: [
        { x: 0.5, y: 0.5, holdSec: 0 },
        { x: 0.53, y: 0.5, holdSec: 30 },
      ],
    });
    expect(result.outcome).toBe("timeout");
    expect(result.finishTimeSec).toBe(5);
  });

  it("counts exposure ticks when in enemy sight with no cover", () => {
    const scenario = baseScenario({
      enemies: [{
        id: "watcher",
        archetype: "camper",
        sightRadius: 0.1,
        speed: 0, // stationary
        route: [{ x: 0.52, y: 0.5 }],
        loop: false,
      }],
    });
    const result = simulate(scenario, straightPath);
    // Player is within 0.1 of the watcher for the entire 10-tick run.
    expect(result.exposureTicks).toBe(result.finishTimeSec);
    expect(result.exposureBySquad["watcher"]).toBe(result.finishTimeSec);
  });

  it("cover blocks line of sight", () => {
    const scenario = baseScenario({
      enemies: [{
        id: "watcher",
        archetype: "camper",
        sightRadius: 0.1,
        speed: 0,
        route: [{ x: 0.52, y: 0.55 }],
        loop: false,
      }],
      // Wall between the path (y=0.5) and the watcher (y=0.55)
      cover: [{
        type: "polygon",
        points: [
          { x: 0.4, y: 0.52 }, { x: 0.6, y: 0.52 },
          { x: 0.6, y: 0.53 }, { x: 0.4, y: 0.53 },
        ],
      }],
    });
    const result = simulate(scenario, straightPath);
    expect(result.exposureTicks).toBe(0);
  });

  it("looping enemies ping-pong along their route", () => {
    const scenario = baseScenario({
      maxTimeSec: 100,
      enemies: [{
        id: "patrol",
        archetype: "edge-rat",
        sightRadius: 0.001,
        speed: 0.01,
        route: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }],
        loop: true,
      }],
    });
    const result = simulate(scenario, {
      points: [
        { x: 0.5, y: 0.5, holdSec: 0 },
        { x: 0.5, y: 0.5, holdSec: 30 },
        { x: 0.53, y: 0.5, holdSec: 0 },
      ],
    });
    const xs = result.ticks.map((tk) => tk.enemies[0].pos.x);
    // Route is 0.1 long at 0.01/tick → reaches the end at tick 10, then turns back.
    expect(Math.max(...xs)).toBeCloseTo(0.2, 5);
    expect(xs[14]).toBeLessThan(0.2 - 0.001); // heading back after the turn
    expect(Math.min(...xs.slice(10))).toBeCloseTo(0.1, 5);
  });

  it("runs the real erangel-001 scenario end to end", () => {
    const scenario = erangel001 as unknown as Scenario;
    const result = simulate(scenario, {
      points: [
        { x: 0.42, y: 0.61, holdSec: 0 },
        { x: 0.48, y: 0.55, holdSec: 0 },
        { x: 0.55, y: 0.48, holdSec: 0 },
      ],
    });
    expect(result.outcome).toBe("reached-goal");
    expect(result.ticks.length).toBe(result.finishTimeSec);
    expect(result.ticks[0].t).toBe(1);
  });
});

describe("zoneAt", () => {
  const phases = [
    { center: { x: 0.5, y: 0.5 }, radius: 0.3, startSec: 0, dps: 1 },
    { center: { x: 0.6, y: 0.5 }, radius: 0.1, startSec: 100, dps: 2 },
  ];

  it("interpolates radius and center between phases", () => {
    const mid = zoneAt(phases, 50);
    expect(mid.radius).toBeCloseTo(0.2, 10);
    expect(mid.center.x).toBeCloseTo(0.55, 10);
    expect(mid.dps).toBe(1);
  });

  it("holds the final phase after its start", () => {
    const late = zoneAt(phases, 140);
    expect(late.radius).toBe(0.1);
    expect(late.dps).toBe(2);
  });
});

describe("computeScore", () => {
  const goodRun = {
    outcome: "reached-goal" as const,
    finishTimeSec: 50,
    zoneDamageTaken: 10,
    exposureTicks: 2,
    exposureBySquad: {},
    hpRemaining: 90,
    ticks: [],
  };

  it("applies the weighted penalties", () => {
    const { score, breakdown } = computeScore(goodRun, 60);
    // 1000 - 10*5 - 2*15 - 0 = 920
    expect(score).toBe(920);
    expect(breakdown.zoneDamagePenalty).toBe(50);
    expect(breakdown.exposurePenalty).toBe(30);
    expect(breakdown.overtimePenalty).toBe(0);
  });

  it("penalizes overtime past par", () => {
    const { score } = computeScore({ ...goodRun, finishTimeSec: 80 }, 60);
    expect(score).toBe(920 - 20 * 2);
  });

  it("awards stars by threshold", () => {
    expect(computeScore(goodRun, 60).stars).toBe(3);
    expect(computeScore({ ...goodRun, zoneDamageTaken: 50 }, 60).stars).toBe(2); // 720
    expect(computeScore({ ...goodRun, zoneDamageTaken: 100 }, 60).stars).toBe(1); // 470
    expect(computeScore({ ...goodRun, zoneDamageTaken: 200 }, 60).stars).toBe(0); // 0
  });

  it("failure outcomes score 0", () => {
    expect(computeScore({ ...goodRun, outcome: "knocked" }, 60).score).toBe(0);
    expect(computeScore({ ...goodRun, outcome: "did-not-reach" }, 60).score).toBe(0);
    expect(computeScore({ ...goodRun, outcome: "timeout" }, 60).score).toBe(0);
  });

  it("clamps at zero", () => {
    const { score } = computeScore({ ...goodRun, exposureTicks: 100 }, 60);
    expect(score).toBe(0);
  });
});

describe("lineOfSight", () => {
  it("detects crossing segments", () => {
    expect(segmentsIntersect(
      { x: 0, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: 1 }, { x: 1, y: 0 },
    )).toBe(true);
  });

  it("rejects parallel non-touching segments", () => {
    expect(segmentsIntersect(
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 },
    )).toBe(false);
  });

  it("isBlocked is false with no cover", () => {
    expect(isBlocked({ x: 0, y: 0 }, { x: 1, y: 1 }, [])).toBe(false);
  });
});
