import type { World } from '../game/world.ts';
import { UPGRADE_IDS, UPGRADES, nextUpgradeCost, type UpgradeId } from '../config.ts';
import { currentLocale } from '../i18n/locale.ts';
import { TREE_TEXT } from '../i18n/tree.ts';
import { upgradeUnlocked } from '../game/upgrades.ts';
import { STRIP_POINTS, SKILL_ICONS } from './skillGraph.ts';
import { renderEngravedGraph } from './engravedGraph.ts';
import './engraved.css';

/** Shopping is a level break. During a run only a passive engraving remains. */
export class UpgradeTree {
  readonly dialog = document.createElement('dialog');
  readonly element = document.createElement('section');
  private readonly nodes = new Map<UpgradeId, HTMLButtonElement>();
  private readonly popover: HTMLElement;
  private selected: UpgradeId | null = null;
  private signature = '';
  private ownedSignature = '';

  constructor(private readonly world: World, private readonly canvas: HTMLCanvasElement) {
    this.element.className = 'owned-tree';
    this.element.innerHTML = '<div class="owned-tree-map"></div>';
    this.dialog.className = 'level-break';
    this.dialog.setAttribute('aria-labelledby', 'break-title');
    this.dialog.innerHTML = `<header class="break-heading"><div><span class="break-eyebrow"></span><h1 id="break-title"></h1><p class="break-hint"></p></div><div class="break-wallet"><small></small><strong></strong></div></header>
      <div class="break-workbench"><section class="skill-panel" aria-label="Skills"><div class="skill-header"><h2></h2><span class="skill-count"></span><small></small></div>
      <div class="skill-branches"><span></span><span></span><span></span></div><div class="skill-scroll"><div class="skill-map"><svg class="skill-links" viewBox="0 0 600 114" preserveAspectRatio="none" aria-hidden="true"></svg></div></div><p class="break-legend"></p></section>
      <aside class="skill-details"><div class="skill-popover" hidden><button type="button" class="skill-close">×</button><div role="tooltip" id="skill-tooltip"></div><button type="button" class="skill-buy"></button></div><p class="skill-placeholder"></p></aside></div>
      <footer class="break-footer"><span></span><button type="button" class="next-level"></button></footer>`;
    this.popover = this.dialog.querySelector('.skill-popover')!;
    const map = this.dialog.querySelector('.skill-map')!;
    for (const id of UPGRADE_IDS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `skill-node branch-${UPGRADES[id].branch}`;
      button.dataset.upgrade = id;
      const [x, y] = STRIP_POINTS[id];
      button.style.left = `${x / 600 * 100}%`;
      button.style.top = `${y / 114 * 100}%`;
      button.innerHTML = `<span class="skill-symbol"><svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[id]}</svg></span><span class="skill-level"></span>`;
      button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') this.inspect(id); });
      button.addEventListener('focus', () => this.inspect(id));
      button.addEventListener('click', event => {
        this.inspect(id);
        const touch = event instanceof PointerEvent && event.pointerType === 'touch';
        if (!touch) this.world.tryBuy(id);
        this.update();
      });
      this.nodes.set(id, button);
      map.append(button);
    }
    this.popover.querySelector('.skill-close')!.addEventListener('click', () => this.close());
    this.popover.querySelector('.skill-buy')!.addEventListener('click', () => {
      if (this.selected) this.world.tryBuy(this.selected);
      this.update();
    });
    this.dialog.querySelector('.next-level')!.addEventListener('click', () => {
      this.world.continueLevel();
      if (!this.world.intermission) { this.close(); this.dialog.close(); }
    });
    this.dialog.addEventListener('cancel', event => {
      event.preventDefault(); // Next is the only way to leave a level break.
      this.close();
    });
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    for (const node of [this.dialog, this.element]) node.addEventListener('contextmenu', event => event.preventDefault());
    document.body.append(this.element, this.dialog);
  }

  get isOpen(): boolean { return this.dialog.open; }
  get isInspecting(): boolean { return this.isOpen; }

  open(): void {
    if (!this.world.intermission || this.isOpen || this.world.adsPlaying) return;
    this.dialog.showModal();
    this.signature = '';
    this.update();
    this.dialog.querySelector<HTMLButtonElement>('.next-level')!.focus();
  }
  reveal(id: UpgradeId): void {
    if (!this.world.intermission) return;
    this.open();
    this.nodes.get(id)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    this.inspect(id);
  }
  /** Close the description, never resume or dismiss the break. */
  close(): void {
    this.selected = null;
    this.popover.hidden = true;
    this.dialog.querySelector<HTMLElement>('.skill-placeholder')!.hidden = false;
    for (const button of this.nodes.values()) button.removeAttribute('aria-describedby');
  }

