/* ═══════════════════════════════════════════════
   Curseur-ombre.

   Principe : le curseur natif n'est JAMAIS masqué. Le brief demande
   « un second curseur décalé qui suit le vrai » — donc le vrai reste,
   et l'ombre le poursuit avec un retard élastique. Masquer le pointeur
   système supprimait toutes les affordances (main sur les liens, barre
   sur le texte) et donnait l'impression d'une latence permanente.

   Tout est piloté par une seule boucle rAF : position, opacité,
   compte à rebours. Aucune animation Web Animations sur les éléments
   que la boucle positionne — un `fill: forwards` y gèlerait la
   transformation et l'ombre resterait collée à l'écran.
   ═══════════════════════════════════════════════ */

import { prefs, clamp, announce } from './core.js';

/* Retard de l'ombre — demi-vie : temps pour combler la moitié de l'écart.
   Formulation exponentielle et non ressort intégré à la main :
     · inconditionnellement stable, quel que soit le pas de temps ;
     · rigoureusement identique à 30, 60 ou 144 Hz.
   Un ressort explicite (raideur 120 / amortissement 15) traînait de
   v × 0,125 s — soit 100 px à 800 px/s, plus de trois fois la taille de
   l'ombre. Elle se détachait du pointeur au lieu de le suivre. */
const HALF_LIFE = 0.022;    // → retard effectif ≈ 32 ms (25 px à 800 px/s)
const SNAP = 0.4;           // px : sous ce seuil, on colle (pas de reptation)
const IDLE_TO_MARK = 3;     // s d'immobilité avant que la marque se pose
const FUSE = 3;             // s de compte à rebours, comme le R
const REARM = 45;           // s avant de pouvoir remourir
const CIRC = 2 * Math.PI * 34;   // périmètre de l'anneau (r = 34)

