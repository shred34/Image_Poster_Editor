# Affiche

Outil pour créer des fonds d'affiche en multipliant une ou plusieurs images carrées.
Ouvrir `index.html` dans un navigateur (double-clic, aucun serveur nécessaire).
L'outil « Passeport » (pages de sécurité) est dans le dossier voisin `passeport/`.

## Utilisation
1. Glisser une ou plusieurs images dans la fenêtre (ou cliquer sur la zone « Images », ou Cmd + V).
2. Choisir un preset, ou régler à la main : Affiche, Disposition, Tuiles, Image, Modulation.
3. « Exporter en JPG » (grand côté, qualité et dpi dans le dossier « Export »), ou PNG avec fond transparent.

Raccourcis : `R` nouveau seed, `H` hasard, `←` `→` précédent / suivant, `F` favori, `T` texte, `Espace` animation, `0` début de la boucle, `E` export.

Historique : chaque hasard, preset ou nouveau seed est mémorisé ; les flèches permettent de revenir en arrière et en avant (les réglages faits à la main sont conservés).
Favoris : « + Favori » garde la configuration (vignette dans la colonne de gauche). Ils restent dans le navigateur et sont inclus dans le JSON (« Réglages > Enregistrer »).

## Texte de l'affiche
Bloc « Texte de l'affiche » à gauche : case « Afficher le texte » (ou touche `T`). Au chargement, le texte « Image Poster Editor » est affiché.
- **Tout retaper** dans un seul champ : une ligne du champ = une ligne de l'affiche. Ligne vide = espace. Une heure en tête (`21:30 Nom`) aligne les horaires en colonne.
- **Chaque ligne se règle séparément** : cliquer dans une ligne du champ (ou ‹ ›) la sélectionne (repère pointillé dans l'aperçu), puis : alignement gauche / centre / droite, taille, décalage depuis le bord, espace avant, pleine largeur, repousser (l'espace libre passe avant elle : haut / bas), couleurs inversées, avec ou sans bloc, titre, masquée, graisse ; monter, descendre, ajouter, supprimer ; appliquer l'alignement à toutes les lignes.
- **Dispositions** (panneau « Texte de l'affiche ») : pile à gauche / à droite, centré, zigzag, escalier, diagonale, éclaté, haut et bas, infos à gauche + programme à droite, titre géant en haut, pleine largeur, colonne justifiée, incliné, vertical bord gauche / droit. Elles réécrivent le placement des lignes, qui reste ensuite modifiable ligne par ligne.
- **Ensemble** : position verticale (haut, milieu, bas, répartie), rotation, déplacement, marge.
- **Blocs** : un par ligne, un seul, contour ou aucun. « Pile la taille des lettres » ajuste chaque bloc à la mesure réelle des lettres ; marges ↔ et ↕ réglables jusqu'à zéro (ou négatives) pour serrer au maximum.
- **Typographie** : majuscules (par défaut), police, gras, taille, espacement des lettres, espace entre lignes, horaires en gras / en colonne. Styles tout prêts pour l'apparence.
- Le texte est inclus dans les favoris, l'historique, le JSON, l'export et l'animation. Presets et hasard ne le modifient pas.

## Animation
Dossier « Animation » du panneau, lecture / pause avec `Espace`, retour au début avec `0`.
- **Boucle** : durée (s) et « Boucle parfaite » — toutes les vitesses sont arrondies à un nombre entier de cycles sur la durée, la dernière image enchaîne sans saut sur la première.
- **Tuiles** : rotation continue, pulsation (taille), balancement, orbite, scintillement, défilement des images — avec vitesse et propagation (le mouvement part du centre comme une onde).
- **Ensemble** : rotation et respiration (zoom) de toute la composition, vortex et loupe oscillants.
- Les vagues (Modulation), le guilloché et le microtexte gardent leur propre vitesse.
- **Export de l'animation** : « Exporter l'animation (ZIP) » rend chaque image de la boucle (12 à 60 images / s, 1080 à 3840 px, JPG ou PNG transparent) et les range dans un dossier ZIP (`affiche_0001.jpg`, … + `infos.txt`), prêt pour After Effects, Premiere, DaVinci ou un GIF. Un second clic annule.
- Presets et hasard ne modifient pas les réglages d'animation.

Formats : ISO A / B, 50 × 70, 70 × 100, F4 suisse (89,5 × 128), carré, 4 : 5, 3 : 4, 2 : 3, 16 : 9, personnalisé.
Lignes fines : 2 calques de guilloché (rosette, ondes, rayons) et un microtexte, sous ou sur les tuiles.

## Structure
```
index.html          page
css/style.css       interface noir sur blanc + habillage de dat.gui
vendor/             dat.gui 0.7.9 (copie locale, fonctionne hors ligne)
js/utils.js         outils (aléa déterministe, copie, canvas)
js/params.js        valeurs par défaut, presets, hasard, ratio d'affiche
js/anim.js          animation : boucle parfaite, mouvements des tuiles, caméra
js/postertext.js    textes de l'affiche : dispositions, fonds, styles tout prêts
js/textpanel.js     saisie des textes (colonne de gauche)
js/images.js        chargement, recadrage carré, traitements, pyramide de tailles
js/layouts.js       générateurs de disposition + vagues / vortex / loupe
js/guilloche.js     guilloché, microtexte, encres
js/renderer.js      dessin (aperçu et export partagent le même code)
js/exporter.js      export JPG / PNG + dpi, export des images de l'animation en ZIP
js/gui.js           panneau de réglages dat.gui
js/library.js       panneau d'images (glisser-déposer, ordre)
js/history.js       historique précédent / suivant
js/colorpicker.js   nuancier de couleur ouvert au clic
js/favorites.js     liste de favoris (localStorage + JSON)
js/app.js           point d'entrée
```

## Ajouter une disposition
Dans `js/layouts.js`, ajouter une fonction `generators.monMode = function (P, aspect, out)`
qui fait `out.push(tile(x, y, taille, rotation, groupe, sousGroupe, cle))`,
puis déclarer ses paramètres dans `js/params.js` et ses réglages dans `js/gui.js`.
Les coordonnées sont en « largeur d'affiche = 1 ».
