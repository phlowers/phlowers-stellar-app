# Constantes des dessins Plotly

`PlotlyDrawings` (`src/app/shared/constants/plotly-drawings.constantes.ts`) est la **source unique** de
tout ce qui est statique dans les tracés Plotly : couleurs, icônes FontAwesome, glyphes, symboles de marqueurs,
tailles, épaisseurs et styles de ligne, opacités et décalages en pixels.

L'objectif est de pouvoir modifier l'apparence des tracés de l'application à un seul endroit, et qu'aucun helper de
tracé ne contienne de `'#2563eb'` ou de `size: 14` codés en dur.

---

## Ce que c'est

Un unique objet `as const`, regroupé par **objet dessiné** (`span`, `support`, `insulator`, `loadPunctual`,
`cableModification`, `cutStrands`, `obstacle`, `floor`, `distance`, `freePositioning`, `conformity`, `supportPlot`,
…), plus un groupe `plot` pour ce que tous les tracés partagent (police, arrière-plans, grille).

```typescript
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';

const trace = {
  line: {
    color: PlotlyDrawings.distance.color,
    width: PlotlyDrawings.distance.lineWidth[view]
  }
};
```

Lisez-le directement là où il est nécessaire. Ne le ré-exportez pas via un fichier `*.constantes.ts` intermédiaire.

---

## Conventions

- **Tailles par vue** : une taille ou une épaisseur dessinée dans le tracé de la section est donnée pour chaque vue,
  `{ '2d': …, '3d': … }`, et lue avec `[view]`. Un tracé qui n'existe que dans une seule vue (positionnement libre et
  conformité : 2D, tracé des supports : 3D) utilise de simples nombres.
- **Apparences de sélection** : un dessin dont l'apparence change avec la sélection déclare `unselected` et
  `selected`. Un objet composé de plusieurs points (obstacle, sol) déclare également `inactivePoint`, l'apparence des
  autres points de l'objet sélectionné. Les icônes (charges, modification de câble, brins coupés) ne déclarent que
  `unselected`.
- **Des pixels, pas des unités de données** : les décalages tels que `arrowYOffset` ou `cutStrands.offsetY` sont en
  pixels, afin que l'écart reste identique quel que soit le niveau de zoom.
- **Commenter le pourquoi** : lorsqu'une valeur semble arbitraire (un écart de 40 px entre deux icônes, une opacité
  utilisée à la place d'un alpha), un court commentaire à côté explique la contrainte.

---

## Ajouter ou modifier un dessin

1. **Changer une apparence** : modifiez la valeur dans `PlotlyDrawings`. Rien d'autre ne devrait avoir besoin de
   changer.
2. **Dessiner un nouvel objet** : ajoutez un groupe nommé d'après l'objet, en suivant les conventions ci-dessus, puis
   lisez-le depuis le helper qui construit la trace ou l'annotation.
3. **Besoin d'une valeur calculée** (par ex. `getCutStrandsLineLength`, dérivée de la taille de l'icône et de sa marge interne / padding) : gardez les nombres bruts dans `PlotlyDrawings` et placez le calcul dans une fonction qui les lit. Ne
   copiez pas les nombres.
4. **Tests** : vérifiez par rapport à `PlotlyDrawings` plutôt que de répéter ses valeurs, afin qu'un changement de
   style ne casse pas les specs.

---

## Pièges

- **Transparence 3D** : `scatter3d` délave les couleurs `rgba()`. Dans la vue 3D, utilisez une couleur opaque et
  l'`opacity` de la trace, et ne combinez jamais les deux. Voir `createShadowDataObject` pour la portée fantôme.
- **Police** : `plot.fontFamily` est partagée par tous les textes. Les icônes FontAwesome sont les seules à surcharger
  la famille (`clickableIconAnnotation.fontFamily`). Le layout de base qui l'applique est `getPlotlyBaseLayout()`
  (`src/app/shared/constants/plotly-base-layout.constantes.ts`) ; exposez le en premier dans chaque layout de tracé.
- **Les layouts sont mutables** : Plotly modifie en place l'objet layout qu'on lui donne. Si deux tracés partagent un
  objet imbriqué (`font`, `xaxis`…), modifier l'un modifie l'autre. Construisez toujours le layout avec
  `getPlotlyBaseLayout()`, qui renvoie de nouveaux objets à chaque appel, plutôt que d'étaler une constante partagée
  (un spread ne copie que le premier niveau).
- **Pas ici** : les couleurs des zones de règles de conformité proviennent de la configuration json du catalogue, et
  non de `PlotlyDrawings`.
