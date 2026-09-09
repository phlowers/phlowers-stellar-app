# Obstacles et distances aux obstacles

Ce document décrit le système de gestion des obstacles et le pipeline de calcul des distances à destination des développeurs.

Les obstacles représentent des objets physiques situés à proximité des lignes électriques (bâtiments, arbres, etc.) dont les distances de dégagement doivent être calculées et visualisées. Le système couvre l'intégralité du pipeline : de la saisie utilisateur, en passant par le calcul Python, jusqu'au rendu interactif Plotly.

---

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Presentation layer                                                     │
│                                                                         │
│  ObstaclesFormComponent           SectionPlotComponent                  │
│  (features/studio/obstacles/)     (shared/components/studio/section/)   │
│         │                                   │                           │
│         │ reads/writes                      │ reads                     │
└─────────┼───────────────────────────────────┼───────────────────────────┘
          │                                   │
┌─────────▼───────────────────────────────────▼──────────────────────────────┐
│  Service layer                                                             │
│                                                                            │
│  ObstaclesFormService   LoadFormsService   PlotService   ObstaclesService  │
│  (core/services/        (features/studio/  (core/services (core/services)  │
│   obstacles-form/)       loads/)            /plot/)                        │
│         │                    │                 │               │           │
│         └────────────────────┴──► reapplyObstacles()           │ signals   │
│                                          │                     │           │
│                                    runTask() ×N                │           │
└──────────────────────────────────────────┼─────────────────────┼───────────┘
                                           │                     │
┌──────────────────────────────────────────▼─────────────────────▼─────────┐
│  Worker layer                                                            │
│                                                                          │
│  WorkerPythonService  (core/services/worker_python/)                     │
│         │                                                                │
│         │ Pyodide (WebAssembly)                                          │
│         ▼                                                                │
│  functions.py  (worker_python/tasks/python-scripts/)                     │
│    change_state()                                                        │
│    add_obstacles()                                                       │
│    calculate_obstacles_distances()                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Aperçu des fichiers clés

| Fichier | Objectif |
|---|---|
| `shared/domain/obstacles/obstacle-form.interfaces.ts` | Types de formulaire réactif et de domaine |
| `shared/domain/helpers/span-loads.helpers.ts` | Utilitaire `recheckSpanLoads()` partagé entre le service de charges et le service de graphique |
| `core/services/obstacles-form/obstaclesForm.service.ts` | État du formulaire, orchestration de l'enregistrement et du calcul |
| `core/services/obstacles/obstacles.service.ts` | Catalogue des types d'obstacles, signaux de sélection |
| `core/services/plot/plot.service.ts` | État de la géométrie, stockage des distances, coordination de `reapplyObstacles()` |
| `core/services/worker_python/worker-python.service.ts` | Exécuteur de tâches Pyodide |
| `core/services/worker_python/tasks/types.ts` | Types d'entrée/sortie des tâches `Distance`, `DistancePoint` |
| `core/services/worker_python/tasks/python-scripts/functions.py` | `change_state()`, `add_obstacles()`, `calculate_obstacles_distances()` |
| `features/studio/loads/presentation/services/loadForms.service.ts` | État du formulaire de charge ; délègue à `reapplyObstacles()` après les changements de charge |
| `features/studio/obstacles/presentation/components/obstaclesForm/` | Interface de création/édition d'obstacle |
| `shared/components/studio/section/section-plot.component.ts` | Orchestration du graphique |
| `shared/components/studio/section/helpers/createPlot.ts` | Point d'entrée de l'assemblage Plotly |
| `shared/components/studio/section/helpers/createDistanceTraces.ts` | Traces de lignes/annotations de distance |
| `shared/components/studio/section/helpers/obstacles.ts` | Annotations des marqueurs d'obstacles et gestion des clics |

---

## Modèle de données

### `Obstacle`

Défini dans `shared/domain/obstacles/obstacle-form.interfaces.ts`.

```typescript
interface Obstacle {
  uuid: string;                                          // UUID v4
  supportUuid: string;                                   // Parent support reference
  name: string;
  type: string;                                          // e.g. 'house', 'tree'
  altitudeType: 'absolute' | 'relative' | 'relative_cable';
  referenceSupport: 'LEFT' | 'RIGHT';                    // Which support is the X origin
  lateralDistanceType: 'SPAN_AXIS' | 'LINE_AXIS';
  positions: Position3D[];                               // One or more 3-D points
}

interface Position3D {
  x: number | null;   // Horizontal, meters
  y: number | null;   // Lateral, meters
  z: number | null;   // Altitude, meters (interpreted per altitudeType by Python)
}
```

