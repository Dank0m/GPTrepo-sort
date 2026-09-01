export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type Mote = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  life: number;
  maxLife: number;
  color: string;
};

export type DumpShow = {
  life: number;
  maxLife: number;
  bonus: number;
  types: number;
};

export class Fx {
  particles: Particle[] = [];
  floaters: Floater[] = [];
  motes: Mote[] = [];
  dump: DumpShow | null = null;
  flash = 0;
  goldFlash = 0;
  shake = 0;

  get offsetX(): number {
    if (this.shake <= 0) return 0;
    return (Math.random() * 2 - 1) * this.shake;
  }

  get offsetY(): number {
    if (this.shake <= 0) return 0;
    return (Math.random() * 2 - 1) * this.shake;
  }

  clear(): void {
    this.particles = [];
    this.floaters = [];
    this.motes = [];
    this.dump = null;
    this.flash = 0;
    this.goldFlash = 0;
    this.shake = 0;
  }

  burst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 80 + Math.random() * 160;
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  }

  float(x: number, y: number, text: string, color: string, size = 18, life = 0.85): void {
    this.floaters.push({
      x,
      y,
      text,
      life,
      maxLife: life,
      color,
      size,
    });
  }

  miss(): void {
    this.flash = 1;
    this.shake = 12;
  }

  celebrateDump(
    bonus: number,
    types: number,
    bins: { x: number; y: number; width: number; height: number; color: string }[],
    hudX: number,
    hudY: number,
  ): void {
    this.goldFlash = 1;
    this.shake = 14;
    this.dump = { life: 1.55, maxLife: 1.55, bonus, types };
    for (const bin of bins) {
      const cx = bin.x + bin.width / 2;
      const cy = bin.y + bin.height / 2;
      this.burst(cx, cy, bin.color, 18);
      for (let i = 0; i < 7; i += 1) {
        this.motes.push({
          x: cx + (Math.random() - 0.5) * bin.width * 0.4,
          y: cy + (Math.random() - 0.5) * bin.height * 0.4,
          tx: hudX + Math.random() * 40,
          ty: hudY,
          life: 0.7 + Math.random() * 0.35,
          maxLife: 1,
          color: bin.color,
        });
      }
    }
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 1.15);
    this.goldFlash = Math.max(0, this.goldFlash - dt * 0.85);
    this.shake = Math.max(0, this.shake - dt * 18);

    if (this.dump) {
      this.dump.life -= dt;
      if (this.dump.life <= 0) this.dump = null;
    }

    const nextParticles: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      nextParticles.push(p);
    }
    this.particles = nextParticles;

    const nextFloaters: Floater[] = [];
    for (const f of this.floaters) {
      f.life -= dt;
      if (f.life <= 0) continue;
      f.y -= 48 * dt;
      nextFloaters.push(f);
    }
    this.floaters = nextFloaters;

    const nextMotes: Mote[] = [];
    for (const m of this.motes) {
      m.life -= dt;
      if (m.life <= 0) continue;
      const u = 1 - m.life / m.maxLife;
      const ease = u * u;
      m.x += (m.tx - m.x) * Math.min(1, 6 * dt + ease * 0.15);
      m.y += (m.ty - m.y) * Math.min(1, 6 * dt + ease * 0.15);
      nextMotes.push(m);
    }
    this.motes = nextMotes;
  }
}
