# Scale View — Documentation de référence technique

> **Objectif** : servir de référence en cas de bug ou d'évolution sur la fonctionnalité scale-view (échelle d'affichage + résolution du graphique Plotly).

---

## 1. Vue d'ensemble

La fonctionnalité **Scale View** permet à l'utilisateur de configurer deux aspects de la zone graphique du studio :

1. **L'échelle d'affichage** : ratios appliqués aux axes X / Y / Z du graphique 3D Plotly (`aspectratio`) + le mode d'aspect Plotly (`aspectmode`).
2. **La résolution** : nombre de points calculés par portée (span) envoyé au moteur Python (Pyodide).

Le popover est accessible depuis le bouton **"Vue"** dans la toolbar supérieure du studio.

---

## 2. Arborescence des fichiers impactés

```
src/app/
├── ui/
│   ├── pages/studio/
│   │   ├── top-toolbar/scale-view/
│   │   │   ├── scale-view.component.ts          ← Composant principal (UI + logique formulaire)
│   │   │   ├── scale-view.component.html         ← Template du popover (radio buttons + slider)
│   │   │   ├── scale-view.component.scss          ← Styles BEM
│   │   │   └── scale-view.component.spec.ts       ← Tests unitaires
│   │   └── services/
│   │       ├── plot.service.ts                    ← Service central (signals, état du plot)
│   │       └── plot.service.spec.ts               ← Tests unitaires
│   └── shared/components/studio/section/
│       ├── section-plot.component.ts              ← Composant de rendu Plotly (écoute les signals, appelle createPlot)
│       ├── section-plot.component.spec.ts         ← Tests unitaires
│       └── helpers/
│           ├── createPlot.ts                      ← Fonction Plotly.react (layout 2D/3D, application des axesNorms)
│           ├── createPlotData.ts                  ← Construction des DataObject[] depuis GetSectionOutput
│           ├── createPlotDataObject.ts            ← Fonctions utilitaires Plotly (markers, lignes, normalisation)
│           └── types.ts                           ← Interfaces PlotOptions, View, Side, PlotObjectsType
```

---

## 3. Flux de données complet

```
┌───────────────────────┐
│   ScaleViewComponent  │  L'utilisateur choisit une échelle et/ou une résolution
│   (onValidate)        │  puis clique "Valider"
└──────────┬────────────┘
           │
           │  1. plotService.setResolution(resolution)
           │  2. await plotService.applyResolution(resolution)    → envoie au worker Python
           │  3. plotService.setAxesNorms(norms)                  → met à jour le signal axesNorms
           │  4. await plotService.refreshProjection()            → recalcule litData via Python
           ▼
┌───────────────────────┐
│     PlotService       │  Service singleton (providedIn: 'root')
│                       │
│  Signals modifiés :   │
│  • resolution         │  → persisté en localStorage
│  • axesNorms          │  → signal({ x, y, z, aspectMode })
│  • litData            │  → résultat du calcul Python
│  • baseLitData        │  → résultat de l'état de base
└──────────┬────────────┘
           │
           │  Le triggerSignal de SectionPlotComponent
           │  écoute : litData, plotOptions, selectedDisplayOptions,
           │           axesNorms, sideTabs
           ▼
┌───────────────────────┐
│ SectionPlotComponent  │  Rafraîchissement débounced (300ms)
│ (refreshPlot)         │
│                       │  Lit axesNorms() depuis PlotService
│                       │  Le passe à createPlot({ ..., axesNorms })
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│     createPlot()      │  helpers/createPlot.ts
│                       │
│  Vue 3D → layout3d()  │  → createScene() → aspectratio: { x, y, z }
│                       │                   → aspectmode: 'manual' | 'data'
│  Vue 2D → layout2d()  │  → scaleratio / scaleanchor (côté face)
│                       │
│  Plotly.react(...)    │  Mise à jour efficace sans reset caméra
└───────────────────────┘
```

---

## 4. Composants et fonctions détaillés