`altitudeType` contrôle la façon dont Python interprète le champ `z` :

| Valeur | Signification |
|---|---|
| `'absolute'` | `z` est une altitude absolue NGF |
| `'relative'` | `z` est relatif à l'altitude du pied du support de référence |
| `'relative_cable'` | `z` est relatif à l'altitude d'attache du câble du support de référence |

Python convertit tous les types d'altitude en coordonnées NGF absolues avant de renvoyer la géométrie dans `litData.obstacles`.

### `Distance` (résultat renvoyé par Python)

Défini dans `core/services/worker_python/tasks/types.ts`.

```typescript
interface Distance {
  obstacleUuid?: string;
  points: DistancePoint[];
}

interface DistancePoint {
  pointIndex: number;
  linePoint: [number, number, number];              // Closest wire point (absolute)
  virtualPointHorizontal: [number, number, number]; // Virtual point for horizontal leg
  virtualPointVertical: [number, number, number];   // Virtual point for vertical leg
  distanceDiagonal: number;   // Direct (oblique) clearance, meters
  distanceHorizontal: number; // Horizontal component, meters
  distanceVertical: number;   // Vertical component, meters
}
```

---

## Flux de données de bout en bout

### 1. Saisie utilisateur — `ObstaclesFormComponent`

Le composant affiche un formulaire réactif (positions, type d'obstacle, support, type d'altitude/latéral).
Les changements des champs de position sont différés (debounce, 300 ms) avant d'être renvoyés à `ObstaclesFormService`.

### 2. État du formulaire — `ObstaclesFormService`

Maintient le groupe de formulaire réactif, le valide, et expose :

- `canCalculateAndSave` — signal calculé ; `true` lorsque le formulaire est valide et que chaque position est complète.
- `results` — signal calculé ; résultats de distance pour le point d'obstacle actuellement sélectionné, dérivés de `PlotService.distances`.

Lorsque l'utilisateur déclenche **Calculer et enregistrer** :

1. L'obstacle est construit à partir du formulaire (`buildObstacleFromForm()`).
2. L'obstacle est inséré/mis à jour dans la section en mémoire (`upsertObstacleInSection()`).
3. La section est persistée sur le backend (`saveSection()`).
4. **`PlotService.reapplyObstacles()` est appelé** — le service n'exécute plus directement de tâches Python. Toute la coordination de mise à jour du graphique est déléguée à `PlotService` (voir ci-dessous).

### 3. Calcul Python — coordonné par `PlotService.reapplyObstacles()`

`reapplyObstacles()` est le point d'entrée unique pour toute opération devant maintenir la synchronisation entre les charges et les obstacles sur le graphique Plotly. Il est appelé à la fois par `ObstaclesFormService.calculateAndSave()` et par `LoadFormsService.calculateLoad()`.

Il exécute la séquence suivante :

| Étape | Constante de tâche | Fonction Python | Condition |
|---|---|---|---|
| 1 | `Task.changeState` | `change_state()` | Uniquement si `temporaryLoadData` est défini (un cas de charge est actif) |
| 2 | `Task.addObstacle` × N | `add_obstacles()` | Une fois par obstacle enregistré dans la section |
| 3 | `Task.calculateObstaclesDistances` | `calculate_obstacles_distances()` | Uniquement si la section comporte au moins un obstacle |

**Pourquoi cet ordre est important :** le worker Python conserve un état. `Task.changeState` réinitialise la géométrie interne à l'état de base + charge, ce qui efface tous les obstacles précédemment ajoutés. Appliquer d'abord les charges puis réajouter tous les obstacles garantit que charges et obstacles sont toujours superposés correctement, quel que soit le formulaire ayant déclenché la mise à jour.

Après la séquence :
- `PlotService.litData` est mis à jour avec la géométrie finale (incluant les points 3D des obstacles et les coordonnées de charge).
- `PlotService.distances` est mis à jour avec les nouveaux résultats de dégagement.

Le worker utilise Pyodide (Python en WebAssembly) — voir [Worker moteur](engine_worker.md) pour l'infrastructure du worker.

### 4. Interaction charges / obstacles — `LoadFormsService`

`LoadFormsService.calculateLoad()` suit le même schéma de délégation :

1. Valide et revérifie les charges de portée par rapport aux supports actuels (`recheckSpanLoads()` de `shared/domain/helpers/span-loads.helpers.ts`).
2. Stocke les données de charge mises à jour dans `PlotService.temporaryLoadData`.
3. Appelle **`PlotService.reapplyObstacles()`** — qui applique d'abord le nouvel état de charge, puis réajoute tous les obstacles par-dessus.

