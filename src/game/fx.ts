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
};

export class Fx {
  particles: Particle[] = [];
  floaters: Floater[] = [];
  flash = 0;
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
    this.flash = 0;
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

  float(x: number, y: number, text: string, color: string): void {
    this.floaters.push({
      x,
      y,
      text,
      life: 0.85,
      maxLife: 0.85,
      color,
    });
  }

  miss(): void {
    this.flash = 0.55;
    this.shake = 7;
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.shake = Math.max(0, this.shake - dt * 22);

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
  }
}