### 4.1 `ScaleViewComponent`

**Fichier** : `src/app/ui/pages/studio/top-toolbar/scale-view/scale-view.component.ts`

#### Propriétés

| Propriété | Type | Rôle |
|---|---|---|
| `popover` | `ViewChild<Popover>` | Référence au popover PrimeNG |
| `popoverOpen` | `signal(false)` | État ouvert/fermé du popover |
| `scaleMin` / `scaleMax` | `25` / `250` | Bornes du slider de résolution |
| `sliderControl` | `FormControl<number>` | Contrôle du slider (valeur par défaut : 30) |
| `pointsControl` | `FormControl<number>` | Contrôle de l'input numérique (valeur par défaut : 30) |
| `formScaleView` | `FormGroup` | Groupe contenant `scale`, `sliderPointsCount`, `pointsCount` |
| `sliderValue` | `Signal<number>` | Signal dérivé de `sliderControl.valueChanges` via `toSignal()` |
| `pointsCountValue` | `Signal<number>` | Signal dérivé de `pointsControl.valueChanges` via `toSignal()` |

#### Méthodes

| Méthode | Description |
|---|---|
| `setupControlsSynchronization()` | Crée 2 `effect()` pour synchroniser slider ↔ input (bidirectionnel, `emitEvent: false` pour éviter les boucles) |
| `setupResolutionSync()` | Initialise les contrôles avec la résolution courante du `PlotService` + un `effect()` qui réagit aux changements externes |
| `togglePopover(event)` | Bascule l'état du popover et appelle `popover.toggle()` |
| `getScaleNorms(scale)` | Retourne `{ x, y, z, aspectMode }` selon la clé de scale sélectionnée |
| `onValidate()` | **Point d'entrée principal** — orchestre l'application de la résolution et de l'échelle |

#### `scaleNormsMap` — Correspondance échelle → normes

| Clé | x | y | z | aspectMode | Description |
|---|---|---|---|---|---|
| `plan` | 0.2 | 1 | 1 | `manual` | Réduite en X (x/5) |
| `geo` | 1 | 1 | 1 | `manual` | Uniforme |
| `celeste` | 1 | 1 | 0.5 | `manual` | Réduite en Z (z/2) |
| `auto` | 1 | 1 | 1 | `data` | Plotly calcule selon la plage de données |

#### `onValidate()` — Séquence détaillée

```
1. togglePopover(new Event('click'))         → Ferme le popover
2. resolution = pointsControl.value          → Lit la valeur du champ numérique
3. scale = formScaleView.get('scale').value  → Lit le radio button sélectionné
4. plotService.setResolution(resolution)     → Met à jour le signal + localStorage
5. await plotService.applyResolution(resolution)
   └── Envoie Task.setResolution au worker Python (WebWorker/Pyodide)
   └── Met à jour appliedResolution si pas d'erreur
6. norms = getScaleNorms(scale)              → Résout les normes depuis scaleNormsMap
7. plotService.setAxesNorms(norms)           → Met à jour le signal axesNorms
8. await plotService.refreshProjection()
   └── Envoie Task.refreshProjection au worker Python
   └── Met à jour litData et baseLitData
   └── Le changement de litData + axesNorms déclenche le triggerSignal
       de SectionPlotComponent → refreshPlot() → createPlot()
```

---

### 4.2 `PlotService`

**Fichier** : `src/app/ui/pages/studio/services/plot.service.ts`

#### Signals liés à scale-view

| Signal | Type | Valeur par défaut | Rôle |
|---|---|---|---|
| `resolution` | `signal<number>` | `100` (ou valeur en localStorage) | Nombre de points par portée |
| `appliedResolution` | `signal<number \| null>` | `null` | Dernière résolution effectivement envoyée au worker |
| `axesNorms` | `signal<{ x, y, z, aspectMode }>` | `{ x:1, y:1, z:1, aspectMode:'data' }` | Normes des axes pour Plotly |
| `litData` | `signal<GetSectionOutput \| null>` | `null` | Données de calcul courantes (spans, supports, insulators…) |
| `baseLitData` | `signal<GetSectionOutput \| null>` | `null` | Données de l'état de base (pour affichage ombré) |

