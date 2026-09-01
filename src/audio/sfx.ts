const MUTE_KEY = "sortup-muted";

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    return this.muted;
  }

  unlock(): void {
    const ctx = this.ensure();
    if (ctx?.state === "suspended") {
      void ctx.resume();
    }
  }

  play(kind: "ok" | "bad" | "buy" | "reject" | "full" | "over" | "dump", combo = 1): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (kind) {
      case "ok":
        this.tone(ctx, now, 440 + Math.min(8, combo) * 40, 0.09, "triangle", 0.08);
        this.tone(ctx, now + 0.06, 660 + Math.min(8, combo) * 30, 0.1, "sine", 0.06);
        break;
      case "bad":
        this.tone(ctx, now, 160, 0.16, "sawtooth", 0.07);
        break;
      case "buy":
        this.tone(ctx, now, 520, 0.07, "sine", 0.07);
        this.tone(ctx, now + 0.07, 780, 0.1, "sine", 0.06);
        break;
      case "reject":
        this.tone(ctx, now, 220, 0.08, "square", 0.04);
        break;
      case "full":
        this.tone(ctx, now, 300, 0.08, "triangle", 0.05);
        this.tone(ctx, now + 0.09, 300, 0.08, "triangle", 0.04);
        break;
      case "over":
        this.tone(ctx, now, 392, 0.16, "sine", 0.08);
        this.tone(ctx, now + 0.14, 294, 0.18, "sine", 0.07);
        this.tone(ctx, now + 0.3, 196, 0.28, "sine", 0.07);
        break;
      case "dump":
        this.tone(ctx, now, 392, 0.1, "sine", 0.07);
        this.tone(ctx, now + 0.08, 494, 0.1, "sine", 0.07);
        this.tone(ctx, now + 0.16, 587, 0.12, "triangle", 0.08);
        this.tone(ctx, now + 0.28, 784, 0.18, "sine", 0.09);
        break;
    }
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    at: number,
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
}

export const sfx = new Sfx();
