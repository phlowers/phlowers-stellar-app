# Copilot Instructions — phlowers-stellar-app (Stellar)

Angular 21 PWA · Pyodide/Web Worker · Dexie (via `StorageService`) · Plotly.js · PrimeNG · SCSS/BEM · Vitest · Transloco

---

## ESLint hard rules — never violate

- `no-explicit-any` → use proper types, generics, or `unknown`
- `no-restricted-globals` → `window` is **banned** — always `globalThis`
- Component selector: prefix `app-`, kebab-case
- Directive selector: prefix `app`, camelCase

---

## Language

All code, comments, TSDoc, test descriptions, commit messages → **English only**.  
User-facing text → **Transloco** (`{{ 'key' | transloco }}` in templates, `this.transloco.translate('key')` in services).  
**Never use `$localize` or `i18n` attributes** — Angular native i18n has been fully replaced by Transloco.

---

## Import aliases — always, no relative paths

```
@src/*            → src/*
@app/*            → src/app/*
@core/*           → src/app/core/*
@services/*       → src/app/core/services/*
@features/*       → src/app/features/*
@shared/*         → src/app/shared/*
@infrastructure/* → src/app/infrastructure/*
```

---

## Angular — mandatory patterns

Every component: `standalone: true` · `ChangeDetectionStrategy.OnPush` · `inject()` (no constructor DI) · `input()`/`output()` (no `@Input`/`@Output`).  
State: `signal()` / `computed()` / `effect()` — no plain mutable properties.  
Observables in components: always `toSignal()`.  
Control flow: `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor`.

---

## Code organisation — externalize everything

**Never declare interfaces, types, constants, or standalone functions directly inside a component or service file.**  
Always extract them into dedicated co-located files:

| What | File suffix | Example |
|---|---|---|
| Interfaces / types | `.interfaces.ts` | `section-import.interfaces.ts` |
| Constants / error catalogs | `.constantes.ts` | `section-import.constantes.ts` |
| Pure helper functions | `.helpers.ts` | `section-import.helpers.ts` |

Rules:
- A component or service file must **only** contain the class declaration and its Angular metadata.
- Re-export from the feature's public entry point when consumers need access.
- Helpers must be **pure functions** (no side effects, no DI) so they can be tested in isolation.

---

## i18n — Transloco (mandatory)

Angular native i18n (`$localize`, `.xlf`, `i18n` attributes) has been fully replaced by Transloco.  
**Never use `$localize`, `i18n` attributes, or `ng extract-i18n`.**

### Translation files

Two flat JSON files, one per language:
```
public/i18n/en.json
public/i18n/fr.json
```

**Structure: always flat, never nested.**

```json
// ✅ CORRECT
{ "study.tabs.sections": "Sections", "common.actions.save": "Save" }

// ❌ FORBIDDEN — never nest objects
{ "study": { "tabs": { "sections": "Sections" } } }
```

### Key naming conventions

Keys follow a **dotted namespace** structure. Always check `en.json` for an existing key before creating a new one.

| Namespace | Usage | Examples |
|---|---|---|
| `common.*` | Generic text reused across multiple features | `common.actions.save`, `common.actions.cancel`, `common.actions.delete` |
| `domain.*` | Shared business vocabulary (study/studio) | `domain.altitude`, `domain.chainLength`, `domain.referenceSupport` |
| `routes.*` | Browser tab titles (via `TranslocoTitleStrategy`) | `routes.login`, `routes.study`, `routes.admin` |
| `pythonError.*` | Python engine error messages | `pythonError.solverError`, `pythonError.convergenceError` |
| `<feature>.shared.*` | Text reused by multiple components within ONE feature | `study.shared.duplicate`, `fieldMeasuring.shared.skyCover.n1` |
| `<feature>.<component>.*` | Text specific to a single component | `sectionsTab.colName`, `supportsTable.colNumber`, `manualSection.tabGeneral` |

**Key construction rules:**
- Use `camelCase` for each segment: `sectionsTab.colName` not `sections-tab.col-name`
- Be specific: `supportsTable.ariaChainName` not `supportsTable.aria1`
- Aria labels: suffix `aria*` — `supportsTable.ariaOpenAttachmentModal`
- Placeholder text: suffix `placeholder*` — `sectionsTab.placeholderViewIC`
- Notification messages: `<feature>.notifications.*` — `study.notifications.sectionCreated`
- Error messages from services: `<service>.errorName` — `sectionImport.fileReadError`
- Interpolated values: use `{{ param }}` syntax — `"sectionImport.reprojectionInfo": "Error of {{ error }} m"`

**Before creating any key:** search `public/i18n/en.json` for the English text. If it exists under `common.*` or `domain.*`, reuse it — never duplicate.

### Template usage

