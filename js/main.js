/* ═══════════════════════════════════════════════
   Orchestration.
   Règle de sûreté : le contenu est visible par défaut.
   L'état « caché avant révélation » n'est armé qu'une fois
   GSAP confirmé chargé — un CDN qui tombe ne doit pas
   laisser une page blanche.
   ═══════════════════════════════════════════════ */

import { prefs, announce, clamp } from './core.js';
import { initCursor }    from './cursor.js';
import { initAudio }     from './audio.js';
import { initOpening }   from './opening.js';
import { initAbilities } from './abilities.js';
import { initFan }       from './fan.js';
import { initGallery }   from './gallery.js';

/* ── Attente non bloquante de GSAP ── */
function whenGsap(timeout = 4000) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    (function poll() {
      if (window.gsap && window.ScrollTrigger) return resolve(true);
      if (performance.now() - t0 > timeout) return resolve(false);
      requestAnimationFrame(poll);
    })();
  });
}

/* ═══════ Construction du contenu (indépendante de GSAP) ═══════ */

const audio  = initAudio();
const cursor = initCursor({ onWhoosh: (i) => audio.whoosh(i) });

const deathveil = document.querySelector('[data-deathveil]');
function flashDeath() {
  if (prefs.reduced) return;
  deathveil?.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0 }],
    { duration: 900, easing: 'ease-out' });
}

initAbilities(document.querySelector('[data-kit]'), {
  onWhoosh: (i) => audio.whoosh(i),
  onDeath: flashDeath,
  announce
});

const fan     = initFan(document.querySelector('[data-fan]'));
const plates  = initGallery(document.querySelector('[data-expo-track]'));

let openingStage = null;

/* ═══════ Animation ═══════ */

