/* ═══════════════════════════════════════════════
   Curseur-ombre, dédoublement au double-clic,
   et la Marque de la mort cachée.
   ═══════════════════════════════════════════════ */

import { prefs, clamp, announce } from './core.js';

/* Le ressort : l'ombre n'interpole pas, elle poursuit.
   Elle dépasse légèrement puis se rattrape — c'est ce qui la rend vivante. */
const STIFF = 130;
const DAMP  = 16;

const IDLE_TO_MARK = 3000;   // immobilité avant l'apparition de la marque
const MARK_FUSE    = 3000;   // durée de la marque, comme le R
const REARM_DELAY  = 45000;  // avant de pouvoir remourir

export function initCursor({ onWhoosh } = {}) {
  const root   = document.querySelector('.cursor');
  const dot    = document.querySelector('[data-cursor-dot]');
  const shadow = document.querySelector('[data-cursor-shadow]');
  const mark   = document.querySelector('[data-cursor-mark]');
  const fill   = mark?.querySelector('.cursor__mark-fill');
  const glyph  = mark?.querySelector('.cursor__mark-glyph');
  const veil   = document.querySelector('[data-deathveil]');
  if (!root || !dot || !shadow) return null;

  const enabled = prefs.fine && !prefs.reduced;
  if (enabled) document.body.classList.add('shadow-cursor');

  /* ── Suivi ── */
  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const sh = { x: target.x, y: target.y, vx: 0, vy: 0 };
  let raf = null, last = 0, seen = false;

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Ressort amorti sur l'ombre uniquement
    sh.vx += ((target.x - sh.x) * STIFF - sh.vx * DAMP) * dt;
    sh.vy += ((target.y - sh.y) * STIFF - sh.vy * DAMP) * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;

    // La vitesse étire l'ombre dans son axe de déplacement
    const sp = Math.hypot(sh.vx, sh.vy);
    const stretch = 1 + clamp(sp / 2600, 0, 0.5);
    const ang = Math.atan2(sh.vy, sh.vx);

    dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
    shadow.style.transform =
      `translate3d(${sh.x}px, ${sh.y}px, 0) rotate(${ang}rad) scale(${stretch}, ${2 - stretch})`;
    if (mark) mark.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;

    raf = requestAnimationFrame(tick);
  }

  if (enabled) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* ── Entrées ── */
  addEventListener('pointermove', (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    if (!seen) {
      seen = true;
      root.style.opacity = '1';
      sh.x = target.x; sh.y = target.y;   // pas de vol depuis le centre au premier mouvement
    }
    document.body.classList.remove('kbd');
    poke();
  }, { passive: true });

  addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.body.classList.add('kbd');
    poke();
  });

  addEventListener('scroll', poke, { passive: true });
  addEventListener('pointerdown', poke, { passive: true });
  addEventListener('blur', () => cancelMark(true));

  /* ── Réaction au survol d'éléments interactifs ── */
  addEventListener('pointerover', (e) => {
    const hot = e.target instanceof Element &&
      e.target.closest('a, button, .plate, .ability__stage');
    shadow.style.width = shadow.style.height = hot ? '54px' : '34px';
    shadow.style.margin = hot ? '-27px 0 0 -27px' : '-17px 0 0 -17px';
  }, { passive: true });

  /* ═══ Dédoublement au double-clic ═══ */
  addEventListener('dblclick', (e) => {
    if (prefs.reduced || !(e.target instanceof Element)) return;
    const el = e.target.closest('[data-clone], h1, h2, .ability__name, .plate, .plate__name, button, .fan__legend li');
    if (!el) return;

    const r = el.getBoundingClientRect();
    // Au-delà d'un demi-écran, le clone coûte plus qu'il ne raconte
    if (r.width * r.height > innerWidth * innerHeight * 0.5) return;

    const ghost = el.cloneNode(true);
    ghost.classList.add('clone');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText += `
      left:${r.left}px; top:${r.top}px; width:${r.width}px; height:${r.height}px;
      margin:0; position:fixed;`;
    document.body.appendChild(ghost);

    // Se détache, glisse, puis refusionne
    ghost.animate([
      { transform: 'translate(0,0)',            opacity: 0.7, filter: 'hue-rotate(0deg)' },
      { transform: 'translate(-16px, 9px)',     opacity: 0.5, offset: 0.45 },
      { transform: 'translate(0,0)',            opacity: 0 }
    ], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' })
      .finished.then(() => ghost.remove(), () => ghost.remove());

    onWhoosh?.(0.4);
  });

  /* ═══ Marque de la mort — l'easter egg ═══ */
  let idleTimer = null;
  let fuseAnim = null, ringAnim = null;
  let armed = false;          // vrai dans l'acte V, ou après une première mort
  let discovered = false;
  let cooldownUntil = 0;
  let marking = false;

  const hint = document.querySelector('[data-silence-hint]');
  const reward = document.querySelector('[data-silence-reward]');

  function poke() {
    if (marking) cancelMark();
    clearTimeout(idleTimer);
    hint?.classList.remove('is-visible');
    if (!enabled || !armed || performance.now() < cooldownUntil) return;
    idleTimer = setTimeout(beginMark, IDLE_TO_MARK);
    // L'indice ne se montre qu'à mi-parcours de l'immobilité
    if (hint) setTimeout(() => {
      if (armed && !marking) hint.classList.add('is-visible');
    }, IDLE_TO_MARK * 0.5);
  }

  function beginMark() {
    if (!mark || marking) return;
    marking = true;
    announce('Marque de la mort posée. Trois secondes.');

    ringAnim = mark.animate(
      [{ opacity: 0, transform: `translate3d(${target.x}px,${target.y}px,0) scale(.5)` },
       { opacity: 1, transform: `translate3d(${target.x}px,${target.y}px,0) scale(1)` }],
      { duration: 340, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
    );
    mark.style.opacity = '1';

    fuseAnim = fill.animate(
      [{ strokeDashoffset: 214 }, { strokeDashoffset: 0 }],
      { duration: MARK_FUSE, easing: 'linear', fill: 'forwards' }
    );
    fuseAnim.finished.then(detonate).catch(() => { /* annulée : le joueur a bougé */ });
    onWhoosh?.(0.25);
  }

  function detonate() {
    if (!marking) return;
    marking = false;
    discovered = true;
    cooldownUntil = performance.now() + REARM_DELAY;

    glyph.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' },
                   { opacity: 0, transform: 'scale(2.4)' }],
      { duration: 760, easing: 'cubic-bezier(.9,0,.1,1)' });

    veil?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 0 }],
      { duration: 1100, easing: 'ease-out' });

    mark.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: 500, delay: 260, fill: 'forwards' });

    reward?.removeAttribute('hidden');
    reward?.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });

    hint?.classList.remove('is-visible');
    announce('La marque a explosé.');
    onWhoosh?.(1);
  }

  function cancelMark(hard = false) {
    clearTimeout(idleTimer);
    if (!marking && !hard) return;
    marking = false;
    fuseAnim?.cancel();
    ringAnim?.cancel();
    if (mark) {
      mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      mark.style.opacity = '0';
    }
    if (fill) fill.style.strokeDashoffset = '214';
  }

  return {
    /* Armé en permanence dans l'acte V ; ailleurs, seulement après une première mort. */
    setArmed(v) {
      armed = v || discovered;
      if (!armed) { cancelMark(true); hint?.classList.remove('is-visible'); }
      else poke();
    },
    destroy() { if (raf) cancelAnimationFrame(raf); cancelMark(true); }
  };
}
