# Copilot Instructions — phlowers-stellar-app (Stellar)

Angular 19 PWA · Pyodide/Web Worker · Dexie (via `StorageService`) · Plotly.js · PrimeNG · SCSS/BEM · Vitest

---

## ESLint hard rules — never violate

- `no-explicit-any` → use proper types, generics, or `unknown`
- `no-restricted-globals` → `window` is **banned** — always `globalThis`
- Component selector: prefix `app-`, kebab-case
- Directive selector: prefix `app`, camelCase

---

## Language

All code, comments, TSDoc, test descriptions, commit messages → **English only**.  
Exception: user-facing text uses `i18n` attribute or `$localize`.

---

## Comments

Single-line comments → **always `//`**. Never use a `/** */` or `/* */` block on a single line.  
Reserve `/** */` (TSDoc) for genuine multi-line documentation of exported APIs.

```typescript
// ✅
// Distance between the two supports, in meters
/** ❌ FORBIDDEN on a single line */
```

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
| Constants / error catalogs / i18n strings | `.constantes.ts` | `section-import.constantes.ts` |
| Pure helper functions | `.helpers.ts` | `section-import.helpers.ts` |

Rules:
- A component or service file must **only** contain the class declaration and its Angular metadata.
- Re-export from the feature's public entry point when consumers need access.
- Helpers must be **pure functions** (no side effects, no DI) so they can be tested in isolation.

---

## i18n — Angular native ONLY

**`TranslateService` does not exist. `translate` pipe does not exist. Never use them.**

```typescript
// TypeScript
this.notificationService.error($localize`Error creating user`);
const ERRORS = { [TaskError.CALCULATION_ERROR]: $localize`Calculation error` };

// Templates
<h1 i18n="@@studies.title">Studies</h1>
```

After adding `i18n` / `$localize`: run `npm run extract-i18n`.  
Files: `assets/i18n/messages.xlf` (en source) · `messages.fr.xlf`.

---

## UUID

Always `import { v4 as uuidv4 } from 'uuid'` — never `crypto.randomUUID()`.

---

## Dexie — real pattern

`AppDatabase` is owned by `StorageService`. **Never instantiate it directly.**

```typescript
private readonly storageService = inject(StorageService);

// Wait for readiness
readonly dbReady = toSignal(this.storageService.ready$, { initialValue: false });

// Access
await this.storageService.db.studies.toArray();

// Multi-table ops → transaction
const db = this.storageService.db;
await db.transaction('rw', [db.studies, db.metadata], async () => { ... });
```

Schema migrations: `this.version(N).stores({...}).upgrade(...)` in `AppDatabase`.

---

## Plotly

```typescript
import * as Plotly from 'plotly.js-dist-min';

this.ngZone.runOutsideAngular(() => Plotly.newPlot(el, data, layout));
this.ngZone.runOutsideAngular(() => Plotly.react(el, data, layout)); // updates only

ngOnDestroy(): void { Plotly.purge(this.chartContainer.nativeElement); }
```

Chart container: `role="img"` + descriptive `aria-label`.

### Studio 3D section plot — modebar camera buttons

**`zoom3d` and `pan3d` MUST remain in `modeBarButtonsToRemove` and replaced by custom buttons.**

Native `zoom3d`/`pan3d` call `Plotly.relayout` → `updateFx()` internally, which resets the 3D camera (POV, angle, zoom) — regression bug #703.  
The custom replacements (`customZoom3d`, `customPan3d`) use `setDragmodeDirect()` which bypasses `relayout` and preserves the camera.  
Same applies to `orbitRotation` / `tableRotation` → `customOrbitRotation` / `customTurntableRotation`.

**Never revert these to native Plotly buttons. Never call `Plotly.relayout` with `scene.dragmode` in the section plot.**

File: `src/app/shared/components/studio/section/helpers/createPlot.ts` — `getConfig()`.

### Studio section plot — annotations

**Never build a clickable icon annotation (FontAwesome icon + arrow) manually.**  
Always use `buildClickableIconAnnotation` from `@shared/components/studio/section/helpers/createClickableIconAnnotation`.

