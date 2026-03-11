# CLAUDE.md — phlowers-stellar-app (Stellar)

Development guide for the AI assistant on the **Stellar** project: an Angular 19 PWA enabling offline execution of Python computations (via Pyodide / mechaphlowers) with local IndexedDB storage (Dexie), 3D visualization (Plotly), and a PrimeNG interface.

---

## 1. Stack & project context

| Technology | Role |
|---|---|
| Angular 19 (Standalone) | Main framework, PWA |
| TypeScript strict | Main language |
| PrimeNG | UI component library |
| Plotly.js | Interactive 2D/3D visualization |
| Pyodide | Run Python in the browser (Web Worker) |
| Dexie.js | IndexedDB wrapper (offline local storage) |
| SCSS + BEM | Styling with strict BEM methodology |
| Angular i18n | Standard Angular internationalization |
| Tailwind CSS | Complementary CSS utilities |
| Jest | Unit tests |
| Clean Architecture + DDD | Overall architecture |


### TypeScript import aliases — Required

**All TypeScript imports must use the configured path aliases (e.g. `@core/`, `@ui/`, `@services/`, etc.) instead of relative paths.**

- Use aliases as defined in `tsconfig.json` and `tsconfig.app.json` for all internal imports.
- Never use long relative paths like `../../../../core/services/foo.service` — always prefer `@core/services/foo.service`.
- This applies to all TypeScript files, including tests, services, components, and feature modules.

```typescript
// ✅ ALWAYS — use alias
import { ObstaclesService } from '@core/services/obstacles/obstacles.service';

// ❌ NEVER — use long relative path
import { ObstaclesService } from '../../../../core/services/obstacles/obstacles.service';
```

> **Rationale:** Aliases improve code readability, maintainability, and reduce errors during refactoring.

---
### Language policy — English only

**All code, comments, documentation, commit messages, PR descriptions, variable names, class names, function names, TSDoc/JSDoc, and inline comments must be written in English.** This applies to:

- Source code (TypeScript, SCSS, HTML templates)
- Code comments and documentation (`/** ... */`, `// ...`)
- Commit messages and PR descriptions
- README, CLAUDE.md, agent.md, and any markdown documentation
- Test descriptions (`describe`, `it` blocks)
- Console logs and error messages
- CSV headers and data model field names

```typescript
// ✅ ALWAYS — English everywhere
/** Service for managing obstacle type catalog data. */
export class ObstacleTypesService {
  /** Retrieve all obstacle types from the catalog. */
  async getObstacleTypes() { ... }
}

// ❌ NEVER — French or other languages in code
/** Service de gestion des types d'obstacles. */
export class ObstacleTypesService {
  /** Récupère tous les types d'obstacles. */
  async getObstacleTypes() { ... }
}
```

> **Exception**: User-facing text in templates uses Angular i18n (`i18n` attribute or `$localize`) — the source language in templates may be English or French as long as translations are provided.

---

## 2. DDD & Clean Architecture

### Folder structure

```
src/
├── app/
│   ├── core/                        # Singleton services, guards, interceptors
│   │   ├── services/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── shared/                      # Reusable components, pipes, directives
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/                    # Bounded Contexts DDD
│   │   ├── <feature>/
│   │   │   ├── domain/              # Entities, Value Objects, Repository interfaces
│   │   │   │   ├── entities/
│   │   │   │   ├── value-objects/
│   │   │   │   └── repositories/   # Interfaces only
│   │   │   ├── application/         # Use cases, commands, queries
│   │   │   │   ├── use-cases/
│   │   │   │   └── services/
│   │   │   ├── infrastructure/      # Concrete implementations (Dexie, HTTP...)
│   │   │   │   ├── repositories/
│   │   │   │   └── adapters/
│   │   │   └── presentation/        # Angular components for the feature
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       └── <feature>.routes.ts
│   └── app.routes.ts
├── assets/
│   └── i18n/                        # Translation files
└── environments/
```

### DDD rules

- The **domain** must never depend on Angular, Dexie, or any infrastructure.
- **Use cases** orchestrate entities and repositories through their interfaces.
- **Infrastructure** implements the domain interfaces (injected via `InjectionToken`).
- **Presentation** components contain no business logic — they delegate to use cases via Angular services.
- Each feature is a **bounded context**: no direct dependencies between features (go through core if needed).

