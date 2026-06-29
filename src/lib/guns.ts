// BGMI weapon effective-range presets (in meters). Used to scale gun-range
// arrow cones against each map's km dimensions.

export interface Gun {
  id: string;
  name: string;
  category: "AR" | "SMG" | "DMR" | "SR" | "LMG" | "SG";
  effectiveRangeM: number;
  spreadDeg: number;
  image: string;
}

export const GUNS: Gun[] = [
  // ── Assault Rifles ─────────────────────────────────────────────────────────
  { id: "akm",    name: "AKM",       category: "AR",  effectiveRangeM: 300, spreadDeg: 14, image: "/guns/akm.png"      },
  { id: "m416",   name: "M416",      category: "AR",  effectiveRangeM: 350, spreadDeg: 11, image: "/guns/m416.png"     },
  { id: "scar",   name: "SCAR-L",    category: "AR",  effectiveRangeM: 320, spreadDeg: 12, image: "/guns/scar.png"     },
  { id: "groza",  name: "Groza",     category: "AR",  effectiveRangeM: 250, spreadDeg: 15, image: "/guns/groza.png"    },
  { id: "m762",   name: "Beryl M762",category: "AR",  effectiveRangeM: 300, spreadDeg: 13, image: "/guns/m762.png"     },
  { id: "famas",  name: "FAMAS G2",  category: "AR",  effectiveRangeM: 320, spreadDeg: 11, image: "/guns/famas.png"    },
  { id: "qbz95",  name: "QBZ95",     category: "AR",  effectiveRangeM: 320, spreadDeg: 11, image: "/guns/qbz95.png"    },
  { id: "mk47",   name: "MK47 Mutant",category:"AR",  effectiveRangeM: 400, spreadDeg: 9,  image: "/guns/mk47.png"     },
  { id: "ace32",  name: "ACE32",     category: "AR",  effectiveRangeM: 350, spreadDeg: 11, image: "/guns/ace32.png"    },
  { id: "g36c",   name: "G36C",      category: "AR",  effectiveRangeM: 300, spreadDeg: 12, image: "/guns/g36c.png"     },
  { id: "k2",     name: "K2",        category: "AR",  effectiveRangeM: 320, spreadDeg: 11, image: "/guns/k2.png"       },
  { id: "aug",    name: "AUG A3",    category: "AR",  effectiveRangeM: 350, spreadDeg: 10, image: "/guns/aug.png"      },
  { id: "m16a4",  name: "M16A4",     category: "AR",  effectiveRangeM: 300, spreadDeg: 12, image: "/guns/m16a4.png"    },
  // ── SMGs ───────────────────────────────────────────────────────────────────
  { id: "ump",    name: "UMP45",     category: "SMG", effectiveRangeM: 150, spreadDeg: 18, image: "/guns/ump.png"      },
  { id: "mp5k",   name: "MP5K",      category: "SMG", effectiveRangeM: 150, spreadDeg: 18, image: "/guns/mp5k.png"     },
  { id: "vector", name: "Vector",    category: "SMG", effectiveRangeM: 100, spreadDeg: 22, image: "/guns/vector.png"   },
  { id: "skorpion",name:"Skorpion",  category: "SMG", effectiveRangeM: 80,  spreadDeg: 24, image: "/guns/skorpion.png" },
  { id: "uzi",    name: "Micro UZI", category: "SMG", effectiveRangeM: 80,  spreadDeg: 24, image: "/guns/uzi.png"      },
  { id: "p90",    name: "P90",       category: "SMG", effectiveRangeM: 150, spreadDeg: 18, image: "/guns/p90.png"      },
  { id: "js9",    name: "JS9",       category: "SMG", effectiveRangeM: 130, spreadDeg: 20, image: "/guns/js9.png"      },
  { id: "mp9",    name: "MP9",       category: "SMG", effectiveRangeM: 100, spreadDeg: 22, image: "/guns/mp9.png"      },
  { id: "tommy",  name: "Tommy Gun", category: "SMG", effectiveRangeM: 120, spreadDeg: 20, image: "/guns/tommy.png"    },
  // ── DMRs ───────────────────────────────────────────────────────────────────
  { id: "mini14", name: "Mini-14",   category: "DMR", effectiveRangeM: 450, spreadDeg: 6,  image: "/guns/mini14.png"   },
  { id: "sks",    name: "SKS",       category: "DMR", effectiveRangeM: 400, spreadDeg: 7,  image: "/guns/sks.png"      },
  { id: "mk12",   name: "MK12",      category: "DMR", effectiveRangeM: 500, spreadDeg: 6,  image: "/guns/mk12.png"     },
  { id: "slr",    name: "SLR",       category: "DMR", effectiveRangeM: 500, spreadDeg: 6,  image: "/guns/slr.png"      },
  { id: "mk14",   name: "MK14",      category: "DMR", effectiveRangeM: 600, spreadDeg: 5,  image: "/guns/mk14.png"     },
  { id: "vss",    name: "VSS",       category: "DMR", effectiveRangeM: 250, spreadDeg: 8,  image: "/guns/vss.png"      },
  // ── Snipers ────────────────────────────────────────────────────────────────
  { id: "kar98",  name: "Kar98K",    category: "SR",  effectiveRangeM: 600, spreadDeg: 3,  image: "/guns/kar98.png"    },
  { id: "awm",    name: "AWM",       category: "SR",  effectiveRangeM: 800, spreadDeg: 2,  image: "/guns/awm.png"      },
  { id: "m24",    name: "M24",       category: "SR",  effectiveRangeM: 650, spreadDeg: 3,  image: "/guns/m24.png"      },
  { id: "dragunov",name:"Dragunov",  category: "SR",  effectiveRangeM: 700, spreadDeg: 3,  image: "/guns/dragunov.png" },
  { id: "win94",  name: "Win94",     category: "SR",  effectiveRangeM: 500, spreadDeg: 4,  image: "/guns/win94.png"    },
  { id: "lynx",   name: "Lynx AMR",  category: "SR",  effectiveRangeM: 900, spreadDeg: 2,  image: "/guns/lynx.png"     },
  // ── LMGs ───────────────────────────────────────────────────────────────────
  { id: "m249",   name: "M249",      category: "LMG", effectiveRangeM: 400, spreadDeg: 12, image: "/guns/m249.png"     },
  { id: "mg3",    name: "MG3",       category: "LMG", effectiveRangeM: 350, spreadDeg: 13, image: "/guns/mg3.png"      },
  // ── Shotguns ───────────────────────────────────────────────────────────────
  { id: "s12k",   name: "S12K",      category: "SG",  effectiveRangeM: 50,  spreadDeg: 28, image: "/guns/s12k.png"     },
  { id: "s686",   name: "S686",      category: "SG",  effectiveRangeM: 40,  spreadDeg: 30, image: "/guns/s686.png"     },
  { id: "s1897",  name: "S1897",     category: "SG",  effectiveRangeM: 40,  spreadDeg: 30, image: "/guns/s1897.png"    },
  { id: "dbs",    name: "DBS",       category: "SG",  effectiveRangeM: 50,  spreadDeg: 28, image: "/guns/dbs.png"      },
  { id: "o12",    name: "O12",       category: "SG",  effectiveRangeM: 50,  spreadDeg: 28, image: "/guns/o12.png"      },
  { id: "sawedoff",name:"Sawed-off", category: "SG",  effectiveRangeM: 25,  spreadDeg: 35, image: "/guns/sawedoff.png" },
];

export const GUNS_BY_ID: Record<string, Gun> = Object.fromEntries(GUNS.map((g) => [g.id, g]));

export function gunRangeAsCanvasFraction(gun: Gun, mapSizeKm: number): number {
  return gun.effectiveRangeM / (mapSizeKm * 1000);
}
