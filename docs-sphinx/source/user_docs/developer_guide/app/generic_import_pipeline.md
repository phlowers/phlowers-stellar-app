# Generic Import Pipeline

This document explains the architecture of the reusable import feature shared by **Study** and **Section** contexts.

---

## Overview

The import system is built around three layers:

| Layer | Role |
|---|---|
| **`ImportComponent`** | Generic UI: file picker, outcomes list, collision dialog |
| **`GenericImportEngineService`** | Pipeline orchestration: validate → collision check → process |
| **`ImportAdapter<T>`** | Context-specific business logic: parse, validate, persist |

The UI and the engine know nothing about Study or Section. They only depend on the `ImportAdapter` interface, resolved at runtime via Angular's DI system using `IMPORT_ADAPTER_TOKEN`.

---

## Key files

```
src/app/shared/import/
  domain/
    import-contracts.ts                  ← barrel re-export (public API)
    import-contracts.interfaces.ts       ← all types and interfaces
    import-contracts.constantes.ts       ← IMPORT_ADAPTER_TOKEN
  application/services/
    generic-import-engine.service.ts     ← pipeline orchestrator

src/app/shared/components/import/
  import.component.ts                    ← generic UI component
  import.component.html
  import.component.scss

src/app/features/studies/application/services/
  study-import.service.ts                ← Study adapter (CSV / CLST)

src/app/features/study/application/services/
  section-import.service.ts              ← Section adapter (JSON)
  section-import.constantes.ts           ← section error messages

src/app/features/study/.../import-section/
  import-section.component.ts            ← Section host wrapper
  import-section.constantes.ts           ← SECTION_IMPORT_CONFIG
```

---

## The `ImportAdapter` interface

Any context that wants to plug into the generic import system must implement this interface:

```typescript
interface ImportAdapter<TEntity = unknown> {
  accepts(file: File): boolean;
  checkCollision(file: File): Promise<{ uuid: string; label: string } | null>;
  processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<TEntity | null>;
}
```

| Method | Stage | Responsibility |
|---|---|---|
| `accepts(file)` | `FILE_VALIDATION` | Return `true` if the file extension/type is supported |
| `checkCollision(file)` | `COLLISION_CHECK` | Read the UUID from the file and check if an entity already exists |
| `processFile(file, resolver)` | `DECODING → PERSISTENCE` | Parse, validate, map, and persist the entity |

---

## The `IMPORT_ADAPTER_TOKEN`

```typescript
export const IMPORT_ADAPTER_TOKEN = new InjectionToken<ImportAdapter>('IMPORT_ADAPTER_TOKEN');
```

This DI token is the bridge between the generic engine and a context-specific adapter. The host component is responsible for binding the right service to this token in its `providers` array.

---

## The `ImportContextConfig` input

`ImportComponent` accepts a single required input of type `ImportContextConfig`:

```typescript
interface ImportContextConfig {
  acceptedFiles: AcceptedFileSpec;          // required — drives the <input accept> attribute and hint text
  entityLabel: string;                      // required — used in the collision confirmation message
  texts?: {
    uploadPrompt?: string;                  // replaces "Upload one or several files" + sets aria-label
    description?: string;                  // optional paragraph shown above the upload zone
  };
  navigationRoute?: (entityId: string) => string;  // if set, renders an "Open" link on each success item
}
```

**Effect of each property on the rendered UI:**

| Property | Effect |
|---|---|
| `acceptedFiles.extensions` + `mimeTypes` | Computes the `[accept]` attribute on the file `<input>` |
| `acceptedFiles.hint` | Displayed as a sub-label inside the upload zone |
| `texts.description` | Paragraph rendered above the upload zone (hidden if absent) |
| `texts.uploadPrompt` | Upload zone main text and `aria-label` on the input |
| `entityLabel` | Inserted into the collision dialog: *"Section X already exists…"* |
| `navigationRoute` | Renders a `<a [routerLink]="...">` button on each successfully imported item |

---

## Pipeline stages

For each file, the engine runs these stages in order:

