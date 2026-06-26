// BGMI map metadata. Map background is the real satellite image where
// available, falling back to a procedural tactical render otherwise.

export type BgmiMap = "erangel" | "miramar" | "sanhok" | "vikendi" | "livik" | "rondo";

export interface MapInfo {
  id: BgmiMap;
  name: string;
  sizeKm: number;        // edge length in km
  biome: string;
  accent: string;         // visual accent color for the map tile
  landmarks: Array<{ x: number; y: number; name: string }>;
}

export const MAPS: Record<BgmiMap, MapInfo> = {
  erangel: {
    id: "erangel",
    name: "Erangel",
    sizeKm: 8,
    biome: "Temperate · 8×8 km",
    accent: "oklch(0.70 0.12 145)",
    landmarks: [
      { x: 0.30, y: 0.32, name: "Georgopol" },
      { x: 0.52, y: 0.28, name: "Severny" },
      { x: 0.40, y: 0.58, name: "Pochinki" },
      { x: 0.60, y: 0.50, name: "School" },
      { x: 0.70, y: 0.42, name: "Yasnaya" },
      { x: 0.72, y: 0.66, name: "Mansion" },
      { x: 0.50, y: 0.86, name: "Sosnovka MB" },
    ],
  },
  miramar: {
    id: "miramar",
    name: "Miramar",
    sizeKm: 8,
    biome: "Desert · 8×8 km",
    accent: "oklch(0.78 0.14 60)",
    landmarks: [
      { x: 0.22, y: 0.30, name: "Pecado" },
      { x: 0.46, y: 0.38, name: "Los Leones" },
      { x: 0.66, y: 0.30, name: "San Martin" },
      { x: 0.55, y: 0.70, name: "El Pozo" },
      { x: 0.80, y: 0.55, name: "Hacienda" },
    ],
  },
  sanhok: {
    id: "sanhok",
    name: "Sanhok",
    sizeKm: 4,
    biome: "Jungle · 4×4 km",
    accent: "oklch(0.68 0.14 155)",
    landmarks: [
      { x: 0.30, y: 0.40, name: "Paradise" },
      { x: 0.55, y: 0.30, name: "Bootcamp" },
      { x: 0.70, y: 0.55, name: "Ruins" },
      { x: 0.40, y: 0.72, name: "Camp Bravo" },
    ],
  },
  vikendi: {
    id: "vikendi",
    name: "Vikendi",
    sizeKm: 6,
    biome: "Snow · 6×6 km",
    accent: "oklch(0.85 0.04 220)",
    landmarks: [
      { x: 0.32, y: 0.36, name: "Cosmodrome" },
      { x: 0.55, y: 0.45, name: "Castle" },
      { x: 0.70, y: 0.62, name: "Goroka" },
      { x: 0.40, y: 0.70, name: "Vihar" },
    ],
  },
  livik: {
    id: "livik",
    name: "Livik",
    sizeKm: 2,
    biome: "Mixed · 2×2 km",
    accent: "oklch(0.72 0.13 130)",
    landmarks: [
      { x: 0.40, y: 0.35, name: "Crab Town" },
      { x: 0.60, y: 0.55, name: "Power Plant" },
      { x: 0.30, y: 0.65, name: "Iceborn" },
    ],
  },
  rondo: {
    id: "rondo",
    name: "Rondo",
    sizeKm: 8,
    biome: "Asian · 8×8 km",
    accent: "oklch(0.72 0.12 35)",
    landmarks: [
      { x: 0.18, y: 0.38, name: "Jao Tin" },
      { x: 0.34, y: 0.32, name: "Stadium" },
      { x: 0.58, y: 0.48, name: "Neon Factory" },
      { x: 0.78, y: 0.40, name: "Mey Ran" },
      { x: 0.85, y: 0.68, name: "Jadena City" },
      { x: 0.45, y: 0.77, name: "Hung Shan" },
      { x: 0.62, y: 0.86, name: "Tin Long Garden" },
    ],
  },
};

export const MAP_LIST = Object.values(MAPS);

export function getMap(id: string): MapInfo {
  if (id in MAPS) return MAPS[id as BgmiMap];
  return MAPS.erangel;
}