---

## 3. Angular 19 — Mandatory modern practices

### Standalone components & `inject()`

```typescript
// ✅ ALWAYS — standalone component with inject()
@Component({
  selector: 'app-network-diagram',
  standalone: true,
  imports: [CommonModule, PrimeNGModule],
  templateUrl: './network-diagram.component.html',
  styleUrl: './network-diagram.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkDiagramComponent {
  private readonly networkService = inject(NetworkService);
  private readonly translateService = inject(TranslateService);
}

// ❌ NEVER — constructor injection or NgModule
@NgModule({ declarations: [NetworkDiagramComponent] })
export class SomeModule {}
```

### Signals — Signal-first required

All component state must use Angular signals. RxJS is reserved for external async streams (HTTP, Workers) and must be converted via `toSignal()`.

```typescript
// ✅ Local state with signal
readonly isLoading = signal(false);
readonly networkData = signal<NetworkNode[]>([]);
readonly selectedNode = signal<NetworkNode | null>(null);

// ✅ Derived state with computed()
readonly hasData = computed(() => this.networkData().length > 0);
readonly nodeCount = computed(() => this.networkData().length);

// ✅ Side effects with effect()
constructor() {
  effect(() => {
    const node = this.selectedNode();
    if (node) {
      this.updatePlotlyChart(node);
    }
  });
}

// ✅ Observable → Signal conversion
private readonly items$ = this.service.getItems();
readonly items = toSignal(this.items$, { initialValue: [] });

// ❌ NEVER — simple mutable properties for state
isLoading = false;
networkData: NetworkNode[] = [];
```

### Input/Output with signals

```typescript
// ✅ Angular 17+ — input() and output()
readonly nodeId = input.required<string>();
readonly title = input('Default Title');
readonly nodeSelected = output<NetworkNode>();

// Usage
this.nodeSelected.emit(node);
```

### OnPush — Required on all components

```typescript
// ✅ ALWAYS changeDetection: ChangeDetectionStrategy.OnPush
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

---

## 4. SCSS — Strict BEM methodology

### BEM convention

```
.block {}
.block__element {}
.block--modifier {}
.block__element--modifier {}
```

### Structure of a component SCSS file

```scss
// network-diagram.component.scss

