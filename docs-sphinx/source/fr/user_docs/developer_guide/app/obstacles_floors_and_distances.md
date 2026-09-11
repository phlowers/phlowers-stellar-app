# Obstacles, sols et distances

Ce document décrit la gestion des obstacles et des sols, ainsi que le pipeline de calcul des distances, à destination des développeurs.

Les obstacles représentent des objets physiques situés à proximité des lignes électriques (bâtiments, arbres, etc.) dont les distances de dégagement doivent être calculées et visualisées. Les **sols** — les profils de terrain relevés sous une portée — empruntent le même pipeline : ils sont enregistrés dans le moteur comme des obstacles d'un type dédié, ce qui leur permet de réutiliser son calcul de distance au câble au lieu de le dupliquer. Le système couvre l'intégralité du pipeline : de la saisie utilisateur, en passant par le calcul Python, jusqu'au rendu interactif Plotly.

---

## Vue d'ensemble de l'architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Couche présentation                                                         │
│                                                                              │
│  ObstaclesFormComponent   FloorComponent   QuickMeasuresComponent            │
│  (studio/obstacles/)      (studio/floor/)  (studio/core/…/quick-measures/)    │
│          │                      │                  │                         │
│          │                      │                  │     SectionPlotComponent│
│          │                      │                  │     (shared/…/section/) │
└──────────┼──────────────────────┼──────────────────┼──────────┼──────────────┘
           │                      │                  │          │
┌──────────▼──────────────────────▼──────────────────▼──────────▼──────────────┐
│  Couche services                                                             │
│                                                                              │
│  ObstacleFormService    FloorFormService     ObstaclesService                 │
│  (obstacles-form/)      (floor-form/)        (obstacles/) signaux de sélection│
│          │                     │                                             │
│          └──────────┬──────────┘                                             │
│                     ▼                                                        │
│          ObstacleStateService  ──────────►  PlotService                       │
│          (obstacle-state/)                  (plot/)                           │
│          appels au registre du worker,      litData, refreshProjection(),      │
│          distances, distanceType            diagnostics                        │
└─────────────────────────────┬───────────────────────┬────────────────────────┘
                              │                       │
┌─────────────────────────────▼───────────────────────▼────────────────────────┐
│  Couche worker                                                               │
│                                                                              │
│  WorkerPythonService  (core/services/worker_python/)                         │
│          │ Pyodide (WebAssembly)                                             │
│          ▼                                                                   │
│  api.py  (worker_python/tasks/python-scripts/) → stellar_engine → mechaphlowers│
│    initialize_study() · change_state() · add_bulk_obstacles()                 │
│    add_single_obstacle() · delete_obstacle() · refresh_projection()           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers clés en un coup d'œil

| Fichier | Rôle |
|---|---|
| `shared/domain/models/obstacle.model.ts` | `Obstacle`, `Position3D`, énumérations de référence/latéralité |
| `shared/domain/models/floor.model.ts` | `Floor`, `FloorPoint` |
| `shared/domain/floor/floor-form.helpers.ts` | `mapFloorToObstacle()`, `computeFloorClearance()`, `projectOnSpanAxis()` |
| `core/services/obstacles-form/obstaclesForm.service.ts` | État du formulaire obstacle, orchestration de l'enregistrement et du calcul |
| `core/services/floor-form/floor-form.service.ts` | État du formulaire sol, résultats de dégagement, sélection des points |
| `core/services/obstacles/obstacles.service.ts` | Catalogue des types d'obstacles et signaux de sélection partagés |
| `core/services/obstacle-state/obstacle-state.service.ts` | Appels au registre d'obstacles du worker, `distances`, `distanceType` |
| `core/services/plot/plot.service.ts` | Initialisation de la section, `refreshProjection()`, `litData`, diagnostics |
| `core/services/worker_python/tasks/types.ts` | `Task`, `Distance`, `DistancePoint`, `PythonErrorCode` |
| `core/services/worker_python/tasks/python-scripts/api.py` | Points d'entrée des tâches, délégués à `stellar_engine` |
| `features/studio/obstacles/presentation/components/obstaclesForm/` | Interface de création/édition d'obstacle |
| `features/studio/floor/presentation/` | Interface du formulaire sol et son graphique de positionnement libre |
| `features/studio/core/presentation/components/quick-measures/` | Sélecteur de mesure obstacle/sol et affichage des distances |
| `shared/components/studio/section/section-plot.component.ts` | Orchestration du graphique et gestion des clics |
| `shared/components/studio/section/helpers/createPlot.ts` | Point d'entrée de l'assemblage Plotly |
| `shared/components/studio/section/helpers/createDistanceTraces.ts` | Traces et annotations de distance |
| `shared/components/studio/section/helpers/obstacles.ts` | Annotations des marqueurs d'obstacles |
| `shared/components/studio/section/helpers/createFloorTraces.ts` | Ligne du sol, ruban 3D et trace du point actif |

