import { LAYOUT, SHAPE_IDS, type ShapeId } from "../config/balance.ts";
import { configForLevel } from "../config/levels.ts";
import { SeedRandom } from "../utils/Random.ts";
import type { Rect } from "../utils/math.ts";
import { Container } from "./Container.ts";
import { Item } from "./Item.ts";
import { Level } from "./Level.ts";

export type Playfield = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Phase 1 generator: 2 types, seed-based placement. Full curve is Phase 2. */
export function generateLevel(levelNumber: number, playfield: Playfield): Level {
  const config = configForLevel(levelNumber);
  const rng = new SeedRandom(config.seed);
  const headerH = playfield.h * LAYOUT.headerRatio;
  const itemAreaH = playfield.h * LAYOUT.itemAreaRatio;
  const containerH = playfield.h * LAYOUT.containerRatio;
  const pad = playfield.w * 0.045;

  const itemArea: Rect = {
    x: playfield.x + pad,
    y: playfield.y + headerH + pad,
    width: playfield.w - pad * 2,
    height: itemAreaH - pad * 2,
  };

  const containerArea: Rect = {
    x: playfield.x + pad,
    y: playfield.y + headerH + itemAreaH,
    width: playfield.w - pad * 2,
    height: containerH - pad,
  };

  const shapes = rng.shuffle([...SHAPE_IDS]).slice(0, config.itemTypes) as ShapeId[];
  const containers = layoutContainers(shapes, containerArea);
  const size = itemSize(config.itemsPerType * config.itemTypes, itemArea);
  const items = placeItems(rng, config, shapes, itemArea, size);

  return new Level({ number: levelNumber, config, items, containers });
}

function layoutContainers(shapes: ShapeId[], area: Rect): Container[] {
  const count = shapes.length;
  const gap = 12;
  const width = (area.width - gap * (count - 1)) / count;
  return shapes.map(
    (shape, typeId) =>
      new Container({
        typeId,
        shape,
        rect: {
          x: area.x + typeId * (width + gap),
          y: area.y,
          width,
          height: area.height,
        },
      }),
  );
}

function itemSize(count: number, area: Rect): number {
  const cols = Math.max(2, Math.ceil(Math.sqrt(count * (area.width / Math.max(1, area.height)))));
  const rows = Math.ceil(count / cols);
  const cellW = area.width / cols;
  const cellH = area.height / Math.max(1, rows);
  return Math.min(cellW, cellH) * 0.62;
}

function placeItems(
  rng: SeedRandom,
  config: ReturnType<typeof configForLevel>,
  shapes: ShapeId[],
  area: Rect,
  size: number,
): Item[] {
  const total = config.itemTypes * config.itemsPerType;
  const typeIds: number[] = [];
  for (let typeId = 0; typeId < config.itemTypes; typeId += 1) {
    for (let n = 0; n < config.itemsPerType; n += 1) typeIds.push(typeId);
  }
  rng.shuffle(typeIds);

  const items: Item[] = [];
  const minDist = size * 1.15;
  const margin = size / 2 + 4;
  const maxAttempts = 80;

  for (let i = 0; i < total; i += 1) {
    let x = area.x + area.width / 2;
    let y = area.y + area.height / 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const nx = rng.range(area.x + margin, area.x + area.width - margin);
      const ny = rng.range(area.y + margin, area.y + area.height - margin);
      const overlaps = items.some((item) => {
        const dx = item.x - nx;
        const dy = item.y - ny;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (!overlaps) {
        x = nx;
        y = ny;
        break;
      }
    }
    const typeId = typeIds[i] ?? 0;
    items.push(
      new Item({
        typeId,
        shape: shapes[typeId] ?? shapes[0] ?? "circle",
        x,
        y,
        size,
      }),
    );
  }
  return items;
}