#### Méthodes liées à scale-view

| Méthode | Signature | Description |
|---|---|---|
| `setResolution(value)` | `void` | Normalise la valeur, met à jour le signal `resolution` et persiste dans `localStorage` |
| `applyResolution(value)` | `Promise<void>` | Envoie `Task.setResolution` au worker Python. Ne fait rien si la résolution normalisée est déjà appliquée (`appliedResolution`) |
| `setAxesNorms(norms)` | `void` | Met à jour le signal `axesNorms`. Déclenche le rafraîchissement réactif via `SectionPlotComponent.triggerSignal` |
| `refreshProjection()` | `Promise<void>` | Envoie `Task.refreshProjection` au worker avec `startSupport`, `endSupport`, `view`. Met à jour `litData` et `baseLitData` |
| `resetAll()` | `void` | Réinitialise tous les signaux y compris `axesNorms` à sa valeur par défaut |

#### `normalizeResolution(value)` — Règles de normalisation

- Si la valeur n'est pas un nombre fini → retourne `DEFAULT_RESOLUTION` (100)
- Sinon → `Math.max(1, Math.round(value))` — arrondi, minimum 1

---

### 4.3 `SectionPlotComponent`

**Fichier** : `src/app/ui/shared/components/studio/section/section-plot.component.ts`

#### Mécanisme de rafraîchissement réactif

```typescript
// computed qui écoute TOUS les signals qui doivent déclencher un re-rendu
private readonly triggerSignal = computed(() => {
  this.litData();
  this.plotService.litData();
  this.plotService.plotOptions();
  this.plotService.selectedDisplayOptions();
  this.plotService.axesNorms();           // ← déclenche sur changement d'échelle
  this.sideTabsService.sideTabs();
  return undefined;
});

// Converti en Observable puis débounced à 300ms
private readonly subscription = toObservable(this.triggerSignal).pipe(
  debounceTime(300),
  tap(() => this.refreshPlot())
).subscribe();
```

**Point critique** : tout signal listé dans ce `computed` déclenche un rafraîchissement. Si `axesNorms` n'y figure pas, un changement d'échelle ne redessine pas le graphique.

#### `refreshPlot()` — Construction des paramètres pour `createPlot()`

La méthode lit les valeurs courantes de tous les signals et construit l'objet `CreatePlotParams` :

```typescript
const axesNorms = this.plotService.axesNorms();  // Lecture du signal

await createPlot({
  plotId: PLOT_ID,
  data: plotData,
  isSupportZoom: false,
  invert: plotOptions.invert,
  view: plotOptions.view,
  camera,
  side: plotOptions.side,
  spanLoads,
  litData,
  startSupport: plotOptions.startSupport,
  endSupport: plotOptions.endSupport,
  obstacles,
  currentObstacleUuid,
  currentObstaclePointIndex,
  axesNorms                                       // ← transmis à Plotly
});
```

**Point critique** : si `axesNorms` n'est pas passé ici, les normes ne sont jamais appliquées au layout Plotly même si le signal est mis à jour.

---

### 4.4 `createPlot()` et layout Plotly

**Fichier** : `src/app/ui/shared/components/studio/section/helpers/createPlot.ts`

#### Interface `CreatePlotParams`

```typescript
interface CreatePlotParams {
  plotId: string;
  data: DataObject[];
  litData: GetSectionOutput;
  invert: boolean;
  view: View;                 // '2d' | '3d'
  camera: Camera | null;
  side: Side;                 // 'profile' | 'face'
  spanLoads: (SpanLoad | null)[];
  startSupport: number;
  endSupport: number;
  obstacles: Obstacle[];
  currentObstacleUuid: string | null;
  isSupportZoom: boolean;
  currentObstaclePointIndex: number;
  axesNorms?: { x: number; y: number; z: number; aspectMode: string };
}
```

