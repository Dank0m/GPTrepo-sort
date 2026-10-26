import { UPGRADE_IDS, UPGRADES, type UpgradeId } from '../config.ts';
import type { UpgradeLevels } from '../game/upgrades.ts';
import { SKILL_ICONS } from './skillGraph.ts';

/**
 * A small, passive record of purchased skills. The graph has the same prerequisite
 * branches as the shop, but it contains neither locked nodes nor purchase controls.
 */
const POINTS: Record<UpgradeId, readonly [number, number]> = {
  buffer: [24, 30], wide: [94, 30], magnet: [164, 30],
  unload: [94, 76], speed: [24, 76],
  auto: [24, 119], batch: [94, 119], recycle: [164, 119], pulse: [59, 163],
  value: [239, 30], combo: [215, 104], type: [263, 104],
};

function cutIcon(markup: string): string {
  // Three sharp copies form a shallow negative relief: reflected lower edge,
  // dark upper lip, then the narrow cut itself. No glowing ring or raised badge.
  return `<g class="engraved-lower" transform="translate(.8 1.05)">${markup}</g>
    <g class="engraved-upper" transform="translate(-.35 -.45)">${markup}</g>
    <g class="engraved-core">${markup}</g>`;
}

function cutLine(d: string): string {
  return `<path class="engraved-link-lower" transform="translate(.7 .9)" d="${d}"/>
    <path class="engraved-link-upper" transform="translate(-.25 -.3)" d="${d}"/>
    <path class="engraved-link-core" d="${d}"/>`;
}

/** SVG markup with no remote content, filters, interactive elements or duplicate IDs. */
export function renderEngravedGraph(levels: UpgradeLevels): string {
  const owned = UPGRADE_IDS.filter(id => levels[id] > 0);
  if (!owned.length) return '';

  // Collapse completely absent branch bands. A sparse tree does not reserve the
  // large blank areas which are useful in the full upgrade map.
  const hasControl = owned.some(id => UPGRADES[id].branch === 'control');
  const hasAutomation = owned.some(id => UPGRADES[id].branch === 'automation');
  const points = new Map<UpgradeId, readonly [number, number]>();
  for (const id of owned) {
    const [x, y] = POINTS[id];
    const branch = UPGRADES[id].branch;
    const shiftY = branch === 'automation' && !hasControl ? 89 : 0;
    const shiftX = branch === 'orders' && !hasControl && !hasAutomation ? 191 : 0;
    points.set(id, [x - shiftX, y - shiftY]);
  }
  // When orders are absent, the side column disappears naturally through bounds.
  // Crop unused outer space, retaining a fixed physical icon size in sparse maps.
  const xs = [...points.values()].map(p => p[0]);
  const ys = [...points.values()].map(p => p[1]);
  const minX = Math.min(...xs) - 23, minY = Math.min(...ys) - 23;
  const width = Math.max(46, Math.max(...xs) - minX + 23);
  const height = Math.max(46, Math.max(...ys) - minY + 23);
  const links = owned.map(id => {
    const required = UPGRADES[id].requires;
    if (!required || !points.has(required.id)) return '';
    const [x, y] = points.get(id)!, [px, py] = points.get(required.id)!;
    // Stop grooves short of the pictograms; the icon cuts remain easy to read.
    const length = Math.hypot(x - px, y - py), inset = Math.min(19, length / 3);
    const dx = (x - px) / length, dy = (y - py) / length;
    const d = `M${px + dx * inset} ${py + dy * inset}L${x - dx * inset} ${y - dy * inset}`;
    return `<g data-owned-link="${required.id}:${id}" class="engraved-link">${cutLine(d)}</g>`;
  }).join('');
  const nodes = owned.map(id => {
    const [x, y] = points.get(id)!;
    const level = Math.min(UPGRADES[id].max, Math.max(1, Math.floor(levels[id])));
    const tallies = Array.from({ length: level }, (_, i) => `M${15 + i * 3} 15l-1.5 5`).join('');
    return `<g data-owned-upgrade="${id}" data-owned-level="${level}" class="engraved-node" transform="translate(${x} ${y})">
      <g transform="translate(-12 -12)">${cutIcon(SKILL_ICONS[id])}</g>
      <g class="engraved-tally">${cutLine(tallies)}</g>
    </g>`;
  }).join('');

  return `<svg class="engraved-graph" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}" style="max-width:${width}px;max-height:${height}px" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-owned-count="${owned.length}">
    ${links}${nodes}
  </svg>`;
}