export function initCursor({ onWhoosh } = {}) {
  const root   = document.querySelector('.cursor');
  const shadow = document.querySelector('[data-cursor-shadow]');
  const dot    = document.querySelector('[data-cursor-dot]');
  const mark   = document.querySelector('[data-cursor-mark]');
  const fuse   = mark?.querySelector('.cursor__mark-fuse');
  const glyph  = mark?.querySelector('.cursor__mark-glyph');
  const veil   = document.querySelector('[data-deathveil]');
  const hint   = document.querySelector('[data-silence-hint]');
  const reward = document.querySelector('[data-silence-reward]');
  if (!root || !shadow) return null;

  // Pointeur grossier ou mouvement réduit : pas d'ombre du tout
  if (!prefs.fine || prefs.reduced) {
    return { setArmed() {}, destroy() {} };
  }
  document.body.classList.add('shadow-cursor');

  /* ── État ── */
  const ptr = { x: innerWidth / 2, y: innerHeight / 2 };
  const sh  = { x: ptr.x, y: ptr.y };
  let live = false;          // vrai dès le premier mouvement réel
  let idle = 0;              // secondes sans la moindre entrée
  let armed = false;         // acte V, ou déjà découvert
  let discovered = false;
  let cooldown = 0;
  let phase = 'off';         // off → fuse → boom
  let phaseT = 0;
  let hintOn = false;
  let raf = null;    // null = à l'arrêt ; sert aussi de verrou anti-double-boucle
  let last = 0;

  /* ── Entrées : toute activité remet l'immobilité à zéro ── */
  function poke() { idle = 0; }

  addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY;

    /* Le losange net est posé ICI, pas dans la boucle rAF. Passer par la
       boucle ajouterait une image entière de retard (16 ms à 60 Hz, plus
       si l'image est en retard) : le pointeur système étant masqué, ce
       retard-là se voit immédiatement et donne un curseur qui « patine ».
       Seule l'ombre, elle, a le droit de traîner. */
    if (dot) dot.style.transform = `translate3d(${ptr.x}px, ${ptr.y}px, 0)`;

    if (!live) {                       // évite le vol depuis le centre de l'écran
      live = true;
      sh.x = ptr.x; sh.y = ptr.y;
      root.classList.add('is-live');
    }
    document.body.classList.remove('kbd');
    poke();
  }, { passive: true });

  /* Pointeur sorti de la fenêtre : le curseur natif reprend la main
     au-dehors, le nôtre ne doit pas rester figé sur un bord. */
  document.addEventListener('pointerleave', () => root.classList.remove('is-live'));
  document.addEventListener('pointerenter', () => { if (live) root.classList.add('is-live'); });

  addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.body.classList.add('kbd');
    poke();
  });
  addEventListener('scroll',      poke, { passive: true });
  addEventListener('pointerdown', poke, { passive: true });
  addEventListener('wheel',       poke, { passive: true });
  addEventListener('blur', () => { reset(); });

  /* L'ombre s'ouvre légèrement au-dessus de ce qui est cliquable */
  addEventListener('pointerover', (e) => {
    const hot = e.target instanceof Element &&
      e.target.closest('a, button, .plate, .ability__stage');
    root.classList.toggle('is-hot', !!hot);
  }, { passive: true });

  /* ═══ Boucle unique ═══ */
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    /* L'ombre comble une fraction fixe de l'écart par unité de temps.
       Math.pow(2, -dt/HALF_LIFE) rend le rattrapage indépendant du
       nombre d'images par seconde : même retard partout. */
    const a = 1 - Math.pow(2, -dt / HALF_LIFE);
    const fromX = sh.x, fromY = sh.y;
    sh.x += (ptr.x - sh.x) * a;
    sh.y += (ptr.y - sh.y) * a;
    if (Math.abs(ptr.x - sh.x) < SNAP) sh.x = ptr.x;
    if (Math.abs(ptr.y - sh.y) < SNAP) sh.y = ptr.y;

    // Vitesse mesurée sur l'image écoulée — rien à intégrer, rien à diverger
    const vx = (sh.x - fromX) / dt, vy = (sh.y - fromY) / dt;
    const sp = Math.hypot(vx, vy);
    const k = clamp(sp / 3200, 0, 0.42);
    const ang = sp > 12 ? Math.atan2(vy, vx) : 0;
    shadow.style.transform =
      `translate3d(${sh.x.toFixed(1)}px, ${sh.y.toFixed(1)}px, 0) ` +
      `rotate(${ang}rad) scale(${(1 + k).toFixed(3)}, ${(1 - k * 0.7).toFixed(3)})`;

    /* ── Marque de la mort ── */
    idle += dt;
    if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);

    if (phase === 'off') {
      if (armed && cooldown === 0 && idle >= IDLE_TO_MARK) {
        phase = 'fuse'; phaseT = 0;
        announce('Marque de la mort posée. Trois secondes.');
        onWhoosh?.(0.25);
      }
    } else if (phase === 'fuse') {
      if (idle < IDLE_TO_MARK) { phase = 'off'; phaseT = 0; }   // bougé → échappé
      else {
        phaseT += dt;
        if (phaseT >= FUSE) { phase = 'boom'; phaseT = 0; detonate(); }
      }
    } else if (phase === 'boom') {
      phaseT += dt;
      if (phaseT >= 1.1) { phase = 'off'; phaseT = 0; cooldown = REARM; }
    }

    if (mark) drawMark();

    // L'indice ne se montre qu'à mi-chemin de l'immobilité
    const wantHint = armed && phase === 'off' && idle >= IDLE_TO_MARK * 0.5;
    if (wantHint !== hintOn) {
      hintOn = wantHint;
      hint?.classList.toggle('is-visible', wantHint);
    }

    raf = requestAnimationFrame(tick);
  }

  function drawMark() {
    let o = 0, scale = 1, dash = CIRC, g = 0;

    if (phase === 'fuse') {
      const inT = clamp(phaseT / 0.3, 0, 1);
      o = inT;
      scale = 0.6 + 0.4 * inT;
      dash = CIRC * (phaseT / FUSE);        // l'anneau se vide
    } else if (phase === 'boom') {
      const t = phaseT / 1.1;
      o = 1 - t;
      scale = 1 + t * 1.9;
      dash = CIRC;
      g = Math.max(0, 1 - t * 2.2);
    }

    mark.style.opacity = o.toFixed(3);
    mark.style.transform =
      `translate3d(${ptr.x}px, ${ptr.y}px, 0) scale(${scale.toFixed(3)})`;
    if (fuse)  fuse.style.strokeDashoffset = dash.toFixed(1);
    if (glyph) glyph.style.opacity = g.toFixed(3);
  }

  function detonate() {
    discovered = true;
    veil?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 0 }],
      { duration: 1100, easing: 'ease-out' });

    if (reward) {
      reward.removeAttribute('hidden');
      reward.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
      );
    }
    announce('La marque a explosé.');
    onWhoosh?.(1);
  }

  function reset() {
    phase = 'off'; phaseT = 0; idle = 0;
    if (mark) drawMark();
    hintOn = false;
    hint?.classList.remove('is-visible');
  }

  function startLoop() {
    if (raf !== null) return;        // sans ce garde-fou, deux boucles
    last = performance.now();        // intègrent le ressort en double
    raf = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (raf === null) return;
    cancelAnimationFrame(raf);
    raf = null;
  }
  startLoop();

  // Un onglet caché ne doit ni animer ni accumuler d'immobilité
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { reset(); stopLoop(); }
    else startLoop();
  });

  return {
    /* Armée en permanence dans l'acte V ; ailleurs, seulement après une première mort. */
    setArmed(v) {
      armed = v || discovered;
      if (!armed) reset();
    },
    destroy() { stopLoop(); }
  };
}

/* ═══════════════════════════════════════════════
   Dédoublement au double-clic — indépendant du curseur.
   ═══════════════════════════════════════════════ */
export function initClone({ onWhoosh } = {}) {
  if (prefs.reduced) return;

  addEventListener('dblclick', (e) => {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest(
      '[data-clone], h1, h2, .ability__name, .plate, .plate__name, button, .fan__legend li'
    );
    if (!el) return;

    const r = el.getBoundingClientRect();
    // Au-delà d'un demi-écran, le clone coûte plus qu'il ne raconte
    if (r.width * r.height > innerWidth * innerHeight * 0.5) return;

    const ghost = el.cloneNode(true);
    ghost.classList.add('clone');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText +=
      `left:${r.left}px; top:${r.top}px; width:${r.width}px; height:${r.height}px;
       margin:0; position:fixed;`;
    document.body.appendChild(ghost);

    ghost.animate([
      { transform: 'translate(0,0)',        opacity: 0.7 },
      { transform: 'translate(-16px, 9px)', opacity: 0.5, offset: 0.45 },
      { transform: 'translate(0,0)',        opacity: 0 }
    ], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' })
      .finished.then(() => ghost.remove(), () => ghost.remove());

    onWhoosh?.(0.4);
  });
}