.network-diagram {
  // Root block styles
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);

  &__header {
    // Header element
    display: flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);

    &--sticky {
      // Sticky modifier on the header
      position: sticky;
      top: 0;
      z-index: var(--z-header);
    }
  }

  &__chart-container {
    position: relative;
    width: 100%;
    min-height: 400px;

    &--loading {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__toolbar {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  &__legend {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
}
```

### SCSS rules

- **One SCSS file per component**, named the same as the component.
- **Custom CSS variables** (`var(--spacing-md)`) for reusable values — no magic numbers.
- **No global selectors** in component styles.
- **Tailwind**: use utilities only in the HTML template for one-off tweaks; structural styles stay in SCSS/BEM.
- **Media queries** are encapsulated within the relevant BEM blocks.
- Avoid deep nesting (max 3 levels).

```scss
// ✅ Correct
.network-diagram {
  &__chart-container {
    &--loading { ... }
  }
}

// ❌ Too deep
.network-diagram {
  &__chart-container {
    &__inner {
      &--loading { ... } // 4 levels = too deep
    }
  }
}
```

---

## 5. HTML5 — Semantics & Accessibility

### HTML5 semantics

```html
<!-- ✅ Semantic structure -->
<main class="network-diagram" role="main">
  <header class="network-diagram__header">
    <h1 class="network-diagram__title">
      {{ 'NETWORK.TITLE' | translate }}
    </h1>
    <nav class="network-diagram__toolbar" aria-label="Outils du diagramme">
      <button class="network-diagram__btn"
              type="button"
              [attr.aria-pressed]="isEditMode()"
              (click)="toggleEditMode()">
        {{ 'NETWORK.EDIT_MODE' | translate }}
      </button>
    </nav>
  </header>

  <section class="network-diagram__content" aria-labelledby="chart-title">
    <h2 id="chart-title" class="visually-hidden">
      {{ 'NETWORK.CHART_SECTION' | translate }}
    </h2>

    <!-- Plotly area with accessibility -->
    <div class="network-diagram__chart-container"
         [class.network-diagram__chart-container--loading]="isLoading()"
         role="img"
         [attr.aria-label]="chartAriaLabel()"
         [attr.aria-busy]="isLoading()">
      <div #plotlyContainer class="network-diagram__plotly"></div>
    </div>
  </section>

  <aside class="network-diagram__sidebar" aria-label="Propriétés du nœud">
    @if (selectedNode()) {
      <app-node-properties [node]="selectedNode()!" />
    }
  </aside>
</main>
```

### Mandatory accessibility rules

- **ARIA**: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-busy`, `aria-live` as appropriate.
- **ARIA roles**: prefer native HTML5 semantics first (`<button>`, `<nav>`, `<main>`, `<aside>`...).
- **Keyboard navigation**: all interactive elements must be keyboard-accessible; use `tabindex="0"` only when needed.
- **Visible focus**: never remove `outline` without a visible alternative.
- **Alt text**: all images have an `alt`; decorative icons have `aria-hidden="true"`.
- **Contrast**: meet WCAG AA (minimum 4.5:1 text contrast ratio).
- **Forms**: every `<input>` is associated with a `<label>` via `for`/`id` or `aria-labelledby`.
- **Live regions**: use `aria-live="polite"` for non-critical notifications, `aria-live="assertive"` for errors.

```html
<!-- ✅ Accessible notifications -->
<div aria-live="polite" aria-atomic="true" class="visually-hidden">
  @if (successMessage()) {
    {{ successMessage() }}
  }
</div>

<!-- ✅ Decorative icon -->
<p-button>
  <i class="pi pi-save" aria-hidden="true"></i>
  <span>{{ 'ACTIONS.SAVE' | translate }}</span>
</p-button>

<!-- ✅ Data table -->
<table class="data-table" role="table" [attr.aria-label]="'DATA.TABLE_LABEL' | translate">
  <caption class="visually-hidden">{{ 'DATA.TABLE_CAPTION' | translate }}</caption>
  <thead>
    <tr>
      <th scope="col">{{ 'DATA.COLUMN_NAME' | translate }}</th>
    </tr>
  </thead>
</table>
```

### Utility class for visually-hidden elements

```scss
// In global styles
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 6. Angular i18n — Angular standard

The project uses **Angular's standard i18n system** with translation files located in `assets/i18n/`.

### In templates

```html
<!-- ✅ i18n attribute on text elements -->
<h1 i18n="@@network.diagram.title">Diagramme réseau</h1>

<!-- ✅ With a description for translators -->
<p i18n="Page description for network module@@network.diagram.description">
  Visualisation du réseau électrique.
</p>

<!-- ✅ i18n attributes -->
<input [placeholder]="'SEARCH.PLACEHOLDER' | translate"
       [attr.aria-label]="'SEARCH.ARIA_LABEL' | translate" />

<!-- ✅ Pluralization -->
<span i18n="@@node.count">{nodeCount(), plural,
  =0 {Aucun nœud}
  =1 {1 nœud}
  other {{{nodeCount()}} nœuds}
}</span>
```

### In TypeScript services/components

```typescript
// ✅ Translation service usage
private readonly translate = inject(TranslateService);

getErrorMessage(code: string): string {
  return this.translate.instant(`ERRORS.${code}`);
}

// ✅ Derived signal for translated labels
readonly chartTitle = computed(() =>
  this.translate.instant('NETWORK.CHART_TITLE', { count: this.nodeCount() })
);
```

### i18n file structure

```
assets/i18n/
├── fr.json       # French (reference language)
├── en.json       # English
└── ...
```

```json
// fr.json — structure in namespaces by feature
{
  "NETWORK": {
    "TITLE": "Diagramme réseau",
    "CHART_TITLE": "Réseau ({{count}} nœuds)",
    "EDIT_MODE": "Mode édition",
    "CHART_SECTION": "Graphique interactif"
  },
  "ERRORS": {
    "LOAD_FAILED": "Chargement échoué",
    "PYTHON_ERROR": "Erreur d'exécution Python"
  },
  "ACTIONS": {
    "SAVE": "Enregistrer",
    "CANCEL": "Annuler"
  }
}
```

---

## 7. Plotly.js — Angular best practices

### Encapsulated Plotly service

```typescript
// infrastructure/adapters/plotly.service.ts
@Injectable({ providedIn: 'root' })
export class PlotlyService {
  private readonly ngZone = inject(NgZone);

  async createChart(
    container: HTMLElement,
    data: Plotly.Data[],
    layout: Partial<Plotly.Layout>,
    config?: Partial<Plotly.Config>
  ): Promise<Plotly.PlotlyHTMLElement> {
    const defaultConfig: Partial<Plotly.Config> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    };

    // Run outside Angular's zone for performance
    return this.ngZone.runOutsideAngular(() =>
      Plotly.newPlot(container, data, layout, { ...defaultConfig, ...config })
    );
  }

  async updateChart(
    container: HTMLElement,
    data: Plotly.Data[],
    layout?: Partial<Plotly.Layout>
  ): Promise<void> {
    return this.ngZone.runOutsideAngular(() =>
      Plotly.react(container, data, layout)
    );
  }

  destroyChart(container: HTMLElement): void {
    Plotly.purge(container);
  }
}
```

### Component with Plotly

```typescript
@Component({
  selector: 'app-network-chart',
  standalone: true,
  template: `
    <div class="network-chart">
      <div #chartContainer
           class="network-chart__container"
           role="img"
           [attr.aria-label]="'NETWORK.CHART_ARIA' | translate"
           [attr.aria-busy]="isLoading()">
      </div>
    </div>
  `,
  styleUrl: './network-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') private chartContainer!: ElementRef<HTMLDivElement>;

  readonly data = input.required<NetworkData>();
  readonly isLoading = signal(false);

  private readonly plotlyService = inject(PlotlyService);

  constructor() {
    // React to data changes via effect
    effect(() => {
      const data = this.data();
      if (this.chartContainer?.nativeElement) {
        this.refreshChart(data);
      }
    });
  }

  ngOnInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    this.plotlyService.destroyChart(this.chartContainer.nativeElement);
  }

  private async initChart(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { plotData, layout } = this.buildPlotlyConfig(this.data());
      await this.plotlyService.createChart(
        this.chartContainer.nativeElement,
        plotData,
        layout
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildPlotlyConfig(data: NetworkData): PlotlyConfig {
    // Build Plotly traces and layout
    return { plotData: [], layout: {} };
  }
}
```

### Plotly rules

- Always execute Plotly calls **outside Angular's zone** (`ngZone.runOutsideAngular`).
- Always call `Plotly.purge()` in `ngOnDestroy()` to avoid memory leaks.
- Use `Plotly.react()` (diff updates) rather than `Plotly.newPlot()` for refreshes.
- Build chart configuration in dedicated methods, not in templates.
- Make charts accessible using `role="img"` and a descriptive `aria-label`.

---

## 8. Dexie.js & IndexedDB — Best practices

### Encapsulated Dexie service (infrastructure)

```typescript
// infrastructure/database/stellar.database.ts
import Dexie, { Table } from 'dexie';

export interface NetworkEntity {
  id?: number;
  name: string;
  data: string; // Serialized JSON
  createdAt: Date;
  updatedAt: Date;
}

export class StellarDatabase extends Dexie {
  networks!: Table<NetworkEntity>;
  computationResults!: Table<ComputationResultEntity>;

  constructor() {
    super('StellarDB');
    this.version(1).stores({
      networks: '++id, name, createdAt',
      computationResults: '++id, networkId, createdAt',
    });
  }
}

// Singleton via InjectionToken
export const STELLAR_DB = new InjectionToken<StellarDatabase>('StellarDB', {
  providedIn: 'root',
  factory: () => new StellarDatabase(),
});
```

### Repository implementation

```typescript
// infrastructure/repositories/network.repository.impl.ts
@Injectable({ providedIn: 'root' })
export class NetworkRepositoryImpl implements NetworkRepository {
  private readonly db = inject(STELLAR_DB);

  async findAll(): Promise<Network[]> {
    const entities = await this.db.networks.orderBy('createdAt').reverse().toArray();
    return entities.map(NetworkMapper.toDomain);
  }

  async findById(id: number): Promise<Network | null> {
    const entity = await this.db.networks.get(id);
    return entity ? NetworkMapper.toDomain(entity) : null;
  }

  async save(network: Network): Promise<Network> {
    const entity = NetworkMapper.toEntity(network);
    const id = await this.db.networks.put(entity);
    return { ...network, id };
  }

  async delete(id: number): Promise<void> {
    await this.db.networks.delete(id);
  }

  // Use Dexie transactions for multi-operation workflows
  async saveWithResults(network: Network, results: ComputationResult[]): Promise<void> {
    await this.db.transaction('rw', [this.db.networks, this.db.computationResults], async () => {
      const networkId = await this.db.networks.put(NetworkMapper.toEntity(network));
      const resultEntities = results.map(r => ResultMapper.toEntity({ ...r, networkId }));
      await this.db.computationResults.bulkPut(resultEntities);
    });
  }
}
```

### Dexie/IndexedDB rules

- **Always** go through a repository — never access `db` directly from components.
- Use **Dexie transactions** for multi-table operations.
- Primary keys are `++id` (auto-increment) unless there is a specific need.
- Handle Dexie errors explicitly (quota exceeded, version conflict...).
- Schema migrations are done via `this.version(N).stores({...}).upgrade(...)`.
- Serialize complex objects to JSON before storage.

---

## 9. Pyodide (Python in the browser) — Best practices

### Worker architecture

Pyodide must **always** run in a **Web Worker** to avoid blocking the main thread.

```typescript
// infrastructure/workers/python.worker.ts
/// <reference lib="webworker" />
import { loadPyodide } from 'pyodide';

let pyodide: any = null;

async function initPyodide(): Promise<void> {
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.x.x/full/',
  });
  await pyodide.loadPackage(['numpy', 'pandas']); // required packages
}

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'INIT') {
      await initPyodide();
      self.postMessage({ id, type: 'INIT_SUCCESS' });
    } else if (type === 'RUN_SCRIPT') {
      const result = await pyodide.runPythonAsync(payload.script);
      self.postMessage({ id, type: 'RESULT', payload: { result: result?.toJs?.() ?? result } });
    }
  } catch (error) {
    self.postMessage({ id, type: 'ERROR', payload: { error: String(error) } });
  }
});
```

### Python service on the Angular side

```typescript
// infrastructure/adapters/python-engine.service.ts
@Injectable({ providedIn: 'root' })
export class PythonEngineService implements OnDestroy {
  private worker: Worker | null = null;
  private readonly pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  readonly isReady = signal(false);
  readonly isRunning = signal(false);

