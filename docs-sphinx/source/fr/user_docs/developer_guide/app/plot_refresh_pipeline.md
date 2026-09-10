# Pipeline de rafraîchissement du graphique

Ce document décrit les quatre fonctions de rafraîchissement qui maintiennent le graphique
de section Plotly synchronisé avec les changements de données, le moment où elles sont
déclenchées, et le travail Python que chacune effectue.

---

## Vue d'ensemble

Le pipeline de rendu comporte deux couches distinctes :

- **Couche de données** — `PlotService` et `ObstacleFormService` récupèrent ou mettent à jour
  la géométrie depuis le worker Python et stockent les résultats dans des signaux Angular
  (`litData`, `obstacleStateService.distances`, …).
- **Couche de rendu** — `SectionPlotComponent` réagit à ces signaux et effectue un redessin
  Plotly côté client. Aucun appel Python n'a lieu ici.

```
╔══════════════════════════════════════════════════════════════╗
║  Data layer  (PlotService / ObstacleFormService)             ║
║                                                              ║
║   refreshSection()   refreshProjection()   calculateAndSave()║
║        │                    │                    │           ║
║        └────────────────────┴────────────────────┘          ║
║                             │                               ║
║               sets litData / distances signals               ║
╚═════════════════════════════╪════════════════════════════════╝
                              │ signal change
╔═════════════════════════════╪════════════════════════════════╗
║  Render layer  (SectionPlotComponent)                        ║
║                             │                               ║
║             refreshPlot()  ◄┘  (debounced, no Python)        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 1. `refreshSection(section)` — `PlotService`

### Quand elle est appelée

Déclenchée une fois par `StudioComponent` chaque fois que la section active change (nouvelle
section chargée ou données de section remplacées).

### Ce qu'elle fait

Démarrage à froid complet. Construit entièrement le moteur Python depuis zéro
(`BalanceEngine` + `PlotEngine`), projette la géométrie, enregistre tous les obstacles
sauvegardés, et calcule leurs distances.

### Appels Python

| Ordre | Tâche | Description |
|-------|------|-------------|
| 1 | `getLit` | Construit le moteur ; renvoie la géométrie complète de la section (`GetSectionWithBaseOutput`) |
| 2 | `addObstacle` | Enregistre tous les obstacles de la portée courante dans `plt_line` |
| 3 | `calculateObstaclesDistances` | Calcule les distances de dégagement |

### Graphe d'appels

```
StudioComponent (effect on section input)
  └─► PlotService.refreshSection(section)
        ├─► Python: getLit
        │     └─► sets litData + baseLitData
        ├─► obstacleStateService.syncObstacles(obstacles, plotOptions)
        │     ├─► Python: addObstacle  (filtered to current span)
        │     └─► Python: calculateObstaclesDistances
        │           └─► sets obstacleStateService.distances
        └─► sets litData.obstacles
              └─► SectionPlotComponent reacts → refreshPlot()
```

---

## 2. `refreshProjection()` — `PlotService`

### Quand elle est appelée

Appelée automatiquement par `plotOptionsChange()` chaque fois que `startSupport`,
`endSupport`, ou `view` change — c'est-à-dire chaque fois que le curseur de portée est
déplacé ou que le bascule 2D/3D est utilisé.

### Ce qu'elle fait

Reprojette le moteur Python **existant** avec de nouveaux paramètres de vue. Comme
`plt_line` contient déjà les obstacles enregistrés lors du dernier appel à `addObstacle`,
`refresh_projection` côté Python appelle `get_coordinates()` **et**
`plt_line.obstacles_dict()`, renvoyant les coordonnées des obstacles intégrées dans
`current.obstacles`. Aucun appel Python supplémentaire n'est nécessaire.

### Appels Python

| Ordre | Tâche | Description |
|-------|------|-------------|
| 1 | `refreshProjection` | Reprojette la géométrie ; les coordonnées des obstacles sont incluses dans la valeur de retour |

### Graphe d'appels

```
StudioPage span slider / view toggle
  └─► PlotService.plotOptionsChange(values)
        └─► [if startSupport or endSupport changed]
              └─► PlotService.refreshProjection()
                    └─► Python: refreshProjection
                          ├─► get_coordinates()   — section geometry
                          └─► plt_line.obstacles_dict()  — obstacle coords (free, no extra call)
                    ├─► sets litData  (obstacles embedded in current)
                    └─► sets obstacleStateService.distances
                          └─► SectionPlotComponent reacts → refreshPlot()