#### `createScene()` — Application des normes en 3D

```typescript
const createScene = (plotParams) => ({
  aspectmode: plotParams.axesNorms?.aspectMode ?? 'manual',
  aspectratio: {
    x: plotParams.axesNorms?.x ?? 3,      // fallback si axesNorms absent
    y: plotParams.axesNorms?.y ?? 0.2,
    z: plotParams.axesNorms?.z ?? 0.5
  },
  // ... camera, annotations
});
```

**Comportement par défaut** (sans `axesNorms`) : `aspectmode: 'manual'` avec `{ x:3, y:0.2, z:0.5 }`.  
**Avec `auto`** : `aspectmode: 'data'` et `{ x:1, y:1, z:1 }` → Plotly calcule le ratio automatiquement.

#### `layout3d()` vs `layout2d()`

| | 3D | 2D |
|---|---|---|
| Layout | `layout3d()` → `scene: createScene()` | `layout2d()` → `xaxis` / `yaxis` classiques |
| Application des norms | Via `aspectratio` dans la scène | Non appliqué (axes 2D standards) |
| Inversion | Via `camera.eye.y` (positif/négatif) | Via `xaxis.autorange: 'reversed'` |

#### `Plotly.react()` vs `Plotly.newPlot()`

Le code utilise `Plotly.react()` qui met à jour le graphique **sans réinitialiser** la position de la caméra et le zoom. C'est crucial pour l'expérience utilisateur : changer l'échelle ne doit pas perdre la position de vue.

---

### 4.5 `createPlotDataObject.ts` — Fonctions utilitaires

**Fichier** : `src/app/ui/shared/components/studio/section/helpers/createPlotDataObject.ts`

#### Fonctions exportées

| Fonction | Utilisation | Description |
|---|---|---|
| `createDataObject()` | Utilisé par `createPlotData()` | Crée des DataObject[] sans normalisation de coordonnées |
| `createDataObjectWithSupports()` | Alternative avec UUID | Similaire mais attache les UUID de supports |
| `createDataObjectWithNorms()` | Alternative avec normalisation | Divise les coordonnées par les normes (non utilisé dans le flux principal actuellement) |

#### `getNorms()` — Inversion Y/Z en vue face

```typescript
const getNorms = (axesNorms, view, side) => {
  if (!axesNorms) return undefined;
  if (view === '2d' && side === 'face') {
    return { x: axesNorms.x, y: axesNorms.z, z: axesNorms.y };  // swap Y et Z
  }
  return axesNorms;
};
```

> **Note** : `createDataObjectWithNorms()` est une version alternative qui pourrait être utilisée pour normaliser les coordonnées des données elles-mêmes (pas seulement le layout Plotly). Elle n'est pas utilisée dans le flux actuel de `createPlotData()`.

---

### 4.6 `createPlotData()` — Assemblage des données

**Fichier** : `src/app/ui/shared/components/studio/section/helpers/createPlotData.ts`

Itère sur les trois types d'objets (`spans`, `supports`, `insulators`) et appelle `createDataObject()` pour chacun :

```typescript
(['spans', 'supports', 'insulators'] as const).forEach((type) => {
  dataObjects.push(
    ...createDataObject(params[type], options.startSupport, options.endSupport, type, options.view, options.side, supports)
  );
});
```

---

## 5. Synchronisation des contrôles (slider ↔ input ↔ service)

```
┌─────────┐           ┌──────────┐          ┌─────────────┐
│  Slider  │ ──────→  │  Signal   │ ──────→  │   Input     │
│ (p-slider)│ effect  │ sliderVal │  effect  │ (app-input) │
└─────────┘           └──────────┘          └─────────────┘
     ▲                                            │
     │         effect (pointsCountValue)          │
     └────────────────────────────────────────────┘

                         ▲
                         │  effect (resolution → contrôles)
                         │
                  ┌──────┴──────┐
                  │ PlotService │
                  │ .resolution │
                  └─────────────┘
```

