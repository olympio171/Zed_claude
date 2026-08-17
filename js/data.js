/* ═══════════════════════════════════════════════
   Données de champion — Data Dragon 16.16.1 (fr_FR)
   Textes et noms de skins relevés depuis l'API, non inventés.
   ═══════════════════════════════════════════════ */

export const DDRAGON = '16.16.1';
const SPLASH = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_';

/* ── Acte II : les quatre visages ──
   Attention : les emplacements réels sont Q = Shuriken-rasoir,
   E = Taillade des ombres. (Le brief les avait intervertis.) */
export const ABILITIES = [
  {
    key: 'Q',
    slug: 'q',
    name: 'Shuriken-rasoir',
    desc: 'Zed et ses ombres lancent leurs shurikens. Chaque shuriken blesse tous les ennemis touchés.',
    meta: [
      { k: 'Portée', v: '900' },
      { k: 'Recharge', v: '6 s' },
      { k: 'Énergie', v: '75 → 55' }
    ],
    prompt: 'Cliquez n\'importe où pour lancer'
  },
  {
    key: 'W',
    slug: 'w',
    name: 'Ombre vivante',
    desc: 'L\'ombre de Zed fonce vers l\'avant et reste sur place quelques secondes. Une seconde activation échange leurs positions.',
    meta: [
      { k: 'Portée', v: '650' },
      { k: 'Recharge', v: '20 → 16 s' },
      { k: 'Énergie', v: '40 → 20' }
    ],
    prompt: 'Cliquez pour projeter, cliquez encore pour échanger'
  },
  {
    key: 'E',
    slug: 'e',
    name: 'Taillade des ombres',
    desc: 'Zed et ses ombres donnent un coup de taille. Les ennemis touchés par la taillade d\'une ombre sont ralentis.',
    meta: [
      { k: 'Rayon', v: '290' },
      { k: 'Recharge', v: '5 → 3 s' },
      { k: 'Énergie', v: '40' }
    ],
    prompt: 'Cliquez pour taillader'
  },
  {
    key: 'R',
    slug: 'r',
    name: 'Marque de la mort',
    desc: 'Zed devient impossible à cibler et fonce sur un champion pour le marquer. Au bout de 3 secondes, la marque explose et inflige de nouveau un pourcentage de tous les dégâts subis.',
    meta: [
      { k: 'Portée', v: '625' },
      { k: 'Recharge', v: '120 → 100 s' },
      { k: 'Coût', v: 'Aucun' }
    ],
    prompt: 'Marquez la cible — puis comptez jusqu\'à trois'
  }
];

/* ── Acte III : relevé manuel ──
   Data Dragon ne fournit ni winrate, ni pick rate, ni tier.
   Ces cinq nombres sont saisis à la main. Patch 16.16, Émeraude+, voie du milieu.
   `t` est la position normalisée sur la lame (0 → 1), pas la valeur brute :
   chaque mesure a son propre domaine utile. */
export const METRICS = [
  { k: 'Taux de victoire',     v: '52',    unit: '%',    t: (52 - 45) / 11 },
  { k: 'Taux de sélection',    v: '9',     unit: '%',    t: 9 / 20 },
  { k: 'Taux de bannissement', v: '24',    unit: '%',    t: 24 / 40, critical: true },
  { k: 'Palier',               v: 'S',     unit: '',     t: 1 },
  { k: 'Rang mid',             v: '4',     unit: '/102', t: (102 - 4) / 101 }
];

export const METRICS_SOURCE = 'Patch 16.16 · Émeraude+ · relevé manuel';

/* ── Acte IV : neuf cimaises ──
   `num` = index de skin Data Dragon. Les chromas sont écartés :
   une exposition n'accroche pas six fois la même toile en six teintes. */
export const SKINS = [
  { num: 0,  name: 'Zed',                     note: 'L\'original. Aucun artifice — seulement l\'homme et ce qu\'il a laissé entrer.' },
  { num: 1,  name: 'Zed électrolame',         note: 'Première dissidence chromatique. La lame devient signal.' },
  { num: 3,  name: 'PROJET : Zed',            note: 'Le corps remplacé pièce par pièce. Reste-t-il une ombre à projeter ?' },
  { num: 11, name: 'Zed thanatophore',        note: 'Il ne porte plus la mort : il la transporte.' },
  { num: 13, name: 'Zed fléau galactique',    note: 'À cette échelle, le silence n\'est plus une métaphore.' },
  { num: 15, name: 'Zed psychoguerrier',      note: 'L\'ombre déplacée dans le réseau. La latence devient une arme.' },
  { num: 38, name: 'Zed empyréen',            note: 'Encre et néon dans le même geste.' },
  { num: 49, name: 'Zed du Voyage immortel',  note: 'Le maître revient là où l\'Ordre a commencé.' },
  { num: 58, name: 'Zed lune de sang',        note: 'Le masque cesse d\'être un masque.' }
];

export const splashURL = (num) => `${SPLASH}${num}.jpg`;