```

### Note de conception clé

Le filtrage des obstacles par plage de portée se produit **avant** cet appel, à l'étape
`addObstacle` (dans `refreshSection` ou `calculateAndSave`). Au moment où
`refreshProjection` s'exécute, `plt_line` ne contient que les obstacles appartenant à
la fenêtre de portée actuellement sélectionnée.

---

## 3. `calculateAndSave()` — `ObstacleFormService`

### Quand elle est appelée

Déclenchée lorsque l'utilisateur clique sur **Calculer et enregistrer** dans le panneau
du formulaire d'obstacle.

### Ce qu'elle fait

Enregistre le ou les obstacles de la portée courante dans `plt_line`, obtient leurs
positions 3D calculées, persiste l'objet de domaine dans IndexedDB, puis recalcule
les distances de dégagement.

### Appels Python

| Ordre | Tâche | Description |
|-------|------|-------------|
| 1 | `addObstacle` | Enregistre la liste d'obstacles filtrée ; renvoie les positions calculées |
| 2 | `calculateObstaclesDistances` | Recalcule les distances de dégagement |

### Graphe d'appels

```
Obstacle form — "Calculate and save" click
  └─► ObstacleFormService.calculateAndSave()
        ├─► upsertObstacleInSection()      — merge into in-memory section.obstacles
        ├─► obstacleStateService.addObstacle(allObstacles, plotOptions)
        │     └─► Python: addObstacle  (filtered to startSupport..endSupport)
        │           └─► returns ObstacleOutput  {obstacles: [{uuid, points}]}
        ├─► applyObstacleOutputToLitData() — sets litData.obstacles
        │     └─► SectionPlotComponent reacts → refreshPlot()
        ├─► saveSection()                  — IndexedDB persist
        ├─► obstacleStateService.calculateDistances(plotOptions)
        │     └─► Python: calculateObstaclesDistances
        │           └─► sets obstacleStateService.distances
        └─► obstaclesService.setSelectedObstacle()
              └─► SectionPlotComponent reacts → refreshPlot()
```

---

## 4. `refreshPlot()` — `SectionPlotComponent`

### Quand elle est appelée

Réactive — se déclenche automatiquement chaque fois que le signal calculé `plotState`
change. Un debounce de 50 ms évite les redessins redondants lorsque plusieurs signaux
changent dans le même cycle.

`plotState` agrège : `litData`, `baseLitData`, `plotOptions`,
`selectedDisplayOptions`, `axesNorms`, les positions du formulaire, la sélection
d'obstacle, les distances, et le type de distance.

### Ce qu'elle fait

Redessin Plotly purement côté client. Lit toutes les données depuis les signaux et
appelle `Plotly.react()` (mise à jour différentielle). **Aucun appel Python.**

### Graphe d'appels

```
Any signal change (litData, plotOptions, distances, form values, …)
  └─► SectionPlotComponent.debouncedPlotState  (50 ms debounce)
        └─► refreshPlot()
              ├─► createPlotData()              — cable/support/insulator traces
              ├─► createShadowPlotData()         — base-state overlay (optional)
              ├─► createObstaclesAnnotations()   — obstacle dots from litData.obstacles
              ├─► createDistanceTraces()         — distance lines from distances signal
              └─► Plotly.react()                — efficient DOM diff-update
```

---

## Résumé

| Fonction | Couche | Déclencheur | Tâches Python | Reconstruit le moteur |
|----------|-------|---------|-------------|-----------------|
| `refreshSection` | `PlotService` | Changement de section | `getLit` + `addObstacle` + `calcDistances` | Oui |
| `refreshProjection` | `PlotService` | Changement de portée / vue | `refreshProjection` (×1) | Non |
| `calculateAndSave` | `ObstacleFormService` | Bouton d'enregistrement | `addObstacle` + `calcDistances` | Non |
| `refreshPlot` | `SectionPlotComponent` | Tout changement de signal | Aucune | Non |
