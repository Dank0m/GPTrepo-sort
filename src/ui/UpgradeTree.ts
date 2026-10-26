import type { World } from '../game/world.ts';
import { UPGRADE_IDS, UPGRADES, nextUpgradeCost, type UpgradeId } from '../config.ts';
import { currentLocale } from '../i18n/locale.ts';
import { TREE_TEXT } from '../i18n/tree.ts';
import { upgradeUnlocked } from '../game/upgrades.ts';
import { SIDE_POINTS, STRIP_POINTS, SKILL_ICONS } from './skillGraph.ts';

/** Always-visible skill map. Hover is informational; touch pins a safe inspection pause. */
export class UpgradeTree {
  readonly element = document.createElement('section');
  private readonly popover = document.createElement('div');
  private readonly nodes = new Map<UpgradeId, HTMLButtonElement>();
  private selected: UpgradeId | null = null;
  private dismissed = false;
  private pinned = false;
  private resumeOnClose = false;
  private hideTimer: number | undefined;
  private signature = '';
  private geometry = '';

  constructor(private readonly world: World, private readonly canvas: HTMLCanvasElement) {
    this.element.className = 'skill-panel';
    this.element.setAttribute('aria-labelledby', 'skills-title');
    this.element.innerHTML = `<header class="skill-header"><h2 id="skills-title"></h2><span class="skill-count"></span><small></small></header>
      <div class="skill-scroll"><div class="skill-map"><svg class="skill-links" aria-hidden="true"></svg></div></div>`;
    const map = this.element.querySelector('.skill-map')!;
    for (const id of UPGRADE_IDS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `skill-node branch-${UPGRADES[id].branch}`;
      button.dataset.upgrade = id;
      button.innerHTML = `<span class="skill-symbol"><svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[id]}</svg></span><span class="skill-level"></span>`;
      button.addEventListener('pointerenter', event => {
        this.cancelHide();
        if (event.pointerType !== 'touch' && !this.pinned && !this.dismissed) this.inspect(id);
      });
      button.addEventListener('pointerleave', () => this.scheduleHide());
      button.addEventListener('focus', () => { this.dismissed = false; if (!this.pinned) this.inspect(id); });
      button.addEventListener('click', event => {
        this.dismissed = false;
        const touch = event instanceof PointerEvent && event.pointerType === 'touch';
        if (touch) this.inspect(id, true);
        else {
          this.inspect(id);
          this.world.tryBuy(id);
          this.update();
        }
      });
      map.append(button);
      this.nodes.set(id, button);
    }
    this.popover.className = 'skill-popover';
    this.popover.hidden = true;
    this.popover.innerHTML = `<button type="button" class="skill-close">×</button><div id="skill-tooltip" role="tooltip"></div><button type="button" class="skill-buy"></button>`;
    this.popover.querySelector('.skill-close')!.addEventListener('click', () => this.close());
    this.popover.querySelector('.skill-buy')!.addEventListener('click', () => {
      if (this.selected) this.world.tryBuy(this.selected);
      this.update();
    });
    this.popover.addEventListener('pointerenter', () => this.cancelHide());
    this.popover.addEventListener('pointerleave', () => this.scheduleHide());
    for (const element of [this.element, this.popover]) {
      element.addEventListener('contextmenu', event => event.preventDefault());
      element.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.selected) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
          this.dismissed = true;
        } else if (event.key !== 'Escape' && event.key.toLowerCase() !== 'p') event.stopPropagation();
      });
      element.addEventListener('focusout', event => {
        const next = event.relatedTarget;
        if (next instanceof Node && !this.element.contains(next) && !this.popover.contains(next)) this.scheduleHide();
      });
    }
    document.addEventListener('pointermove', event => {
      if (event.movementX || event.movementY) this.dismissed = false;
    });
    document.addEventListener('pointerdown', event => {
      if (!this.element.contains(event.target as Node) && !this.popover.contains(event.target as Node)) this.close();
    }, true);
    window.addEventListener('blur', () => this.close(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.close(false); });
    document.body.append(this.element, this.popover);
  }

  /** Only a pinned touch description blocks automatic platform resume. */
  get isInspecting(): boolean { return this.pinned; }

  reveal(id: UpgradeId): void {
    this.nodes.get(id)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    this.inspect(id, true);
  }

  close(resume = true): void {
    this.cancelHide();
    const shouldResume = this.resumeOnClose;
    this.resumeOnClose = false;
    this.pinned = false;
    this.selected = null;
    this.popover.hidden = true;
    for (const button of this.nodes.values()) button.removeAttribute('aria-describedby');
    if (resume && shouldResume) this.world.resume();
  }

  update(): void {
    const rect = this.canvas.getBoundingClientRect(), tree = this.world.layout.tree;
    Object.assign(this.element.style, { left: `${rect.left + tree.x}px`, top: `${rect.top + tree.y}px`, width: `${tree.width}px`, height: `${tree.height}px` });
    this.element.classList.toggle('skill-side', this.world.layout.treeSide);
    this.element.classList.toggle('skill-compact', this.world.layout.height < 400);
    const t = TREE_TEXT[currentLocale()];
    this.element.querySelector('header small')!.textContent = !this.world.layout.treeSide && tree.width < 600 ? t.scrollHint : t.mapHint;
    const geometry = `${this.world.layout.treeSide}:${currentLocale()}`;
    if (geometry !== this.geometry) {
      this.geometry = geometry;
      this.drawLinks();
    }
    const signature = JSON.stringify([currentLocale(), this.world.levels, this.world.coins, this.world.adsPlaying]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.element.querySelector('h2')!.textContent = t.title;
      const count = Object.values(this.world.levels).reduce((a, b) => a + b, 0);
      this.element.querySelector('.skill-count')!.textContent = `${count}/19`;
      for (const [id, button] of this.nodes) {
        const level = this.world.levels[id], cost = nextUpgradeCost(id, level);
        const unlocked = upgradeUnlocked(id, this.world.levels);
        const canBuy = cost !== null && unlocked && this.world.coins >= cost && !this.world.adsPlaying;
        button.classList.toggle('skill-locked', !unlocked);
        button.classList.toggle('skill-owned', level > 0);
        button.classList.toggle('skill-maxed', cost === null);
        button.classList.toggle('skill-affordable', canBuy);
        button.setAttribute('aria-label', `${t.names[id]}, ${level}/${UPGRADES[id].max}`);
        button.setAttribute('aria-disabled', String(!canBuy));
        button.querySelector('.skill-level')!.textContent = !unlocked ? '−' : `${level}/${UPGRADES[id].max}`;
      }
      this.drawLinks();
    }
    if (this.world.adsPlaying) this.close(false);
    if (this.selected) this.drawTooltip();
  }

  private inspect(id: UpgradeId, pinned = false): void {
    if (this.world.adsPlaying || this.world.grabbed) return;
    this.cancelHide();
    if (pinned && !this.pinned) {
      this.resumeOnClose = this.world.status === 'playing' && !this.world.paused;
      this.world.pause();
      this.pinned = true;
    }
    this.selected = id;
    this.popover.hidden = false;
    for (const [key, node] of this.nodes) {
      if (key === id) node.setAttribute('aria-describedby', 'skill-tooltip');
      else node.removeAttribute('aria-describedby');
    }
    this.drawTooltip();
  }

  private drawLinks(): void {
    const side = this.world.layout.treeSide;
    const points = side ? SIDE_POINTS : STRIP_POINTS;
    const w = side ? 300 : 600, h = side ? 520 : 114;
    const svg = this.element.querySelector('.skill-links')!;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const links = UPGRADE_IDS.filter(id => UPGRADES[id].requires).map(id => {
      const required = UPGRADES[id].requires!;
      const [x, y] = points[id], [px, py] = points[required.id];
      const active = this.world.levels[required.id] >= required.level;
      return `<g class="${active ? 'link-active' : ''}"><path class="link-shadow" d="M${px} ${py}L${x} ${y}"/><path class="link-wire" d="M${px} ${py}L${x} ${y}"/></g>`;
    }).join('');
    const labels = side ? [['control', 22, 17], ['automation', 22, 205], ['orders', 22, 385]] as const : [];
    svg.innerHTML = links + labels.map(([branch, x, y]) => `<text x="${x}" y="${y}">${TREE_TEXT[currentLocale()].branches[branch]}</text>`).join('');
    for (const [id, node] of this.nodes) {
      node.style.left = `${points[id][0] / w * 100}%`;
      node.style.top = `${points[id][1] / h * 100}%`;
    }
  }

  private drawTooltip(): void {
    const id = this.selected!;
    const t = TREE_TEXT[currentLocale()], def = UPGRADES[id], level = this.world.levels[id];
    const cost = nextUpgradeCost(id, level), unlocked = upgradeUnlocked(id, this.world.levels);
    const state = cost === null ? t.owned : !unlocked ? `${t.locked}: ${t.names[def.requires!.id]} ${t.level} ${def.requires!.level}` : `${t.coins}: ${this.world.coins} · ${t.price}: ${cost}`;
    // Only internal locale strings are rendered here; no player or remote markup.
    this.popover.querySelector('#skill-tooltip')!.innerHTML = `<small>${t.branches[def.branch]} · ${level}/${def.max}</small><h3>${t.names[id]}</h3><p>${t.descriptions[id]}</p><strong>${state}</strong>`;
    const buy = this.popover.querySelector<HTMLButtonElement>('.skill-buy')!;
    buy.textContent = cost === null ? t.owned : `${t.buy} · ${cost}`;
    buy.disabled = cost === null || !unlocked || this.world.coins < cost || this.world.adsPlaying;
    this.popover.querySelector('.skill-close')!.setAttribute('aria-label', t.closeInfo);
    const anchor = this.nodes.get(id)!.getBoundingClientRect();
    const tip = this.popover.getBoundingClientRect();
    const left = this.world.layout.treeSide ? anchor.left - tip.width - 12 : anchor.left + anchor.width / 2 - tip.width / 2;
    const top = this.world.layout.treeSide ? anchor.top - 15 : anchor.top - tip.height - 12;
    this.popover.style.left = `${Math.max(8, Math.min(innerWidth - tip.width - 8, left))}px`;
    this.popover.style.top = `${Math.max(8, Math.min(innerHeight - tip.height - 8, top))}px`;
  }

  private scheduleHide(): void {
    if (this.pinned) return;
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => this.close(), 160);
  }
  private cancelHide(): void { window.clearTimeout(this.hideTimer); }
}
