# Positionnement libre — conception technique

Compagnon technique de la page utilisateur {doc}`positionnement libre
<../../user_guide/plot/free-positioning>`. Il documente la manière dont le
comportement du positionnement libre (fp) est implémenté, afin que les deux
documents restent synchronisés lorsque les exigences évoluent.

## Architecture des composants

Le positionnement libre repose sur **un composant de graphique centralisé et quatre
fines enveloppes (wrappers)**, une par onglet concerné :

- `FreePositioningPlotComponent` — le graphique partagé et centralisé utilisé par
  chaque onglet. Il porte la logique de rendu et d'interaction du graphique.
- Quatre wrappers qui adaptent le graphique partagé au contexte de leur onglet :
  - `ObstacleFreePositioningComponent`
  - `FloorFreePositioningComponent`
  - `LoadsFreePositioningComponent`
  - `DistanceFreePositioningComponent`

Les wrappers sont rendus depuis
`studio-page.component.html` à l'intérieur du `@switch` de positionnement libre, un
`@case` par `freePositioningSource` (`obstacle`, `floor`, `loads`, `distance`), avec
un `@default` qui retombe sur `<app-studio>`.

### Réactivité des données de points

Chaque wrapper expose ses points de graphique comme un `computed` :

```ts
readonly points = computed(() => this.dataService.getPoints(this.frozenSpan(), '<category>'));
```

Un `computed` n'est réévalué que lorsqu'un **signal qu'il lit** change. Dans
`FreePositioningDataService.buildAggregateParams`, les entrées doivent donc
provenir d'un état adossé à des signaux — et non de valeurs brutes de formulaire
Angular telles que `form.get('positions').value`, `group.value` ou `form.value`.
Ce sont de simples objets/tableaux : mettre à jour le formulaire ne notifie donc
pas le `computed` que son entrée a changé, et les marqueurs restent obsolètes après
un clic de positionnement libre. Concrètement :

- Distance lit `distanceMeasuringService.positions()` (un `toSignal` des
  changements de valeur du formulaire).
- Obstacle lit `obstacleFormService.positionsSnapshot()` (un `toSignal` du
  `FormArray` de positions), **et non** `form.get('positions').value`.
- Sol lit `floorFormService.pointsView()` (un `computed` adossé à l'instantané
  réactif des points), **et non** le `FormArray.value` brut. Il lit également
  `floorFormService.referenceSupportValue()` (un `toSignal` du contrôle de support
  de référence) afin que basculer le support de référence redessine les marqueurs
  de sol en miroir — voir *Mise en miroir du support de référence* ci-dessous.

Cela garantit un comportement identique sur tous les onglets : cliquer sur le
graphique de gauche (x·z / profil) remplit et affiche la position le long de la
portée et l'altitude d'un point, et cliquer sur le graphique de droite (y·z /
face) remplit sa coordonnée latérale.

### Réactivité des champs de formulaire (templates `OnPush`)