whenGsap().then((ok) => {
  const animate = ok && !prefs.reduced;
  const { gsap, ScrollTrigger } = window;

  /* ── Ouverture : le shuriken, puis la révélation ── */
  const seq = [...document.querySelectorAll('[data-open-seq]')];
  const hint = document.querySelector('.scroll-hint');

  if (animate) {
    document.documentElement.classList.add('js-anim');
    gsap.registerPlugin(ScrollTrigger);
    gsap.set([...seq, hint], { opacity: 0 });
    gsap.set('.opening__title', { clipPath: 'polygon(0% 42%, 100% 18%, 100% 18%, 0% 42%)' });
  }

  let revealed = false;
  const revealTitle = () => {
    if (!animate || revealed) return;
    revealed = true;
    const tl = gsap.timeline();
    tl.to('.opening__title', {
      clipPath: 'polygon(0% -30%, 100% -30%, 100% 130%, 0% 130%)',
      opacity: 1, duration: 1.1, ease: 'power4.out'
    })
      .to(seq.filter((e) => e !== document.querySelector('.opening__title')), {
        opacity: 1, y: 0, duration: 1.1, stagger: 0.14, ease: 'power3.out'
      }, '-=0.75')
      .to(hint, { opacity: 1, duration: 0.9 }, '-=0.5');
  };

  openingStage = initOpening(document.querySelector('[data-opening-canvas]'), {
    onCut: revealTitle
  });

  // Filet de sécurité : si le canvas n'a jamais démarré, l'écran s'ouvre quand même
  setTimeout(revealTitle, 3200);

  if (!animate) { document.documentElement.classList.remove('js-anim'); wireStaticFallbacks(); return; }

  /* ── Lame de lumière au passage d'un acte ── */
  const sweep = document.createElement('div');
  sweep.className = 'cut-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sweep);

  let lastSweep = 0;
  function bladeSweep(dir = 1) {
    const now = performance.now();
    if (now - lastSweep < 700) return;     // pas deux coupes coup sur coup
    lastSweep = now;
    sweep.animate(
      [{ transform: `translate3d(${dir > 0 ? -110 : 110}%,0,0)`, opacity: 1 },
       { transform: `translate3d(${dir > 0 ? 110 : -110}%,0,0)`, opacity: 1 }],
      { duration: 620, easing: 'cubic-bezier(.9,0,.1,1)' }
    );
    audio.whoosh(0.35);
  }

  /* ── Titres : révélés par une coupe diagonale ── */
  gsap.utils.toArray('.act__title, .ability__name, .plate__name').forEach((el) => {
    // Les bornes verticales débordent la boîte : un accent capital qui
    // dépasse du line-box ne doit pas être rogné par la coupe.
    gsap.fromTo(el,
      { clipPath: 'polygon(-5% -40%, -5% -40%, -35% 140%, -35% 140%)', opacity: 0.001 },
      {
        clipPath: 'polygon(-5% -40%, 140% -40%, 110% 140%, -35% 140%)', opacity: 1,
        duration: 1.15, ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
  });

  /* ── Corps de texte : montée discrète ── */
  gsap.utils.toArray('.act__num, .act__lede, .ability__desc, .ability__meta, .ability__prompt, .plate__no, .plate__note, .passive, .releve__source, .expo__hint')
    .forEach((el) => {
      gsap.from(el, {
        y: 26, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

  /* ── Acte I : l'encre se répand ── */
  gsap.utils.toArray('[data-ink]').forEach((el) => {
    gsap.fromTo(el, { '--ink-stop': '0%' }, {
      '--ink-stop': '110%', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 42%', scrub: 0.8 }
    });
  });

  gsap.fromTo('[data-ink-blot]',
    { scale: 0.18, rotate: -12, opacity: 0 },
    {
      scale: 1.05, rotate: 8, opacity: 0.85, ease: 'none',
      scrollTrigger: { trigger: '.act--1', start: 'top bottom', end: 'bottom top', scrub: 1.1 }
    });

  gsap.from('.brush-quote', {
    opacity: 0, y: 40, duration: 1.4, ease: 'power3.out',
    scrollTrigger: { trigger: '.brush-quote', start: 'top 85%', once: true }
  });

  /* ── Parallax multicouche ── */
  gsap.utils.toArray('[data-par]').forEach((el) => {
    const speed = parseFloat(el.dataset.par) || 0.1;
    gsap.fromTo(el, { y: -speed * innerHeight },
      {
        y: speed * innerHeight, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('.act') || el,
          start: 'top bottom', end: 'bottom top', scrub: true
        }
      });
  });

  /* ── Acte III : l'éventail s'ouvre ── */
  if (fan) {
    fan.arm();
    ScrollTrigger.create({
      trigger: '.act--3', start: 'top 62%', once: true,
      onEnter() {
        gsap.to(fan.disc, {
          attr: { r: 470 }, duration: 1.9, ease: 'power3.inOut'
        });
        fan.counters.forEach((el) => {
          const raw = el.dataset.count;
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            gsap.from(el, { opacity: 0, duration: 1.2, delay: 0.5 });
            return;
          }
          const o = { v: 0 };
          gsap.to(o, {
            v: n, duration: 1.7, ease: 'power2.out', delay: 0.25,
            onUpdate() { el.textContent = Math.round(o.v); },
            onComplete() { el.textContent = raw; }
          });
        });
      }
    });
  }

  /* ── Acte IV : la salle se traverse à l'horizontale ── */
  const track = document.querySelector('[data-expo-track]');
  const expoSection = document.querySelector('.act--4');
  if (track && plates.length) {
    const span = () => Math.max(track.scrollWidth - innerWidth, 1);

    gsap.to(track, {
      x: () => -span(), ease: 'none',
      scrollTrigger: {
        trigger: expoSection,
        start: 'top top',
        end: () => `+=${span()}`,
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    /* Les splashs arrivent après coup et changent la longueur du rail.
       Un seul recalcul groupé : neuf refresh() en rafale se marchent dessus
       et laissent l'épinglage sur des mesures périmées. */
    let refreshTimer;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
    };
    track.querySelectorAll('img').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load',  scheduleRefresh, { once: true });
      img.addEventListener('error', scheduleRefresh, { once: true });
    });
  }

  /* ── Rail latéral : position courante + progression ── */
  const dots = [...document.querySelectorAll('[data-rail-dot]')];
  const fill = document.querySelector('[data-rail-fill]');
  const acts = [...document.querySelectorAll('.act')];

  acts.forEach((act, i) => {
    ScrollTrigger.create({
      trigger: act, start: 'top 55%', end: 'bottom 45%',
      onToggle(self) {
        if (!self.isActive) return;
        dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
      },
      onEnter:     () => bladeSweep(1),
      onEnterBack: () => bladeSweep(-1)
    });
  });

  ScrollTrigger.create({
    trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate(self) { if (fill) fill.style.height = `${(self.progress * 100).toFixed(2)}%`; }
  });

  /* ── Acte V : la Marque de la mort s'arme ── */
  ScrollTrigger.create({
    trigger: '.act--5', start: 'top 70%', end: 'bottom bottom',
    onToggle(self) { cursor?.setArmed(self.isActive); }
  });

  /* ── Recalcul après chargement des polices ── */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
});

/* ── Sans GSAP (ou en mouvement réduit) : tout reste lisible et navigable ── */
function wireStaticFallbacks() {
  openingStage ??= initOpening(document.querySelector('[data-opening-canvas]'), {});
  const acts = [...document.querySelectorAll('.act')];
  const dots = [...document.querySelectorAll('[data-rail-dot]')];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = acts.indexOf(e.target);
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    }
  }, { threshold: 0.4 });
  acts.forEach((a) => io.observe(a));

  // L'acte V reste jouable même sans animation de défilement
  const io5 = new IntersectionObserver(
    ([e]) => cursor?.setArmed(e.isIntersecting),
    { threshold: 0.35 }
  );
  const a5 = document.querySelector('.act--5');
  if (a5) io5.observe(a5);
}

/* Onglet caché : on rend la main au navigateur */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) openingStage?.stop();
  else if (openingStage?.visible) openingStage.start();
});
