# Comment créer un tracé (plot)

Un guide rapide pour utiliser le système de tracé afin de visualiser les données de section en 2D ou en 3D.


## Les bases

Le système de tracé comporte trois éléments principaux :

- **PlotService** - Gère toutes les données et paramètres du tracé
- **StudioComponent** - Le conteneur qui met tout en place
- **SectionPlotComponent** - Dessine réellement le tracé

Lorsque vous fournissez une section à `StudioComponent`, il :
1. Attend que le worker Python soit prêt
2. Récupère les données de la section
3. Les transmet à `SectionPlotComponent` pour le rendu

## Démarrage rapide

Utilisez simplement `StudioComponent` dans votre template :

```text
<app-studio
  [section]="mySection"
  [isSupportZoom]="true"
></app-studio>
```

Le composant gère automatiquement les états de chargement et les erreurs. C'est tout !

## Modifier les options du tracé

Utilisez `PlotService` pour changer l'apparence du tracé :

```typescript
constructor(public plotService: PlotService) {}

// Switch between 2D and 3D
plotService.plotOptionsChange({ view: '2d' });

// Show different support range
plotService.plotOptionsChange({
  startSupport: 0,
  endSupport: 5
});

// Change viewing angle (2D only)
plotService.plotOptionsChange({ side: 'face' });
```

### Options disponibles

```typescript
interface PlotOptions {
  view: '2d' | '3d';           // 2D or 3D view
  side: 'profile' | 'face';    // Viewing angle (2D only)
  startSupport: number;         // First support to show
  endSupport: number;           // Last support to show
  invert: boolean;              // Flip Y-axis (3D only)
}
```

## Fonctionnement

### Flux de données

1. Vous fournissez une `section` à `StudioComponent`
2. `StudioComponent` appelle `plotService.refreshSection(section)`
3. Le service récupère les données depuis le worker Python
4. Les données circulent vers `SectionPlotComponent` via des signals
5. Le tracé se met à jour automatiquement quand les données ou les options changent

### Rendu du tracé

`SectionPlotComponent` utilise un `effect()` Angular pour surveiller les changements. Quand les données arrivent, il :
- Transforme les données brutes au format Plotly
- Crée le tracé dans un élément `<div id="plotly-output">`
- Préserve la position de la caméra en mode 3D

## Tâches courantes

### Recalculer avec des paramètres climatiques différents

```typescript
await plotService.calculateCharge(
  50,    // wind pressure (Pa)
  20,    // cable temperature (°C)
  0      // ice thickness (mm)
);
```

### Récupérer la position actuelle de la caméra

```typescript
const camera = plotService.getCamera();
// Camera is automatically preserved during updates
```

### Tout réinitialiser

```typescript
plotService.resetAll(); // Clears plot and all state
```

## Gestion des erreurs

Le système gère les erreurs automatiquement. Erreurs courantes :
- `NO_CABLE_FOUND` - Données de câble manquantes
- `CALCULATION_ERROR` - Le calcul a échoué
- `SOLVER_DID_NOT_CONVERGE` - Le solveur n'a pas trouvé de solution
- `PYODIDE_LOAD_ERROR` - Le worker Python n'a pas pu se charger

Les erreurs s'affichent automatiquement dans le template de `StudioComponent`.

## Nettoyage

N'oubliez pas de nettoyer lorsque votre composant est détruit :

```typescript
ngOnDestroy() {
  if (this.subscription) {
    this.subscription.unsubscribe();
  }
  this.plotService.resetAll();
}
```

## Exemple complet

```typescript
@Component({
  selector: 'app-my-plot',
  template: `
    <app-studio
      [section]="currentSection()"
      [isSupportZoom]="true"
    ></app-studio>
    
    <button (click)="toggleView()">Toggle 2D/3D</button>
  `,
  imports: [StudioComponent]
})
export class MyPlotComponent {
  currentSection = signal<Section | null>(null);
  
  constructor(public plotService: PlotService) {}
  
  toggleView() {
    const current = this.plotService.plotOptions();
    this.plotService.plotOptionsChange({
      view: current.view === '3d' ? '2d' : '3d'
    });
  }
}
```

## Astuces

- Le tracé se met à jour automatiquement quand les données ou les options changent - vous n'avez généralement pas besoin de rafraîchir manuellement
- Utilisez toujours `plotOptionsChange()` plutôt que de définir les options directement
- La position de la caméra est préservée automatiquement en mode 3D
- Assurez-vous que le worker Python est prêt avant d'appeler `refreshSection()`