```html
<!-- Static text -->
<span>{{ 'study.tabs.sections' | transloco }}</span>

<!-- Attribute binding -->
<input [placeholder]="'sectionsTab.placeholderViewIC' | transloco">
<button [attr.aria-label]="'supportsTable.ariaOpenAttachmentModal' | transloco">

<!-- Interpolation with params -->
<span>{{ 'sectionImport.reprojectionInfo' | transloco: { error: value } }}</span>
```

### TypeScript usage

```typescript
import { TranslocoService } from '@jsverse/transloco';

private readonly transloco = inject(TranslocoService);

// Simple key
this.transloco.translate('study.notifications.sectionCreated')

// With interpolation params
this.transloco.translate('sectionImport.reprojectionInfo', { appName: env.appName, error: n.toFixed(1) })
```

### Required imports — checklist

**Components using the pipe in templates:**
```typescript
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  imports: [..., TranslocoPipe],
})
```

**Services using `TranslocoService`:**
```typescript
import { TranslocoService } from '@jsverse/transloco';
private readonly transloco = inject(TranslocoService);
```

### Static constant files — factory pattern

`$localize` cannot be used in static constant files (evaluated at module load, before DI).  
**Pattern: export translation key constants, translate in the injectable consumer.**

```typescript
// my-feature.constantes.ts — export keys, not translated strings
export const MY_ERROR_KEYS = {
  notFound: 'myFeature.notFound',
  invalid: 'myFeature.invalid',
} as const;

// my-feature.service.ts — translate via injected TranslocoService
import { MY_ERROR_KEYS } from './my-feature.constantes';
private readonly transloco = inject(TranslocoService);

this.transloco.translate(MY_ERROR_KEYS.notFound)
```

**Alternative for dropdown options — factory function:**
```typescript
// my-feature.constantes.ts
export const createMyOptions = (transloco: TranslocoService): SelectOption[] => [
  { label: transloco.translate('myFeature.optionA'), value: 'A' },
  { label: transloco.translate('myFeature.optionB'), value: 'B' },
];

// component
readonly options = createMyOptions(this.transloco);
```

### Router titles — TranslocoTitleStrategy

Route `title:` properties must use plain translation keys — never `$localize`:

```typescript
// ✅ CORRECT
{ path: 'login', title: 'routes.login', ... }

// ❌ FORBIDDEN
{ path: 'login', title: $localize`Login`, ... }
```

`TranslocoTitleStrategy` at `src/app/core/strategies/transloco-title.strategy.ts`
intercepts each navigation and calls `transloco.translate(title)` automatically.

### Runtime language configuration

The active language is set at startup from `public/assets/config/app-config.json`:
```json
{ "defaultLang": "fr" }
```
This file is written by Docker/Jenkins post-deploy. **Do not hardcode the language anywhere.**  
`AppConfigService` at `src/app/core/config/app-config.service.ts` handles the loading.  
Fallback: `'fr'` (silent try/catch if file is absent).

### Known limitation — STOP #2

`manualSection.component.ts` line 101 intentionally retains `$localize` for the PrimeNG paginator  
(`{first}`, `{last}`, `{totalRecords}` placeholders are incompatible with Transloco interpolation).  
A `// TODO: STOP #2` comment is in place. Do not migrate this line.

---

## UUID

Always `import { v4 as uuidv4 } from 'uuid'` — never `crypto.randomUUID()`.

---

## Dexie — real pattern

`AppDatabase` is owned by `StorageService`. **Never instantiate it directly.**

```typescript
private readonly storageService = inject(StorageService);

readonly dbReady = toSignal(this.storageService.ready$, { initialValue: false });

await this.storageService.db.studies.toArray();

const db = this.storageService.db;
await db.transaction('rw', [db.studies, db.metadata], async () => { ... });
```

Schema migrations: `this.version(N).stores({...}).upgrade(...)` in `AppDatabase`.

---

## Plotly

```typescript
import * as Plotly from 'plotly.js-dist-min';

this.ngZone.runOutsideAngular(() => Plotly.newPlot(el, data, layout));
this.ngZone.runOutsideAngular(() => Plotly.react(el, data, layout));

ngOnDestroy(): void { Plotly.purge(this.chartContainer.nativeElement); }
```

Chart container: `role="img"` + descriptive `aria-label`.

### Studio 3D section plot — modebar camera buttons

**`zoom3d` and `pan3d` MUST remain in `modeBarButtonsToRemove` and replaced by custom buttons.**

Native `zoom3d`/`pan3d` call `Plotly.relayout` → `updateFx()` internally, which resets the 3D camera — regression bug #703.  
The custom replacements (`customZoom3d`, `customPan3d`) use `setDragmodeDirect()` which bypasses `relayout` and preserves the camera.

**Never revert these to native Plotly buttons. Never call `Plotly.relayout` with `scene.dragmode` in the section plot.**

File: `src/app/shared/components/studio/section/helpers/createPlot.ts` — `getConfig()`.