```
FILE_VALIDATION
    └─ adapter.accepts(file)
           └─ rejected? → outcome: error (FILE_TYPE_NOT_ALLOWED)

COLLISION_CHECK
    └─ adapter.checkCollision(file)
           └─ collision found? → show confirmation dialog
                  └─ user rejects → outcome: skipped
                  └─ user accepts → continue with pre-approved resolver

DECODING → PARSING → VALIDATION → MAPPING → PERSISTENCE
    └─ adapter.processFile(file, resolver)
           └─ returns entity → outcome: success
           └─ returns null   → outcome: skipped
           └─ throws ImportError → outcome: error
```

Files are processed **sequentially** — one confirmation dialog at a time.

---

## How to wire a new context

**1. Create a service implementing `ImportAdapter<YourEntity>`:**

```typescript
@Injectable()
export class YourImportService implements ImportAdapter<YourEntity> {
  accepts(file: File): boolean { /* check extension */ }
  async checkCollision(file: File) { /* check UUID */ }
  async processFile(file, resolver) { /* parse + validate + persist */ }
}
```

**2. Create a host wrapper component that provides the adapter:**

```typescript
@Component({
  selector: 'app-import-your-context',
  standalone: true,
  imports: [ImportComponent, ConfirmDialogModule],
  providers: [
    YourImportService,
    { provide: IMPORT_ADAPTER_TOKEN, useExisting: YourImportService },
    ConfirmationService
  ],
  template: `
    <p-confirmdialog key="positionDialog" />
    <app-import [config]="config" (importCompleted)="onImportCompleted($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportYourContextComponent {
  readonly config: ImportContextConfig = YOUR_IMPORT_CONFIG;
  readonly importCompleted = output<ImportOutcome[]>();
  onImportCompleted(outcomes: ImportOutcome[]): void {
    this.importCompleted.emit(outcomes);
  }
}
```

**3. Define your config constant in a `.constantes.ts` file:**

```typescript
export const YOUR_IMPORT_CONFIG: ImportContextConfig = {
  acceptedFiles: { extensions: ['.json'], hint: 'File format: .json' },
  entityLabel: 'Your Entity',
  texts: { description: 'Import a ...', uploadPrompt: 'Upload a file' }
};
```

**4. Use the wrapper in your parent template:**

```html
<app-import-your-context
  (importCompleted)="onImportCompleted($event)"
/>
```

> **Note:** The `ConfirmationService` and `<p-confirmdialog key="positionDialog" />` **must** be provided by the wrapper itself. Do not rely on a parent component having registered them.

---

## DI scoping diagram

```
Host wrapper (ImportYourContextComponent)
  providers:
    YourImportService
    IMPORT_ADAPTER_TOKEN → YourImportService  (useExisting)
    ConfirmationService
  │
  └── <app-import>  (ImportComponent)
        providers:
          GenericImportEngineService   ← scoped instance per <app-import>
        │
        inject(GenericImportEngineService)
        │
        └── GenericImportEngineService
              inject(IMPORT_ADAPTER_TOKEN)  ← resolved to YourImportService
```

Each `<app-import>` instance gets its own `GenericImportEngineService`. The adapter is shared from the parent injector.

---

## Error catalog

Standard error codes thrown by adapters:

| Code | Stage | Meaning |
|---|---|---|
| `FILE_TYPE_NOT_ALLOWED` | `FILE_VALIDATION` | Extension not accepted by `adapter.accepts()` |
| `FILE_READ_ERROR` | `DECODING` | `file.text()` or FileReader failed |
| `FILE_PARSE_ERROR` | `PARSING` | JSON / CSV parse failure |
| `VALIDATION_ERROR` | `VALIDATION` | Business rule violation (missing field, out-of-bounds value…) |
| `PERSISTENCE_ERROR` | `PERSISTENCE` | Storage layer failure |

Adapters may add context-specific codes by extending the `ImportErrorCode` union type.

---

## Output — `importCompleted`

After every file batch, `ImportComponent` emits `ImportOutcome[]` via its `importCompleted` output.

```typescript
interface ImportOutcome {
  fileName: string;
  status: 'success' | 'error' | 'skipped';
  error?: ImportError;     // present when status === 'error'
  entityId?: string;       // present when status === 'success'
  entityLabel?: string;    // present when status === 'success'
}
```

The host wrapper forwards this event upward. The parent (e.g. a modal) can inspect it to close on success:

```typescript
onImportCompleted(outcomes: ImportOutcome[]): void {
  if (outcomes.some(o => o.status === 'success')) {
    this.closeModal();
  }
}
```
