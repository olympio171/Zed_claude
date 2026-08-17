/* ═══════════════════════════════════════════════
   Acte II — Les quatre visages.
   Chaque capacité est une scène jouable, pas une icône.
   Le canvas est un enrichissement : tout le sens est déjà
   dans le texte DOM (d'où aria-hidden sur les scènes).
   ═══════════════════════════════════════════════ */

import {
  Stage, Particles, drawShuriken, drawDiamond,
  prefs, rand, lerp, clamp, C, TAU
} from './core.js';
import { ABILITIES } from './data.js';

/* La scène se démontre seule UNE fois, quelques secondes après être entrée
   à l'écran — puis se tait. En boucle, elle envoyait des traînées violettes
   en travers du fond toutes les 4 s pendant qu'on lisait le texte posé
   par-dessus : illisible et perçu, à juste titre, comme un bug. */
const IDLE_DEMO = 3.4;
const NARROW = 760;

/* Un compteur d'inactivité à usage unique. */
function makeDemo() {
  let t = 0, spent = false;
  return {
    tick(dt) { if (spent) return false; t += dt; if (t < IDLE_DEMO) return false; spent = true; return true; },
    cancel() { spent = true; }      // la première interaction la rend inutile
  };
}

/* Placement des acteurs.
   En large, ils occupent la colonne libre en face du texte.
   En étroit, il n'y a plus de colonne libre : on les envoie au-dessus ou
   en dessous du bloc de texte plutôt que derrière lui. */
function placeHome(stage, home) {
  if (stage.w < NARROW) {
    home.x = stage.w * 0.5;
    home.y = stage.h * (home.px > 0.5 ? 0.20 : 0.80);
  } else {
    home.x = stage.w * home.px;
    home.y = stage.h * 0.5;
  }
}

/* ── Construction du DOM d'un acte de capacité ── */
function buildSection(ab, i) {
  const s = document.createElement('article');
  s.className = `ability ability--${ab.slug}`;
  s.setAttribute('aria-labelledby', `ab-${ab.slug}`);

  const meta = ab.meta
    .map((m) => `<li>${m.k}<b>${m.v}</b></li>`)
    .join('');

  s.innerHTML = `
    <canvas class="ability__stage" data-ab-stage aria-hidden="true"></canvas>
    <div class="ability__inner">
      <div class="ability__key" aria-hidden="true"><span>${ab.key}</span></div>
      <h3 class="ability__name glitch" id="ab-${ab.slug}">
        <span class="echo" data-echo="${ab.name}">${ab.name}</span>
      </h3>
      <p class="ability__desc">${ab.desc}</p>
      <ul class="ability__meta">${meta}</ul>
      <p class="ability__prompt">${ab.prompt}</p>
    </div>`;
  return s;
}

/* ═══════════════════════════════════════════════
   Comportements — un par capacité
   ═══════════════════════════════════════════════ */

/* ── Q : Zed et ses ombres lancent. Les shurikens traversent tout. ── */
function behaviourQ(stage, home) {
  const px = new Particles(420);
  const shots = [];
  const shadows = [{ dx: -0.055, dy: -0.17 }, { dx: -0.075, dy: 0.19 }];   // fractions de la scène
  let idle = 0, bob = 0;

  const demo = makeDemo();
  const shPos = (s) => ({ x: home.x + s.dx * stage.w, y: home.y + s.dy * stage.h });

  const fire = (tx, ty) => {
    const origins = [{ x: home.x, y: home.y }, ...shadows.map(shPos)];
    origins.forEach((o, k) => {
      const a = Math.atan2(ty - o.y, tx - o.x);
      const sp = 1180;
      shots.push({
        x: o.x, y: o.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: 0, ghost: k > 0
      });
    });
  };

  stage.fire = fire;

  stage.update = (dt) => {
    const ctx = stage.ctx;
    bob += dt;
    placeHome(stage, home);

    if (demo.tick(dt)) fire(stage.w * (home.px > 0.5 ? 0.12 : 0.88), stage.h * 0.5);
    stage.resetIdle = () => demo.cancel();

    // Zed et ses deux ombres
    const u = stage.u;
    shadows.forEach((s, k) => {
      const p = shPos(s);
      drawDiamond(ctx, p.x, p.y + Math.sin(bob * 1.1 + k * 2) * 7, 26 * u, {
        stroke: C.spectral, width: 1.2, alpha: 0.45
      });
    });
    drawDiamond(ctx, home.x, home.y + Math.sin(bob * 0.9) * 5, 36 * u, {
      fill: 'rgba(245,243,240,.06)', stroke: C.bone, width: 1.6, alpha: 0.9
    });

    // Les shurikens
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot += dt * 30;

      px.emit({
        x: s.x, y: s.y,
        vx: rand(-40, 40), vy: rand(-40, 40),
        life: rand(0.18, 0.42), size: rand(1, 2.4),
        color: s.ghost ? C.spectral : C.bone, drag: 0.88
      });

      drawShuriken(ctx, s.x, s.y, (s.ghost ? 14 : 20) * u, s.rot, {
        fill: s.ghost ? null : C.bone,
        stroke: s.ghost ? C.spectral : null,
        alpha: s.ghost ? 0.75 : 1
      });

      const m = 80;
      if (s.x < -m || s.x > stage.w + m || s.y < -m || s.y > stage.h + m) shots.splice(i, 1);
    }

    px.update(dt); px.draw(ctx);
  };
}

