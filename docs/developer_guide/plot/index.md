# How to Create a Plot

A quick guide to using the plot system to visualize section data in 2D or 3D.

## The Basics

The plot system has three main pieces:

- **PlotService** - Manages all the plot data and settings
- **StudioComponent** - The container that sets everything up
- **SectionPlotComponent** - Actually draws the plot

When you give `StudioComponent` a section, it automatically:
1. Waits for the Python worker to be ready
2. Fetches the section data
3. Passes it to `SectionPlotComponent` to render

## Quick Start

Just use the `StudioComponent` in your template:

```html
<app-studio
  [section]="mySection"
  [isSupportZoom]="true"
></app-studio>
```

The component handles loading states and errors automatically. That's it!

## Changing Plot Options

Use `PlotService` to change how the plot looks:

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

### Available Options

```typescript
interface PlotOptions {
  view: '2d' | '3d';           // 2D or 3D view
  side: 'profile' | 'face';    // Viewing angle (2D only)
  startSupport: number;         // First support to show
  endSupport: number;           // Last support to show
  invert: boolean;              // Flip Y-axis (3D only)
}
```

## How It Works

### Data Flow

1. You provide a `section` to `StudioComponent`
2. `StudioComponent` calls `plotService.refreshSection(section)`
3. The service fetches data from the Python worker
4. Data flows into `SectionPlotComponent` via signals
5. The plot automatically updates when data or options change

### Plot Rendering

`SectionPlotComponent` uses an Angular `effect()` to watch for changes. When data arrives, it:
- Transforms the raw data into Plotly format
- Creates the plot in a `<div id="plotly-output">` element
- Preserves camera position in 3D mode

## Common Tasks

### Recalculate with Different Climate Parameters

```typescript
await plotService.calculateCharge(
  50,    // wind pressure (Pa)
  20,    // cable temperature (°C)
  0      // ice thickness (mm)
);
```

### Get Current Camera Position

```typescript
const camera = plotService.getCamera();
// Camera is automatically preserved during updates
```

### Reset Everything

```typescript
plotService.resetAll(); // Clears plot and all state
```

## Error Handling

The system handles errors automatically. Common errors:
- `NO_CABLE_FOUND` - Cable data missing
- `CALCULATION_ERROR` - Calculation failed
- `SOLVER_DID_NOT_CONVERGE` - Solver couldn't find solution
- `PYODIDE_LOAD_ERROR` - Python worker didn't load

Errors show up in the `StudioComponent` template automatically.

## Cleanup

Don't forget to clean up when your component is destroyed:

```typescript
ngOnDestroy() {
  if (this.subscription) {
    this.subscription.unsubscribe();
  }
  this.plotService.resetAll();
}
```

## Full Example

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

## Tips

- The plot updates automatically when data or options change - you usually don't need to manually refresh
- Always use `plotOptionsChange()` instead of directly setting options
- Camera position is preserved automatically in 3D mode
- Make sure the Python worker is ready before calling `refreshSection()`