**Prévention des boucles infinies** : chaque `setValue()` utilise `{ emitEvent: false }` pour ne pas déclencher de `valueChanges` qui recréerait le cycle.

---

## 6. Persistance

| Donnée | Stockage | Clé | Comportement |
|---|---|---|---|
| Résolution | `localStorage` | `plotResolution` | Lue au démarrage du `PlotService` (constructeur). Écrite par `setResolution()` |
| Échelle (axesNorms) | Signal en mémoire | — | **Non persistée** : réinitialisée à `{ x:1, y:1, z:1, aspectMode:'data' }` par `resetAll()` |

---

## 7. Checklist de diagnostic en cas de bug

### L'échelle ne s'applique pas

1. Vérifier que `PlotService.axesNorms` est bien un **signal** (pas une propriété simple).
2. Vérifier que `setAxesNorms()` appelle `.set()` sur le signal.
3. Vérifier que `SectionPlotComponent.triggerSignal` lit `this.plotService.axesNorms()` dans son `computed`.
4. Vérifier que `SectionPlotComponent.refreshPlot()` lit `this.plotService.axesNorms()` et le passe à `createPlot()`.
5. Vérifier que `createPlot.ts` → `createScene()` utilise bien `plotParams.axesNorms` pour `aspectratio` et `aspectmode`.

### La résolution ne s'applique pas

1. Vérifier que `PlotService.applyResolution()` envoie bien `Task.setResolution` au worker.
2. Vérifier que `appliedResolution` n'est pas déjà égal à la nouvelle valeur (condition de garde).
3. Vérifier que `refreshProjection()` est appelé **après** `applyResolution()` (c'est le recalcul Python).
4. Vérifier le worker Python (`WorkerPythonService.ready` + `ready$`).

### Le slider et l'input ne se synchronisent pas

1. Vérifier que les deux `effect()` dans `setupControlsSynchronization()` sont enregistrés.
2. Vérifier que `emitEvent: false` empêche les boucles mais n'empêche pas la mise à jour visuelle.
3. Vérifier que `toSignal()` est correctement branché sur `.valueChanges`.

### Le graphique ne se redessine pas

1. Vérifier que le `triggerSignal` computed dépend du signal qui a changé.
2. Vérifier le debounce de 300ms — le rafraîchissement n'est pas immédiat.
3. Vérifier que `litData` n'est pas `null` (condition de garde au début de `refreshPlot()`).
4. Vérifier que l'élément DOM `#plotly-output` existe (condition de garde dans `createPlot()`).

---

## 8. Points d'attention pour les évolutions futures

1. **`createDataObjectWithNorms()`** existe dans `createPlotDataObject.ts` mais **n'est pas utilisé** dans le flux principal. Si on veut normaliser les coordonnées des données (pas seulement le layout), il faudra l'intégrer dans `createPlotData()`.

2. **`axesNorms` n'est pas envoyé au worker Python** (commentaire dans `refreshProjection()` : _"Ici, on n'envoie pas axesNorms au worker, à adapter si besoin"_). Les normes sont appliquées uniquement côté Plotly (layout), pas côté calcul.

3. **Pas de persistance de l'échelle** : contrairement à la résolution qui est sauvée en localStorage, l'échelle revient à `auto` à chaque `resetAll()`. Si on veut persister l'échelle, il faudra ajouter une sauvegarde similaire.

4. **Les normes ne s'appliquent qu'en 3D** via `createScene()` → `aspectratio`. En 2D, seul `scaleratio` / `scaleanchor` est géré (vue face). Si on veut des normes en 2D profil, il faudra étendre `layout2d()`.

5. **`PlotOptions.axesNorms`** existe dans `types.ts` mais est distinct de `CreatePlotParams.axesNorms`. Attention à ne pas confondre les deux chemins.
