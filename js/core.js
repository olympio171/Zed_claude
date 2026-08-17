/* ═══════════════════════════════════════════════
   Socle partagé : préférences, maths, scène canvas
   ═══════════════════════════════════════════════ */

/* ── Préférences utilisateur ── */
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqFine   = matchMedia('(pointer: fine)');

export const prefs = {
  get reduced() { return mqReduce.matches; },
  get fine()    { return mqFine.matches; }
};

/* ── Maths ── */
export const lerp  = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const rand  = (lo, hi) => lo + Math.random() * (hi - lo);
export const TAU   = Math.PI * 2;

/* ── Palette (miroir JS des jetons CSS) ── */
export const C = {
  ink:      '#0A0A0C',
  spectral: '#8B5CF6',
  spectralD:'#6B2FBF',
  blood:    '#C21E28',
  bone:     '#F5F3F0',
  steel:    '#3A3A42',
  muted:    '#8A8A93'   // acteurs de scène au repos : l'acier seul est trop sombre pour se lire
};

/* ── Annonce pour lecteurs d'écran ── */
const live = document.querySelector('[data-live]');
let liveTimer;
export function announce(msg) {
  if (!live) return;
  clearTimeout(liveTimer);
  live.textContent = '';
  liveTimer = setTimeout(() => { live.textContent = msg; }, 60);
}

/* ═══════════════════════════════════════════════
   Stage — canvas 2D avec DPR, resize et pause hors-écran.
   Une scène qui n'est pas visible ne consomme aucune frame.
   ═══════════════════════════════════════════════ */
export class Stage {
  constructor(canvas, { autoplay = true, onPointer = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.w = 0; this.h = 0; this.dpr = 1;
    this.running = false;
    this.visible = false;
    this.last = 0;
    this.pointer = { x: -9999, y: -9999, inside: false };
    this._frame = this._frame.bind(this);

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();

    this._io = new IntersectionObserver(
      ([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible && autoplay) this.start();
        else this.stop();
      },
      { rootMargin: '10% 0px' }
    );
    this._io.observe(canvas);

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      this.pointer.inside = true;
    }, { passive: true });

    canvas.addEventListener('pointerleave', () => { this.pointer.inside = false; }, { passive: true });

    if (onPointer) {
      canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        onPointer(e.clientX - r.left, e.clientY - r.top, e);
      });
    }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Plafonné à 2 : au-delà, le coût de remplissage dépasse le gain visuel
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width  = Math.round(r.width  * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.onResize?.();
  }

  /* Échelle des acteurs : une scène plein écran ne doit pas contenir
     des figures de 30 px sur un écran de 1400. */
  get u() { return clamp(Math.min(this.w, this.h) / 780, 0.75, 1.6); }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _frame(now) {
    if (!this.running) return;
    // Bornage : un onglet réveillé après une pause ne doit pas téléporter la scène
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.update?.(dt, now / 1000);
    this._raf = requestAnimationFrame(this._frame);
  }

  destroy() {
    this.stop();
    this._ro.disconnect();
    this._io.disconnect();
  }
}

/* ═══════════════════════════════════════════════
   Système de particules minimal :
   position, vélocité, durée de vie, opacité dégressive.
   ═══════════════════════════════════════════════ */
export class Particles {
  constructor(max = 600) { this.max = max; this.list = []; }

  emit(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: 0, y: 0, vx: 0, vy: 0,
      life: 1, age: 0, size: 2,
      color: C.spectral, drag: 0.94, gravity: 0,
      ...p
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = 1 - p.age / p.life;          // opacité dégressive
      ctx.globalAlpha = t * t;
      ctx.fillStyle = p.color;
      const s = p.size * (0.35 + t * 0.65);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  get count() { return this.list.length; }
}

/* ── Shuriken : quatre lames incurvées, dessinées à l'origine ── */
export function drawShuriken(ctx, x, y, r, rot, {
  fill = C.bone, stroke = null, alpha = 1
} = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const a2 = a + TAU / 4;
    ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
    ctx.quadraticCurveTo(
      Math.cos(a + 0.28) * r * 0.92, Math.sin(a + 0.28) * r * 0.92,
      Math.cos(a2) * r * 0.20, Math.sin(a2) * r * 0.20
    );
  }
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.restore();
}

/* ── Losange : la silhouette de Zed et de ses ombres ── */
export function drawDiamond(ctx, x, y, r, { fill = null, stroke = C.bone, width = 1.5, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.62, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.62, y);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  ctx.restore();
}