### Studio section plot — annotations

**Never build a clickable icon annotation manually.**  
Always use `buildClickableIconAnnotation` from `@shared/components/studio/section/helpers/createClickableIconAnnotation`.

```typescript
buildClickableIconAnnotation({
  x, y, z,
  icon: '&#xf5cd;',
  color: '#4A355A',
  arrowYOffset: -50,
  data: { type: 'myType', uuid: '...' }
});
```

**Exception:** obstacle annotations use Unicode markers + label (`showarrow: false`) — do NOT use this helper.

---

## Pyodide

Use `WorkerPythonService` at `@services/worker_python/worker-python.service`.

```typescript
const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.xxx, inputs);
readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });
```

---

## PrimeNG

- Import individual modules only — never a barrel
- Style overrides via PrimeNG CSS variables only — **no global selectors**
- `p-button` should be replaced by `app-btn` (custom wrapper) for consistent styling
- `p-message` for inline errors (`severity="error"`, `role="alert"` where appropriate)
- Forms: `ReactiveFormsModule` + `toSignal()` for signal integration

---

## Logging & User notifications

- Never use `console.log`, `console.warn`, or `console.error`
- Technical logs → `LoggerService`
- User-facing feedback → `NotificationService` (error/warning/info/success)
- If both needed: `LoggerService` for technical details + `NotificationService` for user feedback

---

## HTML5 & Accessibility

Semantic tags: `<main>` · `<header>` · `<section>` · `<nav>` · `<aside>`.

```html
<div [attr.aria-busy]="isLoading()">
  <div role="alert" aria-live="assertive"><!-- errors --></div>
  <p role="status"><!-- non-critical status --></p>
</div>
```

- `aria-live="assertive"` for errors · `aria-live="polite"` for notifications
- `[attr.aria-busy]="isLoading()"` on loading containers
- All `<input>` associated with `<label>` via `for`/`id` or `aria-labelledby`
- Decorative icons: `aria-hidden="true"` · Interactive icons: `aria-label`
- WCAG AA contrast minimum (4.5:1)

---

## SCSS — BEM strict, max 3 levels

```scss
.my-component {
  gap: var(--spacing-md);

  &__header { }
  &__header--sticky { }

  &__item {
    &--selected { } // level 3 — stop here
  }
}
```

One SCSS file per component. Tailwind only in HTML templates for one-off tweaks.

---

## Tests — Vitest, mandatory before merge

Every new feature/service/component requires unit tests. **PR without tests is rejected.**  
Modified code → update existing tests. No orphaned tests, no untested features.

### `vi` only — `jest.*` is forbidden

```typescript
import { vi } from 'vitest'; // only for vi.mock() / vi.hoisted()

// ✅
vi.fn() · vi.spyOn() · vi.mock() · vi.hoisted() · vi.Mocked<T>
// ❌ FORBIDDEN
jest.fn() · jest.spyOn() · jest.mock() · jest.Mocked<T>
```

### HTTP mocking

```typescript
// ✅
providers: [provideHttpClient(), provideHttpClientTesting()]
// ❌ FORBIDDEN — deprecated
import { HttpClientTestingModule }
```

### `data-testid` — required on all interactive/meaningful elements

- kebab-case values: `submit-btn` · `name-input` · `items-list`
- Repeated elements: shared `data-testid`, queried with `querySelectorAll`

```html
<form data-testid="my-form">
  <input data-testid="name-input" />
  <button type="submit" data-testid="submit-btn">{{ 'common.actions.save' | transloco }}</button>
</form>
```

### Rendering tests structure

```typescript
const getByTestId = (id: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

describe("HTML rendering - form structure", () => {
  it("should render the form", () => {
    expect(getByTestId("my-form")?.tagName).toBe("FORM");
  });
});
```

---

## Skills

- `/skill-plan`: Architect mode — break a feature into atomic steps in `plan.md`
- `/skill-agent`: Executor mode — implement exactly one step from `plan.md`
- `/skill-test`: Tester mode — add/update Vitest unit tests
- `/skill-fix-test`: Test repairer mode — fix failing tests without lowering coverage
- `/skill-review`: Senior auditor mode — review a step (PASS/WARN/FAIL)
- `/skill-rebase`: Mediator mode — resolve merge/rebase conflicts with zero logic loss

---

## Dead code

Never delete silently. Log in `./deadcode.md` under "Pending review". Delete only after user validation.

---

## Git policy

- Never run `git commit`
- Never run `git push`
- If a commit or push is needed, ask the user to run it manually

---

## Commands

```bash
npm run start          # dev server
npm run test           # vitest once
npm run test:watch     # vitest watch
npm run lint-check     # eslint
npm run build          # single production build (both languages bundled)
ng g c features/<feat>/presentation/components/<name> --standalone --change-detection OnPush
ng g s features/<feat>/application/services/<name>
```