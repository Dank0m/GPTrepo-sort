import { COLORS, ECONOMY } from "../config.ts";
import { sfx } from "../audio/sfx.ts";
import type { World } from "../game/world.ts";
import { currentLocale, strings } from "../i18n/locale.ts";

export function drawHud(ctx: CanvasRenderingContext2D, world: World): void {
  const { hud, mute, lang, narrow } = world.layout;
  const t = strings();

  ctx.save();
  roundRect(ctx, hud.x, hud.y, hud.width, hud.height, 14);
  ctx.fillStyle = COLORS.panel;
  ctx.globalAlpha = 0.94;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pad = 16;
  const cy = hud.y + (narrow ? 22 : hud.height * 0.42);
  ctx.textBaseline = "middle";

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 ${narrow ? 16 : 18}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(narrow ? `${world.coins}` : `${t.coins}  ${world.coins}`, hud.x + pad, hud.y + (narrow ? 22 : hud.height * 0.38));

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 ${narrow ? 11 : 12}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(
    narrow ? `${t.recordShort} ${world.records.bestCoins}` : `${t.record}  ${world.records.bestCoins}`,
    hud.x + pad,
    hud.y + (narrow ? 44 : hud.height * 0.72),
  );

  ctx.textAlign = "center";
  ctx.fillStyle = world.combo > 0 ? COLORS.title : COLORS.muted;
  ctx.font = `700 ${narrow ? 15 : 17}px ui-rounded, system-ui, sans-serif`;
  const combo = world.combo > 0 ? `×${world.combo}` : "×0";
  ctx.fillText(narrow ? combo : `${t.combo}  ${combo}`, hud.x + hud.width * (narrow ? 0.48 : 0.42), cy);
  if (world.lastGain > 0 && world.combo > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "600 13px ui-rounded, system-ui, sans-serif";
    ctx.fillText(`+${world.lastGain}`, hud.x + hud.width * 0.44, hud.y + (narrow ? 44 : hud.height * 0.74));
  }

  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.heart;
  ctx.font = `${narrow ? 16 : 18}px system-ui, sans-serif`;
  const hearts = "♥".repeat(world.lives) + "♡".repeat(Math.max(0, ECONOMY.startLives - world.lives));
  ctx.fillText(hearts, narrow ? hud.x + hud.width - 16 : lang.x - 10, cy);

  drawLang(ctx, lang);
  drawIconButton(ctx, world.layout.pause);
  drawPauseGlyph(ctx, world.layout.pause, world.paused);
  drawMute(ctx, world, mute);
  ctx.restore();
}

export function drawHint(ctx: CanvasRenderingContext2D, world: World): void {
  if (world.status !== "playing" || world.paused || world.sortedCount > 0 || world.elapsed > 7) {
    return;
  }
  const belt = world.layout.belt;
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + world.elapsed * 0.2);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(strings().hint, belt.x + belt.width / 2, belt.y - 8);
  ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (world.status !== "over" || world.adsPlaying) {
    return;
  }
  const ui = world.gameOverUi(width, height);
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.78)";
  ctx.fillRect(0, 0, width, height);

  roundRect(ctx, ui.box.x, ui.box.y, ui.box.width, ui.box.height, 18);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 26px ui-rounded, system-ui, sans-serif";
  const t = strings();
  ctx.fillText(t.gameOver, width / 2, ui.box.y + 40);

  if (world.beatBestCoins) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "800 16px ui-rounded, system-ui, sans-serif";
    ctx.fillText(t.newRecord, width / 2, ui.box.y + 70);
  }

  ctx.fillStyle = COLORS.gold;
  ctx.font = "700 18px ui-rounded, system-ui, sans-serif";
  ctx.fillText(`${t.coins}  ${world.coins}`, width / 2, ui.box.y + (world.beatBestCoins ? 98 : 88));

  ctx.fillStyle = COLORS.muted;
  ctx.font = "15px ui-rounded, system-ui, sans-serif";
  const comboLine = world.beatBestCombo
    ? `${t.maxCombo}  ×${world.maxCombo}  •  ${t.maxComboRecord}`
    : `${t.maxCombo}  ×${world.maxCombo}`;
  ctx.fillText(comboLine, width / 2, ui.box.y + (world.beatBestCoins ? 126 : 118));
  ctx.fillText(`${t.bestScore}  ${world.records.bestCoins}`, width / 2, ui.box.y + (world.beatBestCoins ? 150 : 142));

  ctx.fillStyle = COLORS.title;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.fillText(t.tapRestart, width / 2, ui.box.y + ui.box.height - 32);
  ctx.restore();
}

export function drawPause(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (!world.paused || world.status !== "playing" || world.adsPlaying) {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 32px ui-rounded, system-ui, sans-serif";
  ctx.fillText(strings().pause, width / 2, height / 2 - 18);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 15px ui-rounded, system-ui, sans-serif";
  ctx.fillText(strings().tapResume, width / 2, height / 2 + 18);
  ctx.restore();
}

export function drawDumpOffer(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  const ui = world.dumpOfferUi(width, height);
  const offer = world.dumpOffer;
  if (!ui || !offer) {
    return;
  }
  ctx.save();
  roundRect(ctx, ui.box.x, ui.box.y, ui.box.width, ui.box.height, 16);
  ctx.fillStyle = COLORS.panel;
  ctx.globalAlpha = 0.96;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 16px ui-rounded, system-ui, sans-serif";
  const t = strings();
  ctx.fillText(t.doubleTitle, width / 2, ui.box.y + 22);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 12px ui-rounded, system-ui, sans-serif";
  ctx.fillText(t.secondsLeft(Math.ceil(offer.remaining)), width / 2, ui.box.y + 42);

  drawActionButton(ctx, ui.doubleBtn, COLORS.gold, t.watchAd, t.jackpotAgain(offer.bonus));
  drawGhostButton(ctx, ui.dismissBtn, t.noThanks);
  ctx.restore();
}

export function drawAdsOverlay(ctx: CanvasRenderingContext2D, world: World, width: number, height: number): void {
  if (!world.adsPlaying) {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 18, 0.82)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 28px ui-rounded, system-ui, sans-serif";
  ctx.fillText(strings().adsPlaying, width / 2, height / 2 - 8);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.fillText(strings().adsHint, width / 2, height / 2 + 24);
  ctx.restore();
}

function drawLang(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
): void {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const gap = 6;
  const flagH = rect.height - 6;
  const flagW = flagH * 1.5;
  const flagY = rect.y + (rect.height - flagH) / 2;
  const ruX = rect.x + (rect.width - flagW * 2 - gap) / 2;
  const enX = ruX + flagW + gap;
  const active = currentLocale();

  drawFlagBadge(ctx, ruX, flagY, flagW, flagH, "ru", active === "ru");
  drawFlagBadge(ctx, enX, flagY, flagW, flagH, "en", active === "en");
}

function drawFlagBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  locale: "ru" | "en",
  active: boolean,
): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, 3);
  ctx.clip();
  if (locale === "ru") {
    drawRuFlag(ctx, x, y, w, h);
  } else {
    drawEnFlag(ctx, x, y, w, h);
  }
  ctx.restore();

  roundRect(ctx, x, y, w, h, 3);
  ctx.strokeStyle = active ? COLORS.gold : "rgba(255,255,255,0.18)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.stroke();
}

function drawRuFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const stripe = h / 3;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, stripe);
  ctx.fillStyle = "#0039a6";
  ctx.fillRect(x, y + stripe, w, stripe);
  ctx.fillStyle = "#d52b1e";
  ctx.fillRect(x, y + stripe * 2, w, h - stripe * 2);
}

function drawEnFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#012169";
  ctx.fillRect(x, y, w, h);
  const short = Math.min(w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.6, short * 0.16);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = Math.max(0.8, short * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2.2, short * 0.22);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = Math.max(1.1, short * 0.11);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function drawIconButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
): void {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPauseGlyph(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  paused: boolean,
): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.fillStyle = COLORS.title;
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillRect(cx - 7, cy - 8, 5, 16);
  ctx.fillRect(cx + 2, cy - 8, 5, 16);
}

function drawMute(ctx: CanvasRenderingContext2D, world: World, mute: { x: number; y: number; width: number; height: number }): void {
  roundRect(ctx, mute.x, mute.y, mute.width, mute.height, 10);
  ctx.fillStyle = world.hoverUpgrade ? COLORS.panel : "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cx = mute.x + mute.width / 2;
  const cy = mute.y + mute.height / 2;
  ctx.fillStyle = COLORS.title;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 4);
  ctx.lineTo(cx - 2, cy - 4);
  ctx.lineTo(cx + 5, cy - 9);
  ctx.lineTo(cx + 5, cy + 9);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.lineTo(cx - 8, cy + 4);
  ctx.closePath();
  ctx.fill();

  if (sfx.muted) {
    ctx.strokeStyle = COLORS.dropBad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10);
    ctx.lineTo(cx + 10, cy + 10);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 4, cy, 6, -0.6, 0.6);
    ctx.stroke();
  }
}

function drawActionButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  accent: string,
  title: string,
  subtitle: string,
): void {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "800 16px ui-rounded, system-ui, sans-serif";
  ctx.fillText(title, rect.x + rect.width / 2, rect.y + rect.height * 0.36);
  ctx.fillStyle = accent;
  ctx.font = "600 12px ui-rounded, system-ui, sans-serif";
  ctx.fillText(subtitle, rect.x + rect.width / 2, rect.y + rect.height * 0.7);
}

function drawGhostButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  label: string,
): void {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
  ctx.strokeStyle = COLORS.beltEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.title;
  ctx.font = "600 14px ui-rounded, system-ui, sans-serif";
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
