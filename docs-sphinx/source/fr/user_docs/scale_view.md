---
orphan: true
---

# Composant Scale View

## Résumé

Ce document décrit le `ScaleViewComponent` situé dans la barre d'outils supérieure du Studio. Il contrôle la résolution du graphique via un curseur et un champ numérique, synchronise les deux contrôles, persiste et applique les changements de résolution via le `PlotService`, puis rafraîchit la projection du graphique. Ce fichier liste le comportement du composant, la surface d'API de `PlotService` impactée, des astuces de débogage et des tests suggérés pour les développeurs.

## Emplacement du composant

`src/app/features/studio/core/presentation/components/top-toolbar/scale-view/scale-view.component.ts`

## Objectif

- Fournir une interface en popover avec un curseur et un champ numérique pour modifier la résolution du graphique.
- Garder le curseur et le champ numérique synchronisés grâce aux `signal`/`effect` Angular et aux formulaires réactifs.
- Persister les changements de résolution et les appliquer au moteur de tracé, puis rafraîchir la projection.

## Comportements clés

- Contrôles
  - `sliderControl` (FormControl<number>) — curseur pour la résolution.
  - `pointsControl` (FormControl<number>) — champ numérique pour le nombre de points.
  - `formScaleView` — groupe de formulaire contenant `scale`, `sliderPointsCount`, `pointsCount`.

- Signaux / Effects
  - `sliderValue` et `pointsCountValue` sont créés avec `toSignal(...)` à partir de `valueChanges`.
  - Des effects synchronisent le curseur -> champ numérique et le champ numérique -> curseur ; ils appellent `PlotService.setResolution(...)` lorsque les changements proviennent de l'interface utilisateur.
  - Un effect maintient les deux contrôles synchronisés avec `PlotService.resolution()` lorsque le service modifie la résolution de manière externe.

- Flux de validation (`onValidate()`)
  1. Fermer le popover.
  2. Lire `resolution` depuis `pointsControl` et `scale` depuis le formulaire.
  3. Appeler `PlotService.setResolution(resolution)`.
  4. Attendre `PlotService.applyResolution(resolution)`.
  5. Déterminer les normes d'axes à partir de `scaleNormsMap` et appeler `PlotService.setAxesNorms(norms)`.
  6. Attendre `PlotService.refreshProjection()`.

## Normes d'échelle

Le composant définit `scaleNormsMap` :

- `plan` → `{ x: 0.2, y: 1, z: 1, aspectMode: 'manual' }`
- `geo` → `{ x: 1, y: 1, z: 1, aspectMode: 'manual' }`
- `celeste` → `{ x: 1, y: 1, z: 0.5, aspectMode: 'manual' }`
- `auto` → `{ x: 1, y: 1, z: 1, aspectMode: 'data' }`

## Service impacté : `PlotService`

Vérifiez que ces méthodes existent et se comportent comme attendu lors du débogage ou de l'écriture de tests :

- `maxResolution(): number`
  - Utilisé par le composant comme `scaleMax` pour borner la valeur du curseur. Cette valeur est initialisée à partir de la constante `RESOLUTION` du worker Python (100) via la tâche `getConfig`.
- `resolution(): number`
  - Retourne la résolution actuelle ; le composant lit cette valeur pour s'initialiser et rester synchronisé.
  - Lorsqu'elle est restaurée depuis le localStorage, la valeur est bornée à `MIN_RESOLUTION` (25). Une fois `maxResolution` chargée depuis le worker, la résolution est re-bornée si elle dépasse le maximum.
- `setResolution(value: number): void`
  - Persiste la résolution demandée (état local, stockage ou configuration du moteur).
  - Normalise en interne la valeur à l'aide de `normalizeResolution()` pour la borner entre `MIN_RESOLUTION` (25) et `maxResolution()`.
- `applyResolution(value: number): Promise<void>`
  - Applique la résolution au moteur de tracé. Le composant attend cet appel dans `onValidate()`.
- `setAxesNorms(norms: {x:number,y:number,z:number,aspectMode:string}): void`
  - Applique les préréglages de normalisation d'axes calculés à partir de `scaleNormsMap`.
- `refreshProjection(): Promise<void>`
  - Recalcule ou redessine la projection du graphique ; attendu par `onValidate()`.

## Bornes de résolution

- **Minimum** : 25 (imposé dans `PlotService.MIN_RESOLUTION` et `ScaleViewComponent.scaleMin`)
- **Maximum** : Chargé dynamiquement depuis la constante `RESOLUTION` du worker Python (par défaut : 100)
- **Défaut** : 100 (`DEFAULT_RESOLUTION` dans `PlotService`)
- Les valeurs stockées dans le localStorage sont bornées à ces limites au chargement et après l'initialisation du worker, afin d'éviter un état incohérent des contrôles.

## Guide de débogage

Lorsque les contrôles sont désynchronisés ou que le graphique ne se met pas à jour après un changement, suivez ces étapes :

1. Vérifiez `PlotService.resolution()` — si elle diffère des contrôles, inspectez la couche de persistance ou la séquence d'initialisation.
2. Assurez-vous que `sliderValue` et `pointsCountValue` reçoivent bien les événements `valueChanges`. Si `valueChanges` sont absents, vérifiez les usages de `emitEvent: false` ailleurs.
3. Confirmez que `setResolution(...)` est invoqué exactement une fois par changement utilisateur voulu. Le composant utilise `emitEvent: false` lors de la mise à jour programmatique du contrôle apparié pour éviter les cycles.
4. Inspectez `applyResolution(...)` et `refreshProjection()` pour détecter des erreurs ou des tâches longues. Ajoutez des logs temporaires pour détecter des rejets de promesses ou des délais.
5. Si les normes d'axes semblent incorrectes après validation, vérifiez la valeur `scale` du formulaire et le mapping `scaleNormsMap`.

## Tests unitaires suggérés

- Simulez (mock) `PlotService` et vérifiez les points suivants :
  - La synchronisation curseur -> champ numérique déclenche `setResolution` avec la nouvelle valeur.
  - La synchronisation champ numérique -> curseur déclenche `setResolution` avec la nouvelle valeur.
  - `onValidate()` appelle `applyResolution`, `setAxesNorms` avec les bonnes normes, puis `refreshProjection`.
  - Le composant met à jour les contrôles lorsque `PlotService.resolution()` change (l'effect les maintient synchronisés).

## Suggestions d'intégration / E2E

- Ouvrez le popover, changez la résolution via le curseur et le champ numérique, cliquez sur Valider, vérifiez que le graphique visible se met à jour en conséquence.

## Où chercher dans le code

- Composant : `src/app/features/studio/core/presentation/components/top-toolbar/scale-view/scale-view.component.ts`
- Service de tracé : recherchez `class PlotService` sous `src/app` pour trouver son implémentation ainsi que ses tests/mocks.

## Notes pour les relecteurs

- Le composant utilise des imports de composant standalone Angular et des composants PrimeNG.
- Les contrôles de formulaire sont créés avec `nonNullable: true` ; les tests doivent initialiser les valeurs numériques en conséquence.

---

Fin du document.