Cela signifie que le calcul d'une charge n'effacera jamais la géométrie des obstacles, et que le calcul d'un obstacle n'effacera jamais la géométrie de charge.

### 5. Stockage d'état — `PlotService`

`PlotService` sert de point central d'état pour toutes les données de visualisation :

- `litData` — signal de géométrie mis à jour par `reapplyObstacles()` et `refreshSection()`.
- `distances` — signal des résultats de distances de dégagement.
- `distanceType` — quelle variante de distance est affichée (`'oblique'`, `'vertical'`, `'horizontal'`, ou `null`).
- `temporaryLoadData` — les données du cas de charge actif (`ChargeData | null`) ; lues par `reapplyObstacles()` pour décider s'il faut d'abord exécuter `Task.changeState`.

### 6. Rendu du graphique — `SectionPlotComponent` + fonctions utilitaires

`SectionPlotComponent` calcule un signal `plotState` qui fusionne tous les signaux pertinents. Tout changement déclenche un appel différé (debounce, 100 ms) à `refreshPlot()`, qui appelle `createPlot()`.

`createPlot()` assemble :

- Les traces de géométrie de base (portées, supports, isolateurs…).
- **Annotations d'obstacles** — `createObstaclesAnnotations()` dans `obstacles.ts` — lit les coordonnées 3D absolues depuis `litData.obstacles` (calculées par Python) pour placer un marqueur point (`●`) et une étiquette par point d'obstacle ; en rouge si sélectionné, en noir sinon.
- **Traces de distance** — `createDistanceTraces()` — lignes et annotations rendues différemment selon le type de distance (voir ci-dessous).

`Plotly.react()` est utilisé pour toutes les mises à jour afin de préserver l'état de la caméra/du zoom.

---

## Visualisation des distances

Trois motifs visuels sont utilisés selon `distanceType` :

### Oblique

Une seule ligne pleine du point de câble au point d'obstacle.

```
  wirePoint
      \
       \  distanceDiagonal
        \
    obstaclePoint
```

### Vertical

Un segment horizontal en pointillés (câble → point virtuel) suivi d'un segment vertical plein (point virtuel → obstacle).

```
  wirePoint ·····> virtualPointVertical
                         |
                         |  distanceVertical
                         |
                   obstaclePoint
```

### Horizontal

Un segment vertical en pointillés (câble → point virtuel) suivi d'un segment horizontal plein (point virtuel → obstacle).

```
  wirePoint
      |  (dotted)
      |
  virtualPointHorizontal ——————> obstaclePoint
                  distanceHorizontal
```

Les coordonnées sont projetées selon la vue active :

| Vue | Axe X | Axe Y |
|---|---|---|
| 3D | x | y, z |
| Profil 2D | x (le long de la portée) | z (altitude) |
| Face 2D | y (latéral) | z (altitude) |

---

## Sélection des obstacles et interactivité

`ObstaclesService` détient deux signaux de sélection :

- `selectedObstacleUuid` — quel obstacle est actif.
- `activePointIndex` — quel point de cet obstacle est actuellement ciblé.

Cliquer sur une annotation d'obstacle dans le graphique déclenche un événement `plotly_clickannotation`. Le gestionnaire dans `SectionPlotComponent` :

1. Extrait la charge utile `ObstacleAnnotationData` (`obstacleUuid`, `obstaclePositionIndex`).
2. Résout l'index du support à partir des données de la section.
3. Appelle `ObstaclesFormService.setExistingObstacle()` pour charger l'obstacle dans le formulaire.
4. Met à jour les signaux de sélection afin que le point cliqué devienne rouge.

---

## Cycle de rafraîchissement de la section

Lorsque la section active change (par exemple sélection de portée, bascule de vue), `PlotService.refreshSection()` rejoue le calcul complet :

1. Récupère la géométrie de base (`Task.getLit`).
2. Pour chaque obstacle enregistré, appelle `Task.addObstacle` pour le réajouter.
3. Appelle `Task.calculateObstaclesDistances` une fois pour obtenir toutes les distances.
4. Met à jour les signaux `litData` et `distances`.

Remarque : `refreshSection()` ne réapplique **pas** les charges (elle n'appelle pas `Task.changeState`). L'application des charges se fait à la demande via `reapplyObstacles()` lorsque l'utilisateur déclenche un calcul.

---

## Limitations connues et TODO

- Les résultats de distance sont indexés par **nom d'obstacle** dans la sortie Python. Le code TypeScript contourne cela (voir le `computed` `results` de `obstaclesForm.service.ts`). La clé devrait être remplacée par l'UUID une fois le côté Python mis à jour.
