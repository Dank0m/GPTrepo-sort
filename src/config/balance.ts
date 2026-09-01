export const SHAPE_IDS = ["circle", "square", "triangle", "diamond", "star"] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

export const SHAPE_COLORS: Record<ShapeId, { fill: string; stroke: string }> = {
  circle: { fill: "#4c8fe8", stroke: "#2f63b0" },
  square: { fill: "#e85d4c", stroke: "#b53d30" },
  triangle: { fill: "#e8c84c", stroke: "#b8941f" },
  diamond: { fill: "#5dcc7a", stroke: "#2f8f4a" },
  star: { fill: "#c07cff", stroke: "#7a3fb8" },
};

export const PALETTE = {
  page: "#1a1428",
  field: "#f4eef8",
  fieldShadow: "#c8bfd4",
  header: "#2b2140",
  text: "#2b2140",
  muted: "#7a708c",
  accent: "#6c5ce7",
  overlay: "rgba(26, 20, 40, 0.78)",
  onOverlay: "#f4eef8",
} as const;

export const LAYOUT = {
  portraitAspect: 9 / 16,
  headerRatio: 0.1,
  itemAreaRatio: 0.58,
  containerRatio: 0.22,
} as const;
