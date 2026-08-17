/* ═══════════════════════════════════════════════
   Son : un souffle de shuriken, synthétisé.
   Aucun fichier, aucun octet réseau, aucun autoplay.
   Le contexte audio n'existe qu'après un geste explicite.
   ═══════════════════════════════════════════════ */

export function initAudio() {
  const btn   = document.querySelector('[data-sound-toggle]');
  const state = document.querySelector('[data-sound-state]');

  let ctx = null;
  let bus = null;
  let noise = null;      // tampon de bruit blanc, généré une fois
  let on = false;        // silence au chargement, toujours

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    bus = ctx.createGain();
    bus.gain.value = 0.16;             // discret : c'est une respiration, pas un effet
    bus.connect(ctx.destination);

    // 1 s de bruit blanc suffit — on n'en lit que des fragments
    const len = ctx.sampleRate;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    return ctx;
  }

  /* Un souffle = bruit filtré en passe-bande qui descend + une lame sinus brève */
  function whoosh(intensity = 1) {
    if (!on || !ensure() || ctx.state === 'suspended') return;
    const t = ctx.currentTime;
    const i = Math.max(0.15, Math.min(intensity, 1));
    const dur = 0.16 + i * 0.16;

    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(2600 + i * 2400, t);
    bp.frequency.exponentialRampToValueAtTime(420, t + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(i, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp).connect(g).connect(bus);
    src.start(t, Math.random() * 0.8, dur + 0.02);
    src.stop(t + dur + 0.05);

    // La lame : une descente courte, sous le bruit
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 * (0.7 + i * 0.6), t);
    osc.frequency.exponentialRampToValueAtTime(140, t + dur * 0.85);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.22 * i, t + 0.015);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
    osc.connect(og).connect(bus);
    osc.start(t);
    osc.stop(t + dur);
  }

  function setOn(v) {
    on = v;
    btn?.setAttribute('aria-pressed', String(v));
    if (state) state.textContent = v ? 'actif' : 'coupé';
    if (v) { ensure(); ctx?.resume?.(); whoosh(0.5); }
  }

  btn?.addEventListener('click', () => setOn(!on));

  // Un onglet caché ne doit rien émettre
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx?.suspend?.();
    else if (on) ctx?.resume?.();
  });

  return { whoosh, get enabled() { return on; } };
}
