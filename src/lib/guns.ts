// BGMI weapon effective-range presets (in meters). Used to scale gun-range
// arrow cones against each map's km dimensions.

export interface Gun {
  id: string;
  name: string;
  category: "AR" | "SMG" | "DMR" | "SR" | "LMG" | "SG";
  effectiveRangeM: number;
  spreadDeg: number; // cone spread for the arrow overlay
  image?: string;
}

export const GUNS: Gun[] = [
  { id: "akm",      name: "AKM",      category: "AR",  effectiveRangeM: 250, spreadDeg: 14 },
  { id: "m416",     name: "M416",     category: "AR",  effectiveRangeM: 300, spreadDeg: 12 },
  { id: "scar",     name: "SCAR-L",   category: "AR",  effectiveRangeM: 280, spreadDeg: 12 },
  { id: "groza",    name: "Groza",    category: "AR",  effectiveRangeM: 220, spreadDeg: 15 },
  { id: "m762",     name: "Beryl",    category: "AR",  effectiveRangeM: 270, spreadDeg: 14 },
  { id: "ump",      name: "UMP-45",   category: "SMG", effectiveRangeM: 120, spreadDeg: 20 },
  { id: "ump9",     name: "MP5K",     category: "SMG", effectiveRangeM: 130, spreadDeg: 20 },
  { id: "vector",   name: "Vector",   category: "SMG", effectiveRangeM: 90,  spreadDeg: 22 },
  { id: "mini14",   name: "Mini-14",  category: "DMR", effectiveRangeM: 450, spreadDeg: 6,  image: "/guns/mini14.png"    },
  { id: "sks",      name: "SKS",      category: "DMR", effectiveRangeM: 400, spreadDeg: 7,  image: "/guns/sks.png"       },
  { id: "mk12",     name: "MK12",     category: "DMR", effectiveRangeM: 500, spreadDeg: 6,  image: "/guns/mk12.png"      },
  { id: "slr",      name: "SLR",      category: "DMR", effectiveRangeM: 500, spreadDeg: 6,  image: "/guns/slr.png"       },
  { id: "mk14",     name: "MK14",     category: "DMR", effectiveRangeM: 600, spreadDeg: 5,  image: "/guns/mk14.png"      },
  { id: "vss",      name: "VSS",      category: "DMR", effectiveRangeM: 200, spreadDeg: 8,  image: "/guns/vss.png"       },
  { id: "dragunov", name: "Dragunov", category: "SR",  effectiveRangeM: 700, spreadDeg: 3,  image: "/guns/dragunov.png"  },
  { id: "kar98",    name: "Kar98K",   category: "SR",  effectiveRangeM: 600, spreadDeg: 3  },
  { id: "awm",      name: "AWM",      category: "SR",  effectiveRangeM: 800, spreadDeg: 2  },
  { id: "m24",      name: "M24",      category: "SR",  effectiveRangeM: 650, spreadDeg: 3  },
  { id: "dp28",     name: "DP-28",    category: "LMG", effectiveRangeM: 300, spreadDeg: 14 },
  { id: "s12k",     name: "S12K",     category: "SG",  effectiveRangeM: 40,  spreadDeg: 28 },
];

export const GUNS_BY_ID: Record<string, Gun> = Object.fromEntries(GUNS.map((g) => [g.id, g]));

export function gunRangeAsCanvasFraction(gun: Gun, mapSizeKm: number): number {
  // Convert meters into a fraction of the map (0-1).
  return gun.effectiveRangeM / (mapSizeKm * 1000);
}
