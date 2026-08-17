/* ═══════════════════════════════════════════════
   Acte IV — Exposition.
   Une cimaise par skin. Grand format, cartel discret,
   aucune vignette, aucune flèche.
   ═══════════════════════════════════════════════ */

import { SKINS, splashURL } from './data.js';

export function initGallery(track) {
  if (!track) return [];

  const plates = SKINS.map((s, i) => {
    const fig = document.createElement('figure');
    fig.className = 'expo__plate plate';

    const no = String(i + 1).padStart(2, '0');
    fig.innerHTML = `
      <div class="plate__frame">
        <img src="${splashURL(s.num)}"
             alt="Illustration du skin ${s.name}"
             loading="lazy" decoding="async"
             width="1215" height="717">
      </div>
      <figcaption class="plate__cartel">
        <span class="plate__no">N° ${no}</span>
        <h3 class="plate__name glitch"><span class="echo" data-echo="${s.name}">${s.name}</span></h3>
        <p class="plate__note">${s.note}</p>
      </figcaption>`;

    // La première toile est vue tout de suite : elle ne se charge pas paresseusement
    if (i === 0) {
      const img = fig.querySelector('img');
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }

    track.appendChild(fig);
    return fig;
  });

  return plates;
}