---

## Modèle de données

### `Obstacle`

Défini dans `shared/domain/models/obstacle.model.ts`.

```typescript
interface Obstacle {
  uuid: string;                                          // UUID v4
  supportUuid: string;                                   // Portée = son support gauche
  supportIndex: number;                                  // Index absolu de ce support
  name: string;
  type: string;                                          // ex. 'accessible_building'
  altitudeType: 'absolute' | 'relative' | 'relative_cable';
  referenceSupport: 'LEFT' | 'RIGHT';                    // Support servant d'origine des X
  lateralDistanceType: 'SPAN_AXIS' | 'LINE_AXIS';
  positions: Position3D[];                               // Un ou plusieurs points 3D
}

interface Position3D {
  x: number | null;   // Horizontal, mètres
  y: number | null;   // Latéral, mètres
  z: number | null;   // Altitude, mètres (interprétée selon altitudeType par Python)
}
```

`altitudeType` détermine la façon dont Python interprète le champ `z` :

| Valeur | Signification |
|---|---|
| `'absolute'` | `z` est une altitude absolue NGF |
| `'relative'` | `z` est relative à l'altitude du pied du support de référence |
| `'relative_cable'` | `z` est relative à l'altitude d'accrochage du câble sur le support de référence |

Python convertit tous les types d'altitude en coordonnées absolues NGF avant de renvoyer la géométrie dans `litData.obstacles`.

### `Floor`

Défini dans `shared/domain/models/floor.model.ts`. Une portée ne porte qu'un seul sol, quel que soit le support de référence avec lequel il a été enregistré.

```typescript
interface Floor {
  uuid: string;
  supportUuid: string;                 // Portée = son support gauche
  referenceSupport: 'LEFT' | 'RIGHT';  // Extrémité depuis laquelle les distances sont mesurées
  points: FloorPoint[];                // [point du support de réf., …points libres…, point de fermeture]
}

interface FloorPoint {
  altitude: number | null;
  distanceToRefSupport: number | null;
}
```

`mapFloorToObstacle()` transforme un sol en `Obstacle` de type `FLOOR_OBSTACLE_TYPE`, en conservant l'uuid du sol et en plaçant chaque point sur l'axe de la portée (`x : distanceToRefSupport`, `y : 0`, `z : altitude`). Tout ce qui suit — enregistrement dans le worker, coordonnées calculées dans `litData.obstacles`, `Distance.obstacleUuid` — indexe donc les sols exactement comme les obstacles.

### `Distance` (résultat renvoyé par Python)

Défini dans `core/services/worker_python/tasks/types.ts`.

```typescript
interface Distance {
  obstacleUuid?: string;   // uuid d'obstacle ou de sol
  points: DistancePoint[];
}

interface DistancePoint {
  pointIndex: number;
  linePoint: [number, number, number];              // Point du câble le plus proche (absolu)
  virtualPointHorizontal: [number, number, number]; // Point virtuel du segment horizontal
  virtualPointVertical: [number, number, number];   // Point virtuel du segment vertical
  distanceDiagonal: number;         // Distance directe (oblique), mètres
  distanceHorizontal: number;       // Composante horizontale, mètres
  distanceVertical: number;         // Composante verticale, toujours positive
  signedDistanceVertical: number;   // Même distance signée, lue uniquement par les sols :
                                    // négative lorsque le câble passe sous le point
}
```