/* ── W : l'ombre part devant, puis on échange de place avec elle. ── */
function behaviourW(stage, home) {
  const px = new Particles(360);
  let shadow = null;          // { x, y, life }
  let dash = null;            // { from, to, t, pairs }
  const ghost = { x: -999, y: -999 };   // le curseur devient le clone
  const demo = makeDemo();
  let bob = 0;

  const act = (tx, ty) => {
    if (dash) return;
    if (!shadow) {
      // Projection : l'ombre file vers l'avant et se fige
      const a = Math.atan2(ty - home.y, tx - home.x);
      const dist = Math.min(Math.hypot(tx - home.x, ty - home.y), stage.w * 0.42);
      shadow = {
        x: home.x, y: home.y,
        tx: home.x + Math.cos(a) * dist,
        ty: home.y + Math.sin(a) * dist,
        travel: 0, life: 5.2
      };
      stage.announceSwap?.('Ombre projetée.');
    } else {
      // Échange : les deux corps se croisent
      dash = { ax: home.x, ay: home.y, bx: shadow.x, by: shadow.y, t: 0 };
      stage.announceSwap?.('Positions échangées.');
    }
  };
  stage.fire = act;
  // Zed conserve sa position après un échange ; un redimensionnement la réinitialise
  stage.onResize = () => { home.locked = false; };

  stage.update = (dt) => {
    const ctx = stage.ctx;
    const u = stage.u;
    bob += dt;
    // Zed garde sa position après un échange : on ne la recalcule qu'au premier tour
    if (!home.locked) { placeHome(stage, home); home.locked = true; }

    if (demo.tick(dt)) act(stage.w * (home.px > 0.5 ? 0.22 : 0.78), stage.h * 0.5);
    stage.resetIdle = () => demo.cancel();

    // Le clone suit le pointeur avec du retard — c'est le curseur qui devient l'ombre
    if (stage.pointer.inside) {
      ghost.x = lerp(ghost.x < -900 ? stage.pointer.x : ghost.x, stage.pointer.x, 1 - Math.pow(0.001, dt));
      ghost.y = lerp(ghost.y < -900 ? stage.pointer.y : ghost.y, stage.pointer.y, 1 - Math.pow(0.001, dt));
      drawDiamond(ctx, ghost.x, ghost.y, 30 * u, { stroke: C.spectral, width: 1.2, alpha: 0.5 });
      drawDiamond(ctx, ghost.x, ghost.y, 15 * u, { fill: 'rgba(139,92,246,.18)', stroke: null, alpha: 1 });
    }

    // Voyage de l'ombre vers son point d'arrêt
    if (shadow && shadow.travel < 1) {
      shadow.travel = clamp(shadow.travel + dt * 3.4, 0, 1);
      const e = 1 - Math.pow(1 - shadow.travel, 3);
      shadow.x = lerp(home.x, shadow.tx, e);
      shadow.y = lerp(home.y, shadow.ty, e);
      px.emit({
        x: shadow.x, y: shadow.y, vx: rand(-30, 30), vy: rand(-30, 30),
        life: 0.5, size: rand(1.5, 3), color: C.spectral, drag: 0.9
      });
    }

    // L'échange : deux traits qui se croisent
    if (dash) {
      dash.t = clamp(dash.t + dt * 2.6, 0, 1);
      const e = 1 - Math.pow(1 - dash.t, 4);
      home.x = lerp(dash.ax, dash.bx, e);
      home.y = lerp(dash.ay, dash.by, e);
      shadow.x = lerp(dash.bx, dash.ax, e);
      shadow.y = lerp(dash.by, dash.ay, e);

      ctx.save();
      ctx.globalAlpha = (1 - dash.t) * 0.5;
      ctx.strokeStyle = C.spectral;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dash.ax, dash.ay); ctx.lineTo(dash.bx, dash.by); ctx.stroke();
      ctx.restore();

      for (const p of [[home.x, home.y, C.bone], [shadow.x, shadow.y, C.spectral]]) {
        px.emit({ x: p[0], y: p[1], vx: rand(-70, 70), vy: rand(-70, 70),
                  life: 0.42, size: rand(1, 2.6), color: p[2], drag: 0.9 });
      }
      if (dash.t >= 1) { dash = null; shadow.life = Math.min(shadow.life, 2.4); }
    }

    // L'ombre a une durée de vie : un anneau la décompte
    if (shadow) {
      shadow.life -= dt;
      if (shadow.life <= 0) {
        for (let i = 0; i < 16; i++) {
          px.emit({ x: shadow.x, y: shadow.y, vx: rand(-120, 120), vy: rand(-120, 120),
                    life: rand(0.3, 0.7), size: rand(1, 3), color: C.spectral, drag: 0.9 });
        }
        shadow = null;
      } else {
        drawDiamond(ctx, shadow.x, shadow.y, 36 * u, { stroke: C.spectral, width: 1.5, alpha: 0.85 });
        ctx.save();
        ctx.strokeStyle = C.spectral;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, 50 * u, -Math.PI / 2, -Math.PI / 2 + TAU * (shadow.life / 5.2));
        ctx.stroke();
        ctx.restore();
      }
    }

    drawDiamond(ctx, home.x, home.y + (dash ? 0 : Math.sin(bob * 0.9) * 5), 36 * u, {
      fill: 'rgba(245,243,240,.06)', stroke: C.bone, width: 1.6, alpha: 0.9
    });

    px.update(dt); px.draw(ctx);
  };
}

