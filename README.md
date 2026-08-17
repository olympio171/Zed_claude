# ZED — L'Art du Silence

Installation numérique en scroll autour de Zed. Six actes, pas de barre de navigation,
pas de hero classique. HTML/CSS/JS vanilla, sans étape de build.

```bash
python -m http.server 5173
```

Puis http://localhost:5173. N'importe quel serveur statique convient (Netlify, Vercel,
`npx serve`). Aucune dépendance à installer, aucune clé d'API.

---

## Structure

```
index.html          Les six actes, filtres SVG d'encre, curseur, HUD
css/style.css       Toute la direction artistique (jetons, actes, mouvement réduit)
js/
  core.js           Préférences, maths, Stage canvas (DPR + pause hors-écran), particules
  data.js           Données Data Dragon 16.16.1 + les 5 chiffres du relevé
  main.js           Orchestration GSAP/ScrollTrigger, replis sans animation
  cursor.js         Curseur-ombre à ressort, dédoublement, Marque de la mort cachée
  opening.js        Acte 0 — le shuriken qui ouvre l'écran
  abilities.js      Acte II — les quatre scènes jouables
  fan.js            Acte III — l'éventail de lames
  gallery.js        Acte IV — les neuf cimaises
  audio.js          Souffle de shuriken synthétisé (aucun fichier son)
```

## Les six actes

| Acte | Scène | Interaction |
|---|---|---|
| 0 | Ouverture | Un shuriken traverse le noir ; là où il passe, le titre s'ouvre |
| I | Genèse | Le lore se révèle comme de l'encre qui se répand (masque radial + turbulence SVG) |
| II | Les quatre visages | Q/W/E/R, chacune une scène canvas jouable |
| III | Relevé | Cinq lames en éventail, cinq chiffres |
| IV | Exposition | Neuf cimaises parcourues à l'horizontale |
| V | Silence | Reste immobile trois secondes |

**Acte II — ce qu'on peut faire :**
- **Q** — cliquer n'importe où : Zed et ses deux ombres lancent, les shurikens traversent
- **W** — un clic projette l'ombre, un second échange les positions ; le curseur est le clone
- **E** — la taillade part de Zed *et* de son ombre ; seule l'ombre ralentit
- **R** — marquer la cible, puis compter jusqu'à trois

Chaque scène se démontre seule après ~4 s sans interaction.

**Acte V — l'easter egg :** trois secondes sans bouger la souris posent la Marque de la
mort sur le curseur, avec son propre compte à rebours de trois secondes. Bouger l'annule
— il faut vraiment rester immobile pour mourir. Une fois découverte, elle peut se
redéclencher ailleurs sur la page, avec 45 s de délai entre deux.

---

## Deux écarts par rapport au brief

**1. Les emplacements Q et E étaient intervertis.** Le brief annonçait
« Q Shuriken, W Living Shadow, E Razor Shuriken, R Death Mark ». Le kit réel, vérifié
sur Data Dragon, est **Q = Shuriken-rasoir**, **W = Ombre vivante**,
**E = Taillade des ombres**, **R = Marque de la mort**. Le site utilise le kit réel.

**2. WebP/AVIF et Data Dragon sont incompatibles.** Le brief demande les deux :
sourcer les illustrations depuis Data Dragon *et* servir du WebP/AVIF. Data Dragon ne
sert que du JPEG. Choix retenu : garder Data Dragon (comme spécifié), avec chargement
paresseux — les neuf splashs ne pèsent sur la page que lorsqu'on entre dans l'exposition.
Pour descendre plus bas, il faudrait télécharger et convertir les images à la
construction, ce qui ajoute une étape de build et stocke des visuels Riot dans le dépôt.

---

## Poids

| | |
|---|---|
| Chargement initial | **280 Ko** (polices 186, GSAP 46, source 48) |
| Les 9 splashs, en différé | ~1,5 Mo |
| Total, exposition comprise | **~1,8 Mo** — sous la cible de 2 Mo |

## Accessibilité

- **Contraste** : les 19 styles de texte passent WCAG AA, minimum mesuré 4,67:1.
  Le gris acier `#3A3A42` du brief ne donne que **1,76:1** sur `#0A0A0C` — inutilisable
  pour du texte. Il est conservé pour les aplats et les lames dormantes, et un ton
  `--muted #8A8A93` (5,8:1) porte les petites capitales.
- **`prefers-reduced-motion`** : désactive parallax, glitch, curseur-ombre, coupes de
  lame et grain ; retire les scènes canvas (le texte porte déjà tout le sens) ; la
  galerie redevient une zone à défilement horizontal natif.
- **Clavier** : neuf cibles tabulables, anneau de focus violet, lien d'évitement.
  Le curseur natif revient dès la première tabulation.
- **Sans GSAP** : si le CDN tombe, le contenu reste entièrement visible. L'état
  « caché avant révélation » n'est armé qu'une fois GSAP confirmé chargé.
- **Son** : silence au chargement, aucun `AudioContext` créé avant un clic explicite.

## Notes techniques

- `html { overflow-x: clip }` et **non** `hidden` : `hidden` ferait de `<html>` un
  conteneur de défilement, ce qui corrompt les mesures d'épinglage de ScrollTrigger
  (la galerie se calait à une position de départ négative).
- Les titres portent un `padding-top` en `em` : l'interlignage serré (0,84) fait
  déborder les capitales accentuées — sans cette réserve, la coupe diagonale rogne
  l'accent de GENÈSE et RELEVÉ.
- Chaque scène canvas s'arrête quand elle sort de l'écran (`IntersectionObserver`) ;
  aucune frame n'est consommée hors champ. `devicePixelRatio` est plafonné à 2.
- Le `viewBox` de l'éventail est recalé sur l'emprise réelle des lames après
  construction, sinon la figure n'occupe qu'un quart de son cadre.

## Mettre à jour les données

- **Champion** (lore, capacités, skins) : `js/data.js`, relevé sur Data Dragon `16.16.1`.
  Versions disponibles : https://ddragon.leagueoflegends.com/api/versions.json
- **Les cinq chiffres** : `METRICS` dans `js/data.js`. Data Dragon ne fournit ni
  winrate, ni pick rate, ni palier — ces valeurs sont saisies à la main, sans appel
  d'API tiers. Le champ `t` est la position sur la lame (0 → 1), pas la valeur brute :
  chaque mesure a son propre domaine utile. Penser à mettre à jour la légende de patch
  dans `index.html` (acte III) en même temps.

---

Installation non officielle, à but non commercial. Zed, ses illustrations et son univers
appartiennent à Riot Games.