Lire un signal dans `FreePositioningDataService` suffit à rafraîchir les
*marqueurs du graphique*, mais les champs de formulaire de chaque onglet forment un
arbre de composants `OnPush` distinct, avec ses propres exigences de réactivité.
Les champs de point de `ObstaclesFormComponent` sont liés avec `[value]="..."`
(et non `formControlName`) pour gérer les états de saisie intermédiaires tels
qu'un `-` isolé — voir `onPositionInput` / `onPositionBlur`. Une liaison `[value]`
n'est redessinée que lorsqu'Angular revérifie le composant, et un composant
`OnPush` n'est revérifié que lorsqu'il lit un **signal** qui a changé (ou reçoit
un événement/`@Input`). Un clic de positionnement libre appelle
`positionGroup.patchValue(...)`, ce qui ne modifie aucun signal lu par le template
de `ObstaclesFormComponent` : le champ restait donc obsolète jusqu'à un nouveau
rendu sans rapport (par exemple la sélection d'un autre point).

La correction : lier les champs de point au signal réactif
`obstacleFormService.positionsSnapshot()` au lieu du `.value` brut du FormArray :

```html
[value]="obstacleFormService.positionsSnapshot()[$index]?.z"
```

Lire ce signal dans le template amène `ObstaclesFormComponent` à se marquer comme
modifié dès qu'une position change, ce qui rafraîchit les champs immédiatement
après un clic de positionnement libre — sans toucher à la gestion des états de
saisie `[value]` + `onPositionInput` / `onPositionBlur`. L'onglet distance n'a
jamais eu ce problème car il lie `[formControl]`, dont le `ControlValueAccessor`
écrit directement dans le DOM lors du `patchValue`, indépendamment de la détection
de changements.

### Mise en miroir du support de référence

L'axe des x du graphique est toujours mesuré depuis le **support gauche** de la
portée figée (`litData` y est remis à zéro), tandis que les points de sol et les
positions de charge sont enregistrés **relativement à leur support de référence**,
qui peut être GAUCHE ou DROIT. Les deux repères sont reliés par une fonction pure
partagée dans `free-positioning-data.helpers.ts`, qui généralise la conversion que
l'onglet charges appliquait déjà en ligne dans `LoadFormsService.setLoadPosition` :

```ts
export const mirrorPositionForReferenceSupport = (
  position: number,
  spanLength: number | null | undefined,
  referenceSupport: 'LEFT' | 'RIGHT' | null | undefined
): number =>
  referenceSupport === 'RIGHT' && typeof spanLength === 'number' && !Number.isNaN(spanLength)
    ? spanLength - position
    : position;
```

La conversion est **involutive** (sa propre réciproque), donc la même fonction sert
dans les deux sens :

- **Affichage (formulaire → graphique)** — `buildFloorPoints` met en miroir
  `distanceToRefSupport` vers l'abscisse du graphique : les points actifs du
  formulaire utilisent le `floorReferenceSupport` du formulaire (transmis via
  `AggregatePointsParams` depuis le `floorFormService.referenceSupportValue()`
  adossé à un signal), les points des sols enregistrés utilisent le
  `referenceSupport` propre au sol stocké. Basculer le sélecteur de support de
  référence redessine donc les marqueurs sur place au lieu de les faire sauter.
- **Placement (clic sur le graphique → formulaire)** —
  `FloorFreePositioningComponent.onPlacement` met en miroir l'abscisse cliquée
  (mesurée depuis la gauche) pour la ramener à la `distanceToRefSupport` relative
  au support de référence (longueur de portée prise dans
  `floorFormService.spanSupports().spanLength`) avant d'appeler
  `setFreePointPosition`, exactement comme le fait l'onglet charges dans
  `LoadFormsService.setLoadPosition`.

La longueur de portée provient du champ `spanLength` du support gauche
(`supports[frozenSpan].spanLength`), et non de `litData`, donc la mise en miroir
fonctionne même avant que le moindre résultat du worker ne soit disponible.

## La portée figée

La portée figée est une source de vérité unique détenue par `PlotOptionsService` :

```ts
readonly frozenSpan = signal<number>(0);
```

- Elle est **capturée une fois** lorsque le mode fp est activé, dans
  `setFreePositioningMode(enabled, source, spanIndex?)` :

  ```ts
  if (enabled) {
    const snapshot = spanIndex ?? untracked(() => this.plotOptions().startSupport);
    this.frozenSpan.set(snapshot);
  }
  ```

  L'onglet propriétaire transmet l'indice de portée actuellement sélectionné dans
  sa liste déroulante (`spanIndex`) ; le `startSupport` du graphique ne sert que de
  repli. C'est important car sélectionner une portée dans la liste déroulante d'un
  onglet ne déplace **pas** le graphique (seul le bouton de zoom écrit
  `startSupport`) : figer `startSupport` capturerait donc une portée obsolète.
  L'utilisation d'`untracked` garantit que la capture est un instantané ponctuel,
  sans dépendance réactive sur `plotOptions()`.

  Capturer la portée figée ne suffit pas à elle seule : les coordonnées x du
  graphique proviennent de `litData`, que Python remet à zéro au **support gauche
  de la plage projetée** dans `refreshProjection()`. Si le mode fp est activé alors
  que le studio est projeté sur une autre portée, `litData` conserve l'ancienne
  origine des x et le support gauche de la portée figée (le *support de référence*)
  est dessiné à une abscisse non nulle. Pour l'éviter,
  `FreePositioningToggleComponent.onChange` active le mode — ce qui capture la vue
  et la caméra courantes (voir *Restauration de la vue et de la caméra* plus bas) —
  puis **reprojette** sur la portée figée :

  ```ts
  if (enabled) {
    this.plotOptionsService.setFreePositioningMode(true, this.source(), this.spanIndex());
    const span = this.spanIndex() ?? this.plotOptionsService.plotOptions().startSupport;
    this.plotService.plotOptionsChange({ view: '2d', startSupport: span, endSupport: span + 1 });
    return;
  }
  ```

  Le mode est activé **d'abord** afin que `setFreePositioningMode` capture la vue
  et la caméra d'avant fp avant que la reprojection 2D ne les écrase.
  `plotService.plotOptionsChange` force une vue 2D mono-portée **et** déclenche
  `refreshProjection()`, de sorte que `litData` est recalculé avec le support
  gauche de la portée figée en `x = 0`. La reprojection réside dans le toggle (et
  non dans `PlotOptionsService`) car elle a besoin de `PlotService`, ce qui serait
  une dépendance circulaire à l'intérieur de `PlotOptionsService`.

- Elle est remise à `0` dans `reset()`.
- Chaque wrapper la lit directement, **sans réactivité** propre :

  ```ts
  readonly frozenSpan = this.plotOptionsService.frozenSpan;
  ```

`LoadFormsService.getActiveSpanIndex()` retourne également
`this.plotOptionsService.frozenSpan()` au lieu de résoudre la portée depuis les
champs de formulaire de l'onglet.

### Restauration de la vue et de la caméra

Entrer en mode fp force une vue 2D mono-portée, en écartant la vue qu'avait
l'utilisateur. Pour la lui rendre à la sortie,
`PlotOptionsService.setFreePositioningMode(true, ...)` capture l'état courant dans
le signal `freePositioningSavedView` **avant** que le toggle ne force la
reprojection :

- `plotOptions` — une copie superficielle de l'objet d'options complet (vue, côté,
  fenêtre de supports, inversion) ;
- `camera` — la caméra 3D active lue depuis le DOM Plotly via `getCamera()`
  (`null` lorsque la vue précédente n'avait pas de scène 3D).

La restauration est appliquée par un unique effet générique dans `PlotService` —
non par onglet — afin qu'elle se déclenche quel que soit le contrôle qui a
désactivé le mode (toggle, changement d'onglet, `ngOnDestroy` d'un wrapper, effet
de sortie automatique) : lorsque `isFreePositioningMode()` vaut `false` alors
qu'un instantané existe, l'effet efface l'instantané, stocke la caméra dans
`pendingCameraRestore` (consommée par `SectionPlotComponent` après le premier
rendu 3D, comme la restauration au retour arrière), et appelle
`plotService.plotOptionsChange({ ...savedView.plotOptions })`, ce qui rafraîchit
également la projection pour que `litData` corresponde à la fenêtre de supports
restaurée. L'effet réside dans `PlotService` car restaurer la fenêtre de supports
nécessite `refreshProjection()`, que `PlotOptionsService` ne peut pas atteindre
(dépendance circulaire). `PlotOptionsService.reset()` efface l'instantané afin que
quitter le studio ne restaure jamais une vue obsolète.

### Machinerie réactive supprimée

L'implémentation précédente résolvait la portée de manière réactive à partir des
champs de formulaire de chaque onglet et la réécrivait via un effet. Cela a été
supprimé :

- La fonction utilitaire `resolveFrozenSpan` (dans
  `free-positioning-data.helpers.ts`) a été supprimée.
- La méthode `syncFrozenSpan(span)` de `PlotOptionsService` a été supprimée.
- Les wrappers n'injectent plus `PlotSpanService` et n'utilisent plus `effect` /
  `toSignal` pour dériver la portée figée.

## Figer les contrôles

Tous les contrôles susceptibles de changer la portée sont désactivés pendant que le
mode fp est actif, pilotés par `plotOptionsService.isFreePositioningMode()` :

- Boutons de zoom : `[disabled]="... || plotOptionsService.isFreePositioningMode()"`.
- Sélecteurs de portée par onglet :
  `[disabled]="plotOptionsService.isFreePositioningMode()"`
  dans `floor.component.html`, `obstaclesForm.component.html`,
  `distance-measuring.component.html`, `load-marking.component.html`.
- La navigation globale entre portées, le sélecteur de nombre de portées et le
  curseur (studio-page), ainsi que le sélecteur 3D/2D, le sélecteur profil/face et
  l'interrupteur d'inversion (top-toolbar) étaient déjà liés à
  `isFreePositioningMode()`.

De plus, `ObstacleFreePositioningComponent` désactive et force trois contrôles du
formulaire d'obstacle aux valeurs FP standardisées dans son constructeur :

- `referenceSupport` → `LEFT`
- `altitudeType` → `absolute`
- `lateralDistanceType` → `SPAN_AXIS`

Comme il n'existe aucune transformation de coordonnées entre ces repères, le
constructeur **compare d'abord les valeurs actuelles du formulaire au repère
forcé**. En cas de divergence, il émet un avertissement via
`NotificationService.warning(...)` avec la clé transloco
`studio.obstacles-form.free-positioning-forced-frame-warning`
(exportée sous `OBSTACLE_FP_FORCED_FRAME_WARNING_KEY` depuis
`obstacle-free-positioning.component.constantes.ts`), indiquant à l'utilisateur que
les coordonnées existantes peuvent être mal interprétées. L'avertissement est
purement informatif : les valeurs sont malgré tout forcées et verrouillées, et les
coordonnées des points existants sont réinterprétées — non converties — dans le
nouveau repère.

Lors de l'enregistrement, `ObstacleFormService.buildObstacleFromForm()` utilise
`form.getRawValue()` au lieu de `form.value` afin d'inclure ces contrôles
désactivés : l'obstacle est ainsi enregistré avec les valeurs forcées par le mode
FP intactes (et non omises par `form.value`, qui exclut les contrôles désactivés).
Cela garantit que l'obstacle enregistré possède des métadonnées valides pour la
transformation de coordonnées du worker Python.

Les composants qui ont gagné cette liaison (`distance-measuring`, `load-marking`)
injectent désormais `PlotOptionsService` comme champ public en lecture seule pour
l'accès depuis le template.

## Activer le toggle

L'entrée `[disabled]` de `app-free-positioning-toggle` contrôle quand le mode fp
peut être activé :

- Charges / distance : désactivé tant qu'aucune portée n'est sélectionnée
  (`!spanSelectValue()` / `!service.selectedSupportUuid()`).
- Sol / obstacle : exige en plus au moins un point, via un computed
  `hasEditablePoints` sur le service de formulaire de l'onglet
  (`!spanValue() || !hasEditablePoints()` pour le sol, et
  `!supportUuid || !hasEditablePoints()` pour l'obstacle). `ObstacleFormService`
  expose `hasEditablePoints = computed(() => positionsSnapshot().length > 0)`,
  à l'image de `FloorFormService`.

Le toggle porte également une entrée `[spanIndex]` : chaque onglet lie un computed
`selectedSpanIndex` qui fait correspondre l'UUID de la portée sélectionnée à un
indice via `PlotSpanService.getSupportIndex` (`null` lorsque rien n'est
sélectionné). Le toggle le transmet à `setFreePositioningMode`, de sorte que la
portée figée est exactement la portée sélectionnée dans l'onglet, et non la
dernière portée zoomée du graphique. Distance expose ce computed sur
`DistanceMeasuringService` ; les autres onglets l'exposent sur leur composant.

Comme le toggle est désactivé tant que `!hasEditablePoints()`, supprimer le dernier
point pendant que le mode fp est actif enfermerait l'utilisateur dans le mode :
l'interrupteur est le seul moyen de sortie depuis l'onglet, et il est désactivé.
Pour l'éviter, `FloorComponent` et `ObstaclesFormComponent` portent tous deux un
effet de sortie automatique qui désactive le mode lorsque le `hasEditablePoints()`
de l'onglet passe à `false` alors que cet onglet détient la session :

```ts
private readonly clearFreePositioningWhenNoPointsEffect = effect(() => {
  const hasEditablePoints = this.<tab>FormService.hasEditablePoints();
  const source = this.plotOptionsService.freePositioningSource();
  if (!hasEditablePoints && source === '<tab>') {
    untracked(() => this.plotOptionsService.setFreePositioningMode(false, '<tab>'));
  }
});
```

La vérification de `freePositioningSource()` garantit que l'effet ne perturbe
jamais une session détenue par un autre onglet (par exemple, l'onglet obstacle
supprimant son dernier point pendant que le mode fp du sol est actif le laisse
intact).