  async initialize(): Promise<void> {
    this.worker = new Worker(new URL('../workers/python.worker', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event) => this.handleMessage(event);

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type: 'INIT' });
    });
  }

  async runScript(script: string): Promise<unknown> {
    if (!this.isReady()) throw new Error('Pyodide not initialized');

    this.isRunning.set(true);
    try {
      return await new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        this.pendingRequests.set(id, { resolve, reject });
        this.worker!.postMessage({ id, type: 'RUN_SCRIPT', payload: { script } });
      });
    } finally {
      this.isRunning.set(false);
    }
  }

  private handleMessage(event: MessageEvent): void {
    const { id, type, payload } = event.data;
    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    this.pendingRequests.delete(id);

    if (type === 'INIT_SUCCESS') {
      this.isReady.set(true);
      pending.resolve();
    } else if (type === 'RESULT') {
      pending.resolve(payload.result);
    } else if (type === 'ERROR') {
      pending.reject(new Error(payload.error));
    }
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
  }
}
```

### Pyodide rules

- **Always** use a Web Worker — never load Pyodide on the main thread.
- Manage `isReady` and `isRunning` state with signals for UI feedback.
- Python scripts are externalized into dedicated `.py` files (assets), not written inline in services.
- Convert Pyodide results to JS with `.toJs()` before using them.
- Show a loading indicator during Pyodide initialization (can be long).

---

## 10. PrimeNG — Best practices

```typescript
// ✅ Import only the PrimeNG components you use
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

