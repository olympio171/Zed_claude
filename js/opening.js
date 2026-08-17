/* ═══════════════════════════════════════════════
   Acte 0 — un shuriken traverse le noir.
   Là où il passe, l'écran s'ouvre.
   ═══════════════════════════════════════════════ */

import { Stage, Particles, drawShuriken, prefs, rand, lerp, clamp, C, TAU } from './core.js';

const DELAY  = 0.45;   // le silence avant le geste
const FLIGHT = 1.05;   // durée de la traversée

export function initOpening(canvas, { onCut } = {}) {
  if (!canvas) return null;

  const stage = new Stage(canvas);
  const px = new Particles(340);
  const motes = [];
  let t = 0;
  let cutFired = false;
  const trail = [];

  const seedMotes = () => {
    motes.length = 0;
    const n = Math.round(clamp(stage.w / 46, 12, 30));
    for (let i = 0; i < n; i++) {
      motes.push({
        x: rand(0, stage.w), y: rand(0, stage.h),
        r: rand(0.6, 1.9), s: rand(0.05, 0.22),
        ph: rand(0, TAU), a: rand(0.06, 0.24)
      });
    }
  };
  stage.onResize = seedMotes;
  seedMotes();

  // Trajectoire : hors-champ à hors-champ, jamais entièrement dans le cadre
  const path = (p) => ({
    x: lerp(-0.18 * stage.w, 1.18 * stage.w, p),
    y: lerp(0.17 * stage.h, 0.74 * stage.h, p) + Math.sin(p * Math.PI) * -0.04 * stage.h
  });

  // Mouvement réduit : pas de vol, l'écran s'ouvre tout de suite
  if (prefs.reduced) {
    onCut?.();
    cutFired = true;
  }

  stage.update = (dt) => {
    const ctx = stage.ctx;
    t += dt;

    /* ── Le vol ── */
    if (!prefs.reduced) {
      const p = clamp((t - DELAY) / FLIGHT, 0, 1);

      if (t > DELAY && p < 1) {
        const { x, y } = path(p);
        const rot = t * 34;
        const r = Math.min(stage.w, stage.h) * 0.032;

        trail.push({ x, y, age: 0 });

        // Étincelles arrachées au passage
        for (let i = 0; i < 3; i++) {
          px.emit({
            x, y,
            vx: rand(-150, 60), vy: rand(-90, 90),
            life: rand(0.3, 0.75), size: rand(1, 2.6),
            color: Math.random() < 0.25 ? C.spectral : C.bone,
            drag: 0.9
          });
        }

        // Halo puis lame
        ctx.save();
        ctx.shadowColor = C.spectral;
        ctx.shadowBlur = 26;
        drawShuriken(ctx, x, y, r, rot, { fill: C.bone, alpha: 0.95 });
        ctx.restore();
        drawShuriken(ctx, x - 5, y + 3, r, rot - 0.4, { fill: null, stroke: C.spectral, alpha: 0.5 });
      }

      // Le point de bascule : au milieu de l'écran, la coupe est faite
      if (!cutFired && p >= 0.48) { cutFired = true; onCut?.(); }

      /* ── La coupe : la trace persiste puis s'efface ── */
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age += dt;
        if (trail[i].age > 1.6) trail.splice(i, 1);
      }
      if (trail.length > 1) {
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i];
          const b = trail[i - 1];
          const fade = 1 - a.age / 1.6;
          ctx.globalAlpha = fade * fade * 0.85;
          ctx.strokeStyle = fade > 0.55 ? C.bone : C.spectral;
          ctx.lineWidth = 1 + fade * 2.2;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(a.x, a.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      px.update(dt);
      px.draw(ctx);
    }

    /* ── Poussière d'encre en suspension ── */
    for (const m of motes) {
      m.y -= m.s * dt * 60;
      m.ph += dt * 0.5;
      if (m.y < -6) { m.y = stage.h + 6; m.x = rand(0, stage.w); }
      const x = m.x + Math.sin(m.ph) * 14;
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(m.ph * 1.7));
      ctx.fillStyle = C.spectral;
      ctx.beginPath();
      ctx.arc(x, m.y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  stage.start();
  return stage;
}
