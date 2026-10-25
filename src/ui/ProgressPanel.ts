import { yandexService } from "../services/YandexService.ts";
import type { World } from "../game/world.ts";
import { dailyMissions, rankInfo, sanitizeProgression } from "../game/progression.ts";
import { currentLocale, strings } from "../i18n/locale.ts";

/** Accessible DOM companion to the canvas; opening it never consumes a life. */
export class ProgressPanel {
  readonly dialog = document.createElement("dialog");
  private readonly button = document.createElement("button");
  private resumeOnClose = false;
  private first = true;
  private signature = "";

  constructor(private readonly world: World, private readonly canvas: HTMLCanvasElement) {
    this.button.className = "progress-strip";
    this.button.type = "button";
    this.button.addEventListener("click", () => this.open());
    this.dialog.className = "progress-dialog";
    for (const element of [this.button, this.dialog]) {
      element.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    this.dialog.setAttribute("aria-labelledby", "progress-title");
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.dialog.addEventListener("keydown", (event) => event.stopPropagation());
    document.body.append(this.button, this.dialog);
    this.open();
  }

  get isOpen(): boolean { return this.dialog.open; }

  open(): void {
    if (this.isOpen || this.world.adsPlaying) return;
    this.resumeOnClose = this.first || (this.world.status === "playing" && !this.world.paused);
    this.world.pause();
    this.world.records.progression = sanitizeProgression(this.world.records.progression);
    this.signature = "";
    this.dialog.showModal();
    this.update();
    this.dialog.querySelector<HTMLButtonElement>(".play-button")?.focus();
  }

  close(): void {
    this.dialog.close();
    if (this.resumeOnClose && this.world.status === "playing") this.world.resume();
    this.first = false;
    this.signature = "";
    this.button.focus();
  }

  update(): void {
    const layout = this.world.layout.progress;
    const field = this.canvas.getBoundingClientRect();
    Object.assign(this.button.style, {
      left: `${field.left + layout.x}px`, top: `${field.top + layout.y}px`, width: `${layout.width}px`, height: `${layout.height}px`,
    });
    this.button.disabled = this.world.adsPlaying;
    const progress = this.world.records.progression;
    const t = strings();
    const rank = rankInfo(progress.xp);
    const shift = this.world.shift;
    const missions = dailyMissions(progress);
    const next = missions.find((mission) => !mission.done);
    const signature = JSON.stringify([progress, currentLocale(), this.first, this.world.status, this.world.restoredSession, shift.stage, shift.remaining]);
    const startText = this.world.restoredSession ? t.continueGame : t.play;
    if (signature === this.signature) return;
    this.signature = signature;
    const summary = next ? `${t.missionNames[next.id]} · ${next.current}/${next.target}` : t.allDone;
    this.button.replaceChildren();
    const level = document.createElement("strong");
    level.textContent = `${t.shift(shift.stage)} · ${t.mastery} ${rank.level}`;
    const goal = document.createElement("span");
    goal.textContent = summary;
    const arrow = document.createElement("b");
    arrow.textContent = "›";
    this.button.append(level, goal, arrow);
    this.button.setAttribute("aria-label", `${t.progress}. ${t.mastery} ${rank.level}. ${summary}`);
    if (!this.isOpen && !this.first) return;
    // All copy comes from the internal locale dictionary; no player/remote HTML.
    this.dialog.innerHTML = `
      <div class="progress-heading"><span class="eyebrow">SORT & UPGRADE</span><span class="level-badge">${rank.level}</span></div>
      <h1 id="progress-title">${this.first ? startText : t.progress}</h1>
      <p class="intro">${this.first ? t.howToPlay : t.permanentHint}</p>
      <section class="mastery-card" aria-label="${t.mastery}">
        <div class="row"><strong>${t.mastery} ${rank.level}</strong><span>${rank.current} / ${rank.needed} XP</span></div>
        <progress max="${rank.needed}" value="${rank.current}" aria-label="XP"></progress>
        <div class="starting-bonus">+${rank.startingCoins} · ${t.startingBonus}</div>
      </section>
      <section class="shift-card"><strong>${t.shift(shift.stage)} / 10</strong><p>${shift.remaining ? t.nextShift(shift.remaining) : t.finalShift}</p><small>${t.shiftHint}</small></section>
      <h2>${t.dailyTitle}</h2><p class="daily-hint">${t.dailyHint}</p>
      <div class="missions">${missions.map((mission) => `
        <section class="mission ${mission.done ? 'done' : ''}">
          <div class="row"><strong>${mission.done ? '✓ ' : ''}${t.missionNames[mission.id]}</strong><span>${mission.current}/${mission.target}</span></div>
          <progress max="${mission.target}" value="${mission.current}" aria-label="${t.missionNames[mission.id]}"></progress>
          <small>${mission.done ? t.earned : '+' + mission.rewardXp + ' XP'} · +${mission.rewardCoins} ${t.coins.toLowerCase()}</small>
        </section>`).join('')}</div>
      <p class="daily-hint">${t.permanentHint}</p>
      <button type="button" class="play-button">${this.first ? startText : t.continueGame}</button>`;
    this.dialog.querySelector(".play-button")?.addEventListener("click", () => { void yandexService.requestFullscreen(); this.close(); });
  }
}