/* ── E : la taillade part de Zed ET de son ombre. L'ombre ralentit. ── */
function behaviourE(stage, home) {
  const px = new Particles(420);
  const rings = [];
  const foes = [];
  const demo = makeDemo();
  let bob = 0;
  const shadowOff = { dx: 0, dy: 0 };

  const seed = () => {
    foes.length = 0;
    const n = Math.round(clamp(stage.w / 90, 7, 16));
    for (let i = 0; i < n; i++) {
      foes.push({
        x: rand(0, stage.w), y: rand(0, stage.h),
        vx: rand(-26, 26), vy: rand(-20, 20),
        slow: 0, hit: 0
      });
    }
  };
  stage.onResize = seed;
  seed();

  const slash = () => {
    const sx = home.x + shadowOff.dx, sy = home.y + shadowOff.dy;
    rings.push({ x: home.x, y: home.y, r: 0, from: 'zed' });
    rings.push({ x: sx, y: sy, r: 0, from: 'shadow' });
  };
  stage.fire = slash;

  stage.update = (dt) => {
    const ctx = stage.ctx;
    bob += dt;
    placeHome(stage, home);
    shadowOff.dx = Math.cos(bob * 0.5) * stage.w * 0.14;
    shadowOff.dy = Math.sin(bob * 0.7) * stage.h * (stage.w < NARROW ? 0.10 : 0.16);

    if (demo.tick(dt)) slash();
    stage.resetIdle = () => demo.cancel();

    const maxR = Math.min(stage.w, stage.h) * 0.30;

    // Ennemis : dérive, rebond aux bords, décompte du ralentissement
    for (const f of foes) {
      const k = f.slow > 0 ? 0.3 : 1;
      f.x += f.vx * dt * k; f.y += f.vy * dt * k;
      if (f.x < 8 || f.x > stage.w - 8) f.vx *= -1;
      if (f.y < 8 || f.y > stage.h - 8) f.vy *= -1;
      f.x = clamp(f.x, 8, stage.w - 8);
      f.y = clamp(f.y, 8, stage.h - 8);
      f.slow = Math.max(0, f.slow - dt);
      f.hit = Math.max(0, f.hit - dt * 2.4);

      const col = f.slow > 0 ? C.spectral : C.muted;
      ctx.save();
      ctx.globalAlpha = 0.35 + f.hit * 0.65 + (f.slow > 0 ? 0.3 : 0);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.6 + f.hit * 3.5, 0, TAU);
      ctx.fill();
      if (f.slow > 0) {
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = C.spectral; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    // Les anneaux de taille
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      const prev = g.r;
      g.r += maxR * dt * 3.4;

      for (const f of foes) {
        const d = Math.hypot(f.x - g.x, f.y - g.y);
        if (d > prev && d <= g.r) {
          f.hit = 1;
          if (g.from === 'shadow') f.slow = 1.9;   // seule l'ombre ralentit
          px.emit({ x: f.x, y: f.y, vx: rand(-90, 90), vy: rand(-90, 90),
                    life: 0.4, size: rand(1, 2.6),
                    color: g.from === 'shadow' ? C.spectral : C.bone, drag: 0.9 });
        }
      }

      const a = clamp(1 - g.r / maxR, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = g.from === 'shadow' ? C.spectral : C.bone;
      ctx.lineWidth = 1 + a * 2;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke();
      ctx.restore();

      if (g.r >= maxR) rings.splice(i, 1);
    }

    drawDiamond(ctx, home.x + shadowOff.dx, home.y + shadowOff.dy, 30 * stage.u, {
      stroke: C.spectral, width: 1.4, alpha: 0.65
    });
    drawDiamond(ctx, home.x, home.y, 36 * stage.u, {
      fill: 'rgba(245,243,240,.06)', stroke: C.bone, width: 1.6, alpha: 0.9
    });

    px.update(dt); px.draw(ctx);
  };
}

/* ── R : trois secondes. Tout ce qui tombe entre-temps retombe d'un coup. ── */
function behaviourR(stage, home) {
  const px = new Particles(520);
  const target = { x: 0, y: 0, vx: 42, vy: 30, init: false };
  let phase = 'idle';         // idle → dash → marked → boom
  let mark = 0;               // secondes restantes
  let acc = 0;                // dégâts accumulés pendant la marque
  let zed = { x: 0, y: 0, alpha: 1 };
  let dashT = 0, dashFrom = null;
  let boom = 0;
  const demo = makeDemo();
  let bob = 0;

  const go = () => {
    if (phase !== 'idle') return;
    phase = 'dash';
    dashT = 0;
    dashFrom = { x: zed.x, y: zed.y };
  };
  stage.fire = go;

  stage.update = (dt) => {
    const ctx = stage.ctx;
    bob += dt;
    placeHome(stage, home);

    if (!target.init) {
      // La cible se tient à l'opposé de Zed, jamais derrière le texte
      if (stage.w < NARROW) {
        target.x = stage.w * 0.5;
        target.y = stage.h * (home.px > 0.5 ? 0.80 : 0.20);
      } else {
        target.x = stage.w * (home.px > 0.5 ? 0.28 : 0.72);
        target.y = stage.h * 0.42;
      }
      zed.x = home.x; zed.y = home.y;
      target.init = true;
    }

    if (demo.tick(dt)) go();
    stage.resetIdle = () => demo.cancel();

    // La cible dérive, sauf pendant la marque où elle ralentit (elle sait)
    const tk = phase === 'marked' ? 0.28 : 1;
    target.x += target.vx * dt * tk;
    target.y += target.vy * dt * tk;

    // En étroit, la cible reste cantonnée à sa moitié : elle ne traverse pas le texte
    const narrow = stage.w < NARROW;
    const low  = narrow && home.px > 0.5 ? stage.h * 0.60 : 60;
    const high = narrow && home.px <= 0.5 ? stage.h * 0.40 : stage.h - 60;

    if (target.x < 60 || target.x > stage.w - 60) target.vx *= -1;
    if (target.y < low || target.y > high) target.vy *= -1;
    target.x = clamp(target.x, 60, stage.w - 60);
    target.y = clamp(target.y, low, high);

    /* ── Ruée : Zed devient impossible à cibler ── */
    if (phase === 'dash') {
      dashT = clamp(dashT + dt * 2.2, 0, 1);
      const e = 1 - Math.pow(1 - dashT, 3);
      zed.x = lerp(dashFrom.x, target.x - 52, e);
      zed.y = lerp(dashFrom.y, target.y + 34, e);
      zed.alpha = 0.12 + Math.abs(dashT - 0.5) * 1.7;   // s'efface au milieu de la ruée
      px.emit({ x: zed.x, y: zed.y, vx: rand(-50, 50), vy: rand(-50, 50),
                life: 0.5, size: rand(1, 3), color: C.spectral, drag: 0.9 });
      if (dashT >= 1) { phase = 'marked'; mark = 3; acc = 0; }
    }

    /* ── Marque active : le compteur monte pendant que le temps descend ── */
    if (phase === 'marked') {
      mark -= dt;
      acc += dt * rand(150, 240);
      zed.alpha = 1;
      if (Math.random() < dt * 8) {
        px.emit({ x: target.x + rand(-24, 24), y: target.y + rand(-24, 24),
                  vx: rand(-40, 40), vy: rand(-70, -10),
                  life: 0.6, size: rand(1, 2.4), color: C.blood, drag: 0.92 });
      }
      if (mark <= 0) {
        phase = 'boom'; boom = 0;
        for (let i = 0; i < 90; i++) {
          const a = rand(0, TAU), sp = rand(60, 560);
          px.emit({ x: target.x, y: target.y,
                    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                    life: rand(0.4, 1.1), size: rand(1, 3.6),
                    color: Math.random() < 0.7 ? C.blood : C.bone, drag: 0.9 });
        }
        stage.onBoom?.();
      }
    }

    if (phase === 'boom') {
      boom += dt;
      const a = clamp(1 - boom / 0.7, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = C.blood;
      ctx.lineWidth = 1 + a * 5;
      ctx.beginPath(); ctx.arc(target.x, target.y, (1 - a) * 260, 0, TAU); ctx.stroke();
      ctx.restore();
      if (boom > 1.5) {
        phase = 'idle';
        zed = { x: home.x, y: home.y, alpha: 1 };
      }
    }

    /* ── La cible ── */
    const u = stage.u;
    const marked = phase === 'marked';
    ctx.save();
    ctx.globalAlpha = marked ? 1 : 0.55;
    ctx.strokeStyle = marked ? C.blood : C.muted;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(target.x, target.y, 30 * u, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(target.x, target.y, 4.5 * u, 0, TAU);
    ctx.fillStyle = marked ? C.blood : C.muted; ctx.fill();
    ctx.restore();

    if (marked) {
      // L'anneau de compte à rebours se vide
      ctx.save();
      ctx.strokeStyle = C.blood;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 46 * u, -Math.PI / 2, -Math.PI / 2 + TAU * (mark / 3));
      ctx.stroke();

      ctx.globalAlpha = 0.5 + Math.sin(bob * 14) * 0.25;
      ctx.fillStyle = C.blood;
      ctx.font = `600 ${Math.round(15 * u)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(mark.toFixed(1).replace('.', ','), target.x, target.y - 62 * u);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = C.bone;
      ctx.font = `300 ${Math.round(12 * u)}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${Math.round(acc)} dégâts retenus`, target.x, target.y + 76 * u);
      ctx.restore();
    }

    if (phase === 'idle') { zed.x = home.x; zed.y = home.y + Math.sin(bob * 0.9) * 5; }
    drawDiamond(ctx, zed.x, zed.y, 36 * u, {
      fill: 'rgba(245,243,240,.06)', stroke: C.bone, width: 1.6, alpha: zed.alpha
    });

    px.update(dt); px.draw(ctx);
  };
}

const BEHAVIOURS = { q: behaviourQ, w: behaviourW, e: behaviourE, r: behaviourR };

/* ═══════════════════════════════════════════════ */
export function initAbilities(mount, { onWhoosh, onDeath, announce } = {}) {
  if (!mount) return [];

  const stages = [];

  ABILITIES.forEach((ab, i) => {
    const section = buildSection(ab, i);
    mount.appendChild(section);

    const canvas = section.querySelector('[data-ab-stage]');
    // Le texte porte tout : en mouvement réduit, la scène animée est superflue
    if (prefs.reduced) { canvas.remove(); return; }

    const home = { px: i % 2 === 0 ? 0.70 : 0.30, x: 0, y: 0 };

    const stage = new Stage(canvas, {
      onPointer: (x, y) => {
        stage.resetIdle?.();
        stage.fire?.(x, y);
        onWhoosh?.(ab.slug === 'r' ? 0.8 : 0.5);
      }
    });

    stage.announceSwap = announce;
    stage.onBoom = () => { onDeath?.(); onWhoosh?.(1); };

    BEHAVIOURS[ab.slug](stage, home);
    stages.push(stage);
  });

  return stages;
}