  update(): void {
    const field = this.canvas.getBoundingClientRect(), rect = this.world.layout.tree;
    Object.assign(this.element.style, { left: `${field.left + rect.x}px`, top: `${field.top + rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const t = TREE_TEXT[currentLocale()];
    const ownedSignature = JSON.stringify([this.world.levels, currentLocale()]);
    if (ownedSignature !== this.ownedSignature) {
      this.ownedSignature = ownedSignature;
      const owned = UPGRADE_IDS.filter(id => this.world.levels[id] > 0);
      this.element.hidden = owned.length === 0;
      this.element.setAttribute('aria-label', `${t.yourSkills}: ${owned.map(id => `${t.names[id]} ${this.world.levels[id]}`).join(', ')}`);
      this.element.querySelector('.owned-tree-map')!.innerHTML = renderEngravedGraph(this.world.levels);
    }
    if (!this.isOpen) return;
    const signature = JSON.stringify([currentLocale(), this.world.levels, this.world.coins, this.world.completedLevel, this.world.canBuyUpgrades]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.dialog.querySelector('.break-eyebrow')!.textContent = t.levelDone(this.world.completedLevel);
      this.dialog.querySelector('h1')!.textContent = t.breakTitle;
      this.dialog.querySelector('.break-hint')!.textContent = t.breakHint;
      this.dialog.querySelector('.break-wallet small')!.textContent = t.coins;
      this.dialog.querySelector('.break-wallet strong')!.textContent = `${this.world.coins}`;
      this.dialog.querySelector('.skill-header h2')!.textContent = t.title;
      this.dialog.querySelector('.skill-count')!.textContent = `${Object.values(this.world.levels).reduce((a, b) => a + b, 0)}/19`;
      this.dialog.querySelector('.skill-header small')!.textContent = t.mapHint;
      this.dialog.querySelector('.break-legend')!.textContent = t.legend;
      this.dialog.querySelector('.skill-placeholder')!.textContent = t.selectSkill;
      this.dialog.querySelector('.break-footer span')!.textContent = t.permanentNote;
      const next = this.dialog.querySelector<HTMLButtonElement>('.next-level')!;
      next.textContent = t.next;
      next.disabled = !this.world.canBuyUpgrades;
      for (const [i, branch] of ['control', 'automation', 'orders'].entries()) {
        this.dialog.querySelectorAll('.skill-branches span')[i]!.textContent = t.branches[branch as keyof typeof t.branches];
      }
      for (const [id, button] of this.nodes) {
        const level = this.world.levels[id], cost = nextUpgradeCost(id, level);
        const unlocked = upgradeUnlocked(id, this.world.levels);
        const canBuy = this.world.canBuyUpgrades && cost !== null && unlocked && this.world.coins >= cost;
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
    if (this.selected) this.drawTooltip();
  }

  private inspect(id: UpgradeId): void {
    if (!this.isOpen) return;
    this.selected = id;
    this.popover.hidden = false;
    this.dialog.querySelector<HTMLElement>('.skill-placeholder')!.hidden = true;
    for (const [key, node] of this.nodes) {
      if (key === id) node.setAttribute('aria-describedby', 'skill-tooltip');
      else node.removeAttribute('aria-describedby');
    }
    this.drawTooltip();
  }
  private drawLinks(): void {
    this.dialog.querySelector('.skill-links')!.innerHTML = UPGRADE_IDS.filter(id => UPGRADES[id].requires).map(id => {
      const required = UPGRADES[id].requires!;
      const [x, y] = STRIP_POINTS[id], [px, py] = STRIP_POINTS[required.id];
      const d = `M${px} ${py}L${x} ${y}`;
      return `<g class="${this.world.levels[required.id] >= required.level ? 'link-active' : ''}"><path class="link-shadow" d="${d}"/><path class="link-wire" d="${d}"/></g>`;
    }).join('');
  }
  private drawTooltip(): void {
    const id = this.selected!, t = TREE_TEXT[currentLocale()], def = UPGRADES[id], level = this.world.levels[id];
    const cost = nextUpgradeCost(id, level), unlocked = upgradeUnlocked(id, this.world.levels);
    const state = cost === null ? t.owned : !unlocked ? `${t.locked}: ${t.names[def.requires!.id]} ${t.level} ${def.requires!.level}` : `${t.price}: ${cost}`;
    this.popover.querySelector('#skill-tooltip')!.innerHTML = `<small>${t.branches[def.branch]} · ${level}/${def.max}</small><div class="detail-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[id]}</svg></div><h3>${t.names[id]}</h3><p>${t.descriptions[id]}</p><strong>${state}</strong>`;
    const buy = this.popover.querySelector<HTMLButtonElement>('.skill-buy')!;
    buy.textContent = cost === null ? t.owned : `${t.buy} · ${cost}`;
    buy.disabled = !this.world.canBuyUpgrades || cost === null || !unlocked || this.world.coins < cost;
    this.popover.querySelector('.skill-close')!.setAttribute('aria-label', t.closeInfo);
  }
}