@Component({
  standalone: true,
  imports: [ButtonModule, TableModule, DialogModule],
})
```

```html
<!-- ✅ PrimeNG accessibility -->
<p-table
  [value]="networkNodes()"
  [loading]="isLoading()"
  [attr.aria-label]="'NETWORK.NODES_TABLE' | translate"
  role="table">

  <ng-template pTemplate="header">
    <tr>
      <th scope="col" pSortableColumn="name">
        {{ 'NODE.NAME' | translate }}
        <p-sortIcon field="name" />
      </th>
    </tr>
  </ng-template>

  <ng-template pTemplate="body" let-node>
    <tr>
      <td>{{ node.name }}</td>
    </tr>
  </ng-template>
</p-table>

<!-- ✅ Dialog with focus trap -->
<p-dialog
  [(visible)]="isDialogVisible"
  [modal]="true"
  [closeOnEscape]="true"
  [header]="'DIALOG.TITLE' | translate"
  role="dialog"
  [attr.aria-labelledby]="'dialog-title'">
</p-dialog>
```

### PrimeNG rules

- Never modify PrimeNG styles via global selectors — use PrimeNG CSS variables or theming.
- Always provide appropriate `aria-*` attributes on complex PrimeNG components.
- Use `p-button` with a visible text `<span>`, not only an icon.
- PrimeNG forms use `ReactiveFormsModule` with signals via `toSignal()`.

---

## 11. Error handling & loading states

```typescript
// ✅ State management pattern with signals
@Component({...})
export class FeatureComponent {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<SomeData[]>([]);

