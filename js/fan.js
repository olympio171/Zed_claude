/* ═══════════════════════════════════════════════
   Acte III — Relevé.
   Cinq lames en éventail. Pas un tableau, pas un dashboard :
   une respiration de quelques secondes.
   ═══════════════════════════════════════════════ */

import { METRICS } from './data.js';

const OX = 150, OY = 505;        // point de convergence des lames
const A0 = -98, A1 = -10;        // ouverture (degrés, y vers le bas) : haut → bas
const HUB = 62;                  // moyeu creux : sans lui, les cinq bases se écrasent en tache
const LEN = 420, W = 30;

/* Une lame : elle naît hors du moyeu, s'élargit au ventre, finit en pointe. */
function bladePath(deg, len, w = W) {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a);
  const nx = -uy, ny = ux;
  const P = (d, o) => `${(OX + ux * d + nx * o).toFixed(1)},${(OY + uy * d + ny * o).toFixed(1)}`;
  const belly = HUB + (len - HUB) * 0.58;
  return `M${P(HUB, -w * 0.20)} L${P(belly, -w * 0.5)} L${P(len, 0)} ` +
         `L${P(belly, w * 0.5)} L${P(HUB, w * 0.20)} Z`;
}

/* Longueur d'une lame pleine : jamais nulle, sinon la mesure disparaît. */
const fillLen = (t) => HUB + (LEN - HUB) * Math.max(t, 0.06);

export function initFan(root) {
  if (!root) return null;

  const svg     = root.querySelector('.fan__svg');
  const gBlades = root.querySelector('[data-fan-blades]');
  const legend  = root.querySelector('[data-fan-legend]');
  if (!gBlades || !legend) return null;

  const NS = 'http://www.w3.org/2000/svg';
  const clipId = 'fan-clip';

  // Un seul disque en expansion révèle les cinq lames : chacune
  // s'arrête d'elle-même à sa propre longueur.
  const defs = document.createElementNS(NS, 'defs');
  const clip = document.createElementNS(NS, 'clipPath');
  clip.setAttribute('id', clipId);
  const disc = document.createElementNS(NS, 'circle');
  disc.setAttribute('cx', OX);
  disc.setAttribute('cy', OY);
  disc.setAttribute('r', LEN + 60);       // état par défaut : tout est visible
  clip.appendChild(disc);
  defs.appendChild(clip);
  svg.insertBefore(defs, svg.firstChild);

  METRICS.forEach((m, i) => {
    const deg = A0 + ((A1 - A0) * i) / (METRICS.length - 1);

    const track = document.createElementNS(NS, 'path');
    track.setAttribute('d', bladePath(deg, LEN, W));
    track.setAttribute('class', 'fan__blade-track');
    gBlades.appendChild(track);

    const fill = document.createElementNS(NS, 'path');
    fill.setAttribute('d', bladePath(deg, fillLen(m.t)));
    fill.setAttribute('class', `fan__blade-fill${m.critical ? ' is-critical' : ''}`);
    fill.setAttribute('clip-path', `url(#${clipId})`);
    gBlades.appendChild(fill);

    const li = document.createElement('li');
    if (m.critical) li.classList.add('is-critical');
    li.innerHTML =
      `<span class="lg__k">${m.k}</span>` +
      `<span class="lg__v"><b data-count="${m.v}">${m.v}</b>${m.unit}</span>`;
    legend.appendChild(li);
  });

  // La main d'où tout part — un losange, comme la silhouette de l'acte II
  const hub = document.createElementNS(NS, 'path');
  const k = 13;
  hub.setAttribute('d', `M${OX},${OY - k} L${OX + k * 0.62},${OY} L${OX},${OY + k} L${OX - k * 0.62},${OY} Z`);
  hub.setAttribute('class', 'fan__hub');
  gBlades.appendChild(hub);

  /* Le viewBox est recalé sur l'emprise réelle des lames : dessiné dans un
     cadre fixe, l'éventail n'occuperait qu'un quart de la surface. */
  fitViewBox(svg, gBlades);

  return {
    disc,
    counters: [...legend.querySelectorAll('[data-count]')],
    /* Repli avant révélation — seulement si l'animation est réellement pilotée */
    arm() { disc.setAttribute('r', '0'); }
  };
}

function fitViewBox(svg, group, pad = 18) {
  let box;
  try { box = group.getBBox(); } catch { box = null; }
  if (!box || !box.width || !box.height) return;   // pas encore mis en page : on garde le cadre déclaré
  svg.setAttribute(
    'viewBox',
    `${(box.x - pad).toFixed(1)} ${(box.y - pad).toFixed(1)} ` +
    `${(box.width + pad * 2).toFixed(1)} ${(box.height + pad * 2).toFixed(1)}`
  );
}