```typescript
import { buildClickableIconAnnotation } from '@shared/components/studio/section/helpers/createClickableIconAnnotation';

buildClickableIconAnnotation({
  x, y, z,
  icon: '&#xf5cd;',   // FontAwesome HTML entity
  color: '#4A355A',
  arrowYOffset: -50,
  arrowXOffset: 0,        // optional, defaults to 0
  data: { type: 'myType', uuid: '...' }  // payload for plotly_clickannotation
});
```

Applies to: span load annotations, cable modification annotations, and any new clickable icon annotation on the studio section plot.  
**Exception:** obstacle annotations use a different rendering model (Unicode markers + label, `showarrow: false`) and must NOT use this helper.

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
- `p-button` should be replaced by `app-btn` (custom wrapper) for consistent styling and behavior
- `p-message` for inline errors (use `severity="error"`, `role="alert"` where appropriate)
- Forms: `ReactiveFormsModule` + `toSignal()` for signal integration

---

## Logging & User notifications

- Never use `console.log`, `console.warn`, or `console.error`
- For technical logs, always use `LoggerService`
- For user-facing error/warning/info/success notifications, always use `NotificationService`
- If both are needed, log technical details with `LoggerService` and show user feedback with `NotificationService`

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
  gap: var(--spacing-md); // CSS variables only — no magic numbers

  &__header {
  }
  &__header--sticky {
  }

  &__item {
    &--selected {
    } // level 3 — stop here
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
// Globals (no import): describe it expect beforeEach afterEach
// vi.Mocked<T> vi.Mock vi.MockedFunction → globally typed via src/vitest.d.ts
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

- kebab-case values: `submit-btn` · `name-input` · `items-list` · `result-value`
- Repeated elements: shared `data-testid`, queried with `querySelectorAll`
- For testing only — no semantic or styling meaning

```html
<form data-testid="my-form">
  <input data-testid="name-input" />
  <ul data-testid="items-list">
    @for (item of items(); track item.uuid) {
    <li data-testid="item-row">{{ item.name }}</li>
    }
  </ul>
  <span data-testid="result-value">{{ result() ?? 'N/A' }}</span>
  <button type="submit" data-testid="submit-btn">Save</button>
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

describe("HTML rendering - dynamic content", () => {
  it("should render one row per item", () => {
    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="item-row"]',
    );
    expect(rows.length).toBe(3);
  });
  it("should show N/A when result is null", () => {
    expect(getByTestId("result-value")?.textContent).toContain("N/A");
  });
});

describe("HTML rendering - button states", () => {
  it("should disable submit when form is invalid", () => {
    expect((getByTestId("submit-btn") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("HTML rendering - accessibility", () => {
  it("should set aria-invalid on invalid input", () => {
    expect(getByTestId("name-input")?.getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});
```

---

## Skills

Use these project skills for focused workflows. Trigger them when the user request matches the listed intent or keywords.

- `/skill-plan`: Architect mode to break a feature/task into atomic steps in `plan.md`.
  Use when: planning, decomposition, architecture design, step-by-step delivery.
- `/skill-agent`: Executor mode to implement exactly one step from `plan.md`.
  Use when: implementing step N, executing a planned step, applying a defined scope.
- `/skill-test`: Tester mode to add/update Vitest unit tests with strong coverage.
  Use when: writing tests, increasing coverage, creating/updating `*.spec.ts`.
- `/skill-fix-test`: Test repairer mode to detect and fix failing tests without lowering coverage.
  Use when: red tests, regression after refactor, broken specs.
- `/skill-review`: Senior auditor mode to review an implemented step and report PASS/WARN/FAIL.
  Use when: code audit, regression check, quality gate before next step.
- `/skill-rebase`: Mediator mode to resolve merge/rebase conflicts with zero logic loss.
  Use when: conflict markers, rebase conflict, merge/cherry-pick conflict.

Rule of thumb:

- Plan first with `/skill-plan` for non-trivial work
- Implement one step at a time with `/skill-agent`
- Validate with `/skill-test` and `/skill-review`
- Use `/skill-fix-test` for failing suites and `/skill-rebase` for git conflicts

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
npm run start          # dev (default locale)
npm run start:fr       # dev French
npm run test           # vitest once
npm run test:watch     # vitest watch
npm run lint-check     # eslint
npm run extract-i18n   # after i18n changes
ng g c features/<feat>/presentation/components/<name> --standalone --change-detection OnPush
ng g s features/<feat>/application/services/<name>
```