  // computed for UI state
  readonly hasError = computed(() => this.error() !== null);
  readonly isEmpty = computed(() => !this.isLoading() && this.data().length === 0);

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.someUseCase.execute();
      this.data.set(result);
    } catch (err) {
      this.error.set(this.translate.instant('ERRORS.LOAD_FAILED'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

```html
<!-- ✅ Template with accessible loading states -->
<div class="feature" [attr.aria-busy]="isLoading()">
  @if (isLoading()) {
    <p-progressSpinner
      aria-label="{{ 'LOADING.MESSAGE' | translate }}"
      role="status" />
  }

  @if (hasError()) {
    <p-message
      severity="error"
      [text]="error()!"
      role="alert"
      aria-live="assertive" />
  }

  @if (isEmpty() && !hasError()) {
    <p class="feature__empty" role="status">
      {{ 'FEATURE.EMPTY_STATE' | translate }}
    </p>
  }

  @if (!isLoading() && !hasError() && data().length > 0) {
    <!-- Main content -->
  }
</div>
```

---

## 12. Unit tests (Jest)


### Mandatory test coverage

#### Deprecated Angular testing modules — Forbidden

**It is strictly forbidden to use deprecated Angular testing modules such as `HttpClientTestingModule` in any test.**

- Always use the latest Angular testing utilities and best practices for mocking HTTP and other dependencies.
- Update all legacy tests to remove deprecated modules.
- Refer to the official Angular documentation for up-to-date testing patterns.

```typescript
// ❌ NEVER — deprecated
import { HttpClientTestingModule } from '@angular/common/http/testing';

// ✅ ALWAYS — use modern Angular testing utilities
// e.g., provideHttpClient(), provideMockStore(), etc.
import { provideHttpClient } from '@angular/common/http';
```

> **Rationale:** Deprecated modules may be removed in future Angular versions and can cause maintenance and compatibility issues. Always prefer the official, modern testing APIs.

- **Every new feature, service, or component must have corresponding unit tests before merging.**
- **When modifying existing code, the related tests must be updated or extended** to cover the new/changed behavior.
- Tests must be kept in sync with the implementation at all times — no orphaned tests, no untested features.
- A PR that adds or changes functionality **without updating tests will be rejected**.

### Testing components with signals

```typescript
// ✅ Testing a component with signals
describe('NetworkDiagramComponent', () => {
  let component: NetworkDiagramComponent;
  let fixture: ComponentFixture<NetworkDiagramComponent>;
  let networkServiceMock: jest.Mocked<NetworkService>;

  beforeEach(async () => {
    networkServiceMock = {
      getNetworks: jest.fn().mockResolvedValue([]),
    } as any;

    await TestBed.configureTestingModule({
      imports: [NetworkDiagramComponent],
      providers: [{ provide: NetworkService, useValue: networkServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkDiagramComponent);
    component = fixture.componentInstance;
  });

  it('should set isLoading to false after data loads', async () => {
    expect(component.isLoading()).toBe(false);
    await component.loadData();
    expect(component.isLoading()).toBe(false);
    expect(networkServiceMock.getNetworks).toHaveBeenCalledTimes(1);
  });

  it('should set error signal on failure', async () => {
    networkServiceMock.getNetworks.mockRejectedValue(new Error('Network error'));
    await component.loadData();
    expect(component.hasError()).toBe(true);
  });
});
```

### HTML rendering tests with `data-testid`

All interactive or meaningful HTML elements **must** have a `data-testid` attribute, and every `data-testid` **must** have a corresponding rendering test.

#### Adding `data-testid` in templates

```html
<!-- ✅ ALWAYS — data-testid on interactive/meaningful elements -->
<form [formGroup]="form" data-testid="my-form">
  <input pInputText formControlName="name" data-testid="name-input" />
  <p-select formControlName="type" data-testid="type-select" />
  <button app-btn type="submit" data-testid="submit-btn">Save</button>
  <ul data-testid="items-list">
    @for (item of items; track $index) {
      <li data-testid="item-row">{{ item.name }}</li>
    }
  </ul>
  <span data-testid="result-value">{{ result() ?? 'N/A' }}</span>
</form>
```

#### Writing rendering tests

Use a `getByTestId` helper to query elements by `data-testid`:

```typescript
// ✅ Helper function — define once per describe block
const getByTestId = (testId: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

// ✅ Test form structure rendering
describe('HTML rendering - form structure', () => {
  it('should render the form', () => {
    const form = getByTestId('my-form');
    expect(form).toBeTruthy();
    expect(form?.tagName).toBe('FORM');
  });

  it('should render the name input', () => {
    const input = getByTestId('name-input');
    expect(input).toBeTruthy();
    expect(input?.tagName).toBe('INPUT');
  });

  it('should render the submit button', () => {
    const btn = getByTestId('submit-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
  });
});

// ✅ Test dynamic rendering (lists, conditionals)
describe('HTML rendering - dynamic content', () => {
  it('should render list items for each entry', () => {
    const items = fixture.nativeElement.querySelectorAll('[data-testid="item-row"]');
    expect(items.length).toBe(expectedCount);
  });

  it('should display N/A when result is null', () => {
    expect(getByTestId('result-value')?.textContent).toContain('N/A');
  });

  it('should display computed value after calculation', () => {
    mockService.results.set({ value: 42 });
    fixture.detectChanges();
    expect(getByTestId('result-value')?.textContent).toContain('42');
  });
});

// ✅ Test button states (disabled/enabled)
describe('HTML rendering - button states', () => {
  it('should disable submit when form is invalid', () => {
    const btn = getByTestId('submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should enable submit when form is valid', () => {
    mockForm.patchValue({ name: 'Valid' });
    fixture.detectChanges();
    const btn = getByTestId('submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ✅ Test accessibility attributes
describe('HTML rendering - accessibility', () => {
  it('should set aria-invalid on invalid input', () => {
    control.setErrors({ required: true });
    fixture.detectChanges();
    const input = getByTestId('name-input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  it('should set aria-selected on active item', () => {
    const item = getByTestId('item-row');
    expect(item?.getAttribute('aria-selected')).toBe('true');
  });
});
```

#### `data-testid` rules

- **Every** `<button>`, `<input>`, `<select>`, `<form>`, `<ul>/<ol>`, and result display `<span>`/`<p>` must have a `data-testid`.
- Use **kebab-case** for `data-testid` values: `submit-btn`, `obstacle-name`, `result-oblique`.
- For repeated elements (e.g. list items), use a shared `data-testid` and query with `querySelectorAll`.
- Group rendering tests in dedicated `describe('HTML rendering - ...')` blocks.
- Test **existence** (element is rendered), **tag type**, **disabled/enabled state**, **text content**, and **ARIA attributes**.
- `data-testid` attributes are for **testing only** — they carry no semantic or styling meaning.

---

## 13. Code review checklist

Before each PR, check:

**Language**
- [ ] All code, comments, docs, commit messages, and PR descriptions are in **English**
- [ ] No French or other non-English text in code, comments, or documentation (except i18n translation source text)

**Angular & Signals**
- [ ] `ChangeDetectionStrategy.OnPush` on all components
- [ ] `inject()` used (no constructor injection)
- [ ] Local state managed with `signal()`, `computed()`, `effect()`
- [ ] Components are `standalone: true`
- [ ] No business logic in components
- [ ] `input()` / `output()` used (not `@Input`/`@Output`)

**DDD Architecture**
- [ ] No dependency from domain to infrastructure
- [ ] Use cases in `application/`, implementations in `infrastructure/`
- [ ] Repositories accessed only via their domain interfaces

**SCSS / BEM**
- [ ] BEM naming respected (block, element `__`, modifier `--`)
- [ ] No magic values (use CSS variables)
- [ ] Max nesting depth is 3 levels

**HTML5 / Accessibility**
- [ ] Appropriate semantic tags
- [ ] `aria-*` present on complex interactive elements
- [ ] Alt text on images and icons
- [ ] Keyboard navigation works
- [ ] `data-testid` on all interactive and meaningful elements

**Testing**
- [ ] Every new feature/service/component has unit tests
- [ ] Modified code has updated or extended tests
- [ ] HTML rendering tests exist for every `data-testid` element (structure, states, content)
- [ ] `getByTestId` helper used for DOM assertions
- [ ] Tests cover: existence, tag type, disabled/enabled, text content, ARIA attributes

**i18n**
- [ ] No hardcoded French/English text in templates
- [ ] Translation keys exist in `fr.json` AND `en.json`

**Plotly**
- [ ] `ngZone.runOutsideAngular()` on all Plotly calls
- [ ] `Plotly.purge()` in `ngOnDestroy()`

**Dexie**
- [ ] DB access only via repositories
- [ ] Transactions used for multi-table operations

**Pyodide**
- [ ] Execution only in a Web Worker
- [ ] Loading indicator present during init/execution

**Dead code**
- [ ] No dead code deleted without entry in `deadcode.md` and user validation
- [ ] Any suspected dead code found during this PR is logged in `deadcode.md`

---

## 14. Useful commands

```bash
# Start the development server
npm run start

# Production build
npm run build

# Unit tests
npm run test

# Generate a standalone Angular component
ng g c features/<feature>/presentation/components/<name> --standalone --change-detection OnPush

# Generate a service
ng g s features/<feature>/application/services/<name>

# Lint
npm run lint

# Format
npm run format
```

---

## 15. Dead code detection & tracking

### Mandatory workflow

When you detect potentially dead code during any task (refactoring, code review, feature implementation, debugging), you **must** immediately log it in `./deadcode.md` — **never delete it silently**.

### What qualifies as suspected dead code

- Functions, methods, or classes with **zero references** in the codebase
- Components or services **not imported or routed** anywhere
- Interfaces or types **not used** by any implementation
- Imports that are **unused** after a refactoring
- Files that are **orphaned** (no other file references them)
- Variables or constants that are **never read**
- CSS classes **not referenced** in any template
- Translation keys **not used** in any template or TypeScript file

### How to log dead code

Add an entry to `./deadcode.md` under the **"Pending review"** section using the template defined in that file:

```markdown
### `symbolName` — `path/to/file.ts`
- **Type**: function | class | component | service | variable | import | interface | method | file
- **Reason**: description of why this code appears dead
- **Detected on**: YYYY-MM-DD
- **Status**: ⏳ PENDING REVIEW
```

### Rules

- **NEVER delete suspected dead code directly** — only log it in `deadcode.md`.
- **Only the user can authorize deletion** after reviewing the entry.
- When the user validates deletion, remove the code AND update the entry status in `deadcode.md`.
- If the code is actually used (false positive), update the entry as kept with a justification.
- The dedicated review task is in `plan.md` — **Phase 7**.

---

*This file is the normative reference for development on phlowers-stellar-app. Any deviation must be justified and documented in the corresponding PR.*