Les obstacles affichent la `distanceVertical` positive qu'ils ont toujours exposée ; les sols sont les seuls à consommer `signedDistanceVertical`, de sorte qu'un câble passant sous le profil se lit comme un dégagement négatif.

---

## Flux de données de bout en bout

Le worker Python est **à état** : il détient une étude ainsi qu'un registre d'obstacles. Les tâches modifient cet état ou le lisent, et `Task.refreshProjection` est la seule lecture qui produit tout ce dont le graphique a besoin.

### 1. Chargement de la section — `PlotService.initSectionStudio()`

1. `Task.initLit` — construit l'étude à partir de la section et de son câble.
2. `Task.changeState` — applique le climat de base (ou la charge sélectionnée).
3. Les obstacles **et les sols** (`mapFloorToObstacle`) sont enregistrés en un seul appel, via `ObstacleStateService.syncObstacles()` → `Task.addBulkObstacles`.
4. `PlotService.refreshProjection()`.

### 2. Projection — `PlotService.refreshProjection()`

Une seule tâche (`Task.refreshProjection`) renvoie l'ensemble des données de rendu pour la fenêtre de supports et la vue courantes :

| Champ du résultat | Stocké dans |
|---|---|
| `sectionOutput.current` / `.base` | `PlotService.litData` / `baseLitData` |
| `obstacles` (points 3D calculés par uuid) | fusionné dans `litData.obstacles` |
| `distances` | `ObstacleStateService.distances` |
| `distanceMeasuringPoints` | `PlotService.distanceMeasuringPoints` |
| avertissements Python capturés | `PlotService.diagnostics` — voir [Diagnostics](#diagnostics-et-avertissement-dintersection-des-sols) |

### 3. Enregistrement d'un obstacle — `ObstacleFormService.calculateAndSave()`

1. Construction de l'obstacle depuis le formulaire et insertion dans la section en mémoire.
2. `ObstacleStateService.addSingleObstacle()` → `Task.addSingleObstacle` (registre du worker).
3. Persistance de la section (IndexedDB).
4. `PlotService.refreshProjection()` — nouvelles coordonnées et distances.
5. Sélection du dernier point de l'obstacle enregistré (`ObstaclesService.setSelectedMeasure()`).

### 4. Enregistrement d'un sol — `FloorFormService.calculateAndSave()`

Même déroulé, via `mapFloorToObstacle()` : enregistrement dans le worker, persistance de la section, publication de la section seulement une fois les deux réussis, puis `refreshProjection()`. `eraseFloor()` en est le miroir avec `Task.deleteObstacle`, et les deux restaurent l'état précédent du worker si une étape échoue.

### 5. Rendu du graphique — `SectionPlotComponent` et ses helpers

`SectionPlotComponent` agrège tous les signaux utiles dans un `computed` `plotState` ; les changements sont debouncés (`STUDIO_PLOT_DEBOUNCE_DELAY`, 300 ms) avant que `refreshPlot()` n'appelle `createPlot()`, qui assemble :

- Les traces de géométrie de base (portées, supports, chaînes, charges…).
- Les **annotations d'obstacles** — `createObstaclesAnnotations()` dans `obstacles.ts` : un marqueur et un libellé par point d'obstacle, rouge pour l'obstacle sélectionné et noir sinon, son point actif étant un losange rouge (`◆`). Les sols en sont exclus : ils ont leurs propres traces.
- Les **traces de sol** — `createFloorTraces()`, voir [Les sols sur le graphique](#les-sols-sur-le-graphique).
- Les **traces et annotations de distance** — `createDistanceTraces()` / `createDistanceAnnotations()`.

`Plotly.react()` est utilisé pour toutes les mises à jour afin de préserver la caméra et le zoom.

---

## Visualisation des distances

Trois représentations sont utilisées selon `ObstacleStateService.distanceType` :

### Oblique

Une simple ligne pleine du point du câble jusqu'au point de l'obstacle.

```
  pointCâble
      \
       \  distanceDiagonal
        \
    pointObstacle
```

### Verticale

Un segment horizontal pointillé (câble → point virtuel) suivi d'un segment vertical plein (point virtuel → obstacle).

```
  pointCâble ·····> virtualPointVertical
                         |
                         |  distanceVertical
                         |
                   pointObstacle
```

### Horizontale

Un segment vertical pointillé (câble → point virtuel) suivi d'un segment horizontal plein (point virtuel → obstacle).

```
  pointCâble
      |  (pointillé)
      |
  virtualPointHorizontal ——————> pointObstacle
                  distanceHorizontal
```

Les coordonnées sont projetées dans la vue active :

| Vue | Axe X | Axe Y |
|---|---|---|
| 3D | x | y, z |
| 2D profil | x (le long de la portée) | z (altitude) |
| 2D face | y (latéral) | z (altitude) |

**Règle de la fenêtre visible.** La sélection de mesure survit à un changement de fenêtre de portées, et le moteur exprime tout obstacle enregistré dans le repère de la fenêtre *visible* : dessiner une mesure hors fenêtre poserait donc ses tracés sur la portée affichée à l'écran. `createDistanceVisuals()` résout l'uuid sélectionné vers son `supportUuid` (via `floors`, puis `obstacles`) et ne dessine rien lorsque ce support tombe hors de `[startSupport, endSupport)`. Les annotations d'obstacles, les traces de sol et les points de mesure appliquent la même règle. Une portée commence à son support gauche : `endSupport` appartient donc à la portée *suivante* et reste exclu.

---

## Sélection de la mesure

`ObstaclesService` porte la sélection partagée par la carte de mesures rapides, les formulaires et le graphique :

- `selectedMeasureUuid` — l'obstacle **ou le sol** mesuré.
- `activePointIndex` — le point à l'intérieur de celui-ci, dans l'ordre *enregistré* des points.

`setSelectedMeasure(uuid, index)` positionne les deux. Ne déplacer que l'index est la source des bugs entre entités : la couche de distances du graphique lit aussi l'uuid, si bien qu'un changement d'index seul continue de dessiner l'entité précédemment sélectionnée au nouvel index.

Qui pilote cette sélection :

| Source | Effet |
|---|---|
| Sélecteur d'entité des mesures rapides | Sélectionne l'obstacle et le charge dans le formulaire obstacle ; un sol passe par `FloorFormService.selectFloorPoint()` |
| Sélecteur de point des mesures rapides | Positionne `activePointIndex` ; pour un sol, `selectFloorPoint()` à nouveau |
| Formulaire obstacle — clic/focus sur un point, ajout, suppression, chargement | `ObstacleFormService.setActivePoint()` : revendique l'uuid de l'obstacle du formulaire **et** l'index |
| Formulaire sol — clic/focus sur un point, positionnement libre | `FloorFormService.setActivePoint()` : pilote la mise en évidence propre au formulaire et se contente de **suivre** le point des mesures rapides lorsque ce sol y est déjà la mesure sélectionnée — il ne revendique jamais la sélection |
| Clic sur une annotation d'obstacle | Ouvre l'onglet Obstacles, charge l'obstacle, sélectionne le point cliqué |
| Clic sur un point de sol ou son ruban | Ouvre l'onglet Sol et appelle `selectFloorPoint()` |

`FloorFormService.selectFloorPoint(uuid, index)` est le point d'entrée unique pour « un point de sol a été choisi hors du formulaire sol » : il sélectionne la mesure, met `distanceType` à `'vertical'` (les sols n'ont pas de boutons radio de type de distance), bascule si nécessaire le formulaire sur la portée et le support de référence de ce sol, puis active le point une fois le formulaire chargé.

Comme le formulaire sol peut lire un profil depuis l'une ou l'autre extrémité, `activeSavedPointIndex` convertit l'index du formulaire dans l'ordre enregistré : c'est cet index qu'utilisent le graphique, les distances du worker et les mesures rapides.

---

(les-sols-sur-le-graphique)=
## Les sols sur le graphique

`createFloorTraces()` produit, pour chaque sol dont la portée est dans la fenêtre visible :

- Une trace `lines+markers` du profil (orange), portant une `customdata` `[floorUuid, pointIndex]` par point afin qu'un clic résolve le point concerné.
- En 3D, un **ruban** (`mesh3d`, opacité 60 %) qui donne de l'épaisseur au profil. C'est lui que la souris atteint réellement en gl3d, car il couvre bien plus de surface que les marqueurs. Plotly indexe un impact `mesh3d` par *face* : le ruban est donc découpé aux milieux des segments, chaque point possédant les deux triangles de la cellule qui l'entoure — le point le plus proche l'emporte, où que la souris se pose.
- Le point actif dans sa propre trace à un point — un losange (`diamond`) rouge, comme le point actif d'un obstacle. Une trace séparée est nécessaire car `marker.symbol` s'applique à toute une trace ; son marqueur est masqué dans la trace du profil pour que les deux ne se superposent pas, et il est légèrement rehaussé en 3D. Un `mesh3d` semi-transparent écrit malgré tout dans le tampon de profondeur : un marqueur posé sur la ligne est donc masqué ou teinté par le ruban qui l'entoure — c'est aussi pour cette raison que le ruban est lui-même abaissé juste sous la ligne, afin que les marqueurs restent survolables.

### Résultats du sol

`FloorFormService.results` n'utilise **pas** les distances par point du worker : elles ne couvrent que les points du sol, alors que le dégagement le plus faible tombe généralement entre eux, là où le câble fléchit — un sol réduit à ses deux points de support reporterait le dégagement aux supports. `computeFloorClearance()` compare plutôt les deux polylignes calculées — le sol depuis `litData.obstacles`, le câble depuis `litData.coords.spans` — sur toute la portée, et renvoie la distance verticale minimale, les deux altitudes et la position de ce minimum. La convention de signe du moteur est conservée : négatif signifie que le câble passe sous le sol.

---

(diagnostics-et-avertissement-dintersection-des-sols)=
## Diagnostics et avertissement d'intersection des sols

Les avertissements Python capturés pendant une tâche deviennent des entrées `PythonDiagnostic`, que `StudioComponent` transforme en toasts.

Le moteur mesure un point en intersectant un plan passant par ce point avec la courbe du câble. Or les **points extrêmes d'un sol reposent sur les supports**, là où ce plan ne rencontre aucun câble — celui-ci est accroché en un point décalé de l'axe du support. Le moteur ignore donc ces points et lève `NoIntersectionPlaneWarning` pour *chaque* sol enregistré, quel que soit son dégagement. `PlotService.withoutFloorIntersectionWarnings()` écarte donc cet avertissement lorsque son texte cite l'uuid d'un sol. Les obstacles le conservent : pour eux, il signale bien un point qui n'a pas pu être mesuré.

Ce qui le remplace porte une vraie information : `FloorFormService` observe chaque projection et avertit, sol par sol, lorsque `computeFloorClearance()` renvoie une distance verticale minimale négative — le câble passe réellement sous le sol. L'avertissement se déclenche à chaque rafraîchissement de projection, de sorte qu'un changement de charge faisant plonger le câble dans un sol enregistré de longue date est également détecté.

Conséquences à garder en tête :

- Les points extrêmes d'un sol n'ont **aucune** entrée `Distance` : les mesures rapides y affichent `-`. Sélectionner un sol y présélectionne donc le premier point que le moteur a effectivement pu mesurer.
- Tout code lisant `distances` pour un sol doit tolérer des index de points manquants.

---

## Limitations connues et TODO

- Les sols sont modélisés comme des obstacles dans le registre du worker. Cela offre le calcul de distance sans effort, mais un uuid de sol peut apparaître partout où un uuid d'obstacle est attendu : chaque consommateur devant les distinguer le fait en cherchant l'uuid dans `section.floors` (`isFloorSelected`, `createDistanceVisuals`, `ObstacleFormService.results`, …).
- Le moteur ne sait pas mesurer un point situé exactement sur un support (voir ci-dessus). Décaler légèrement les points extrêmes enregistrés vers l'intérieur restaurerait ces distances, mais l'écart nécessaire dépend de la géométrie d'accrochage de la portée : ce n'est pas un epsilon fixe.
