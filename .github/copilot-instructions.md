# Copilot Instructions — phlowers-stellar-app (Stellar)

Angular 19 PWA · Pyodide/Web Worker · Dexie (via `StorageService`) · Plotly.js · PrimeNG · SCSS/BEM · Vitest

---

## ESLint hard rules — never violate

- `no-explicit-any` → proper types, generics, or `unknown`
- `no-restricted-globals` → `window` banned, use `globalThis`
- Component selector: `app-` prefix, kebab-case
- Directive selector: `app` prefix, camelCase

---

## Language

English only: code, comments, TSDoc, test descriptions, commit messages.
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
@src/* → src/*
@app/* → src/app/*
@core/* → src/app/core/*
@services/* → src/app/core/services/*
@features/* → src/app/features/*
@shared/* → src/app/shared/*
@infrastructure/* → src/app/infrastructure/*
```

---

## Angular — mandatory patterns

Every component: `standalone: true` · `ChangeDetectionStrategy.OnPush` · `inject()` (no constructor DI) · `input()`/`output()` (no `@Input`/`@Output`).
State: `signal()` / `computed()` / `effect()` — no plain mutable properties.
Observables in components: always `toSignal()`.
Control flow: `@if` / `@for` / `@switch` only — never `*ngIf` / `*ngFor`.

---

## Code organisation — externalize everything

Never declare interfaces, types, constants, or standalone functions inside a component/service file. Extract to co-located files:

| What | Suffix |
|---|---|
| Interfaces / types | `.interfaces.ts` |
| Constants / error catalogs / i18n strings | `.constantes.ts` |
| Pure helper functions | `.helpers.ts` |

Component/service files contain only the class + Angular metadata. Helpers are pure (no side effects, no DI).

---

## UUID

Always `import { v4 as uuidv4 } from 'uuid'` — never `crypto.randomUUID()`.

---

## Dexie

`AppDatabase` owned by `StorageService`. Never instantiate directly.
Access via `inject(StorageService)` → `storageService.db.xxx`.
Readiness: `toSignal(storageService.ready$, { initialValue: false })`.
Multi-table ops → `db.transaction('rw', [...], async () => {...})`.
Schema migrations: `this.version(N).stores({...}).upgrade(...)` in `AppDatabase`.

---

## Plotly

```typescript
import * as Plotly from 'plotly.js-dist-min';
this.ngZone.runOutsideAngular(() => Plotly.newPlot(el, data, layout));
ngOnDestroy(): void { Plotly.purge(this.chartContainer.nativeElement); }
```
Chart container: `role="img"` + descriptive `aria-label`.

**Studio 3D section plot:** `zoom3d`/`pan3d` must stay in `modeBarButtonsToRemove`, replaced by custom `customZoom3d`/`customPan3d` (use `setDragmodeDirect()`, bypasses `relayout` which resets camera — regression bug #703). Same for `orbitRotation`/`tableRotation`. Never call `Plotly.relayout` with `scene.dragmode` in the section plot. File: `createPlot.ts` → `getConfig()`.

**Studio annotations:** always use `buildClickableIconAnnotation` (`createClickableIconAnnotation.ts`) for clickable icon annotations — never build manually. Exception: obstacle annotations (different rendering model, `showarrow: false`).

---

## Pyodide

`WorkerPythonService` at `@services/worker_python/worker-python.service`.
```typescript
const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.xxx, inputs);
readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });
```

---

## PrimeNG

Individual module imports only, never a barrel. Style overrides via CSS variables only — no global selectors. `p-button` → replace with `app-btn`. `p-message` for inline errors (`severity="error"`, `role="alert"`). Forms: `ReactiveFormsModule` + `toSignal()`.

---

## Logging & notifications

Never `console.log`/`warn`/`error`. Technical logs → `LoggerService`. User-facing feedback → `NotificationService`.

---

## HTML5 & Accessibility

Semantic tags: `<main>` `<header>` `<section>` `<nav>` `<aside>`.
`aria-live="assertive"` for errors, `"polite"` for notifications. `[attr.aria-busy]="isLoading()"` on loading containers. Every `<input>` linked to a `<label>`. Decorative icons `aria-hidden="true"`, interactive icons `aria-label`. WCAG AA contrast (4.5:1).

---

## SCSS — BEM strict, max 3 levels

CSS variables only, no magic numbers. One file per component. Tailwind only in HTML for one-off tweaks.
`.block__element--modifier` — stop at 3 levels deep.

---

## Tests — Vitest, mandatory before merge

Every new feature/service/component needs unit tests. PR without tests is rejected. Modified code → update existing tests, no orphaned tests.

`vi` only (`vi.fn()`, `vi.spyOn()`, `vi.mock()`, `vi.hoisted()`) — `jest.*` forbidden.
HTTP mocking: `provideHttpClient()` + `provideHttpClientTesting()` — `HttpClientTestingModule` forbidden (deprecated).
`data-testid` required on all interactive/meaningful elements, kebab-case (`submit-btn`, `name-input`). Repeated elements share a `data-testid`, queried via `querySelectorAll`. Testing purpose only, no semantic/styling meaning.

---

## RTK — commandes terminal

Toujours préfixer les commandes shell compatibles par `rtk` (ex: `rtk git status`, `rtk npm test`) pour réduire la sortie envoyée au contexte. Ne pas préfixer une commande non supportée. `rtk proxy <commande>` uniquement si un suivi sans filtrage est nécessaire.

---

> ⚠️ TEMPORAIRE — section à retirer une fois la migration Transloco terminée sur cette feature.

## Migration i18n Angular → Transloco (Stellar)

**Structure des clés : à plat, jamais imbriquée.** Un seul objet JSON par langue (`public/i18n/en.json`, `public/i18n/fr.json`). Chaque clé est une chaîne complète au premier niveau, même avec des points :
```json
{ "auth.login.title": "Sign in", "common.actions.save": "Save" }
```
Ne jamais créer d'objet imbriqué type `{"auth": {"login": {...}}}`.

**Namespaces**
- `common.*` — texte générique réutilisé
- `domain.*` — vocabulaire métier partagé study/studio
- `<feature>.shared.*` — texte réutilisé dans une feature
- `<feature>.<composant>.*` — texte propre à un composant

Avant de créer une clé locale, vérifier si elle existe déjà sous `common.*`/`domain.*` dans `en.json` — réutiliser, ne pas dupliquer.

**Ce qui est traduisible — 3 cas seulement**
1. Contenu d'un élément avec attribut `i18n`
2. Valeur d'un attribut `i18n-xxx`
3. Appel `$localize\`...\``

Ne jamais toucher : noms de balises/attributs, valeurs d'attributs non marquées `i18n-*` (même si ressemblant à de l'anglais), correspondance trouvée par simple recherche texte hors marqueur i18n. En cas de doute → laisser tel quel et signaler.

**Imports requis — checklist systématique**
```typescript
// Composants avec template
import { TranslocoModule } from '@jsverse/transloco';
@Component({ imports: [TranslocoModule, ...] })

// Services
import { TranslocoService } from '@jsverse/transloco';
private readonly translocoService = inject(TranslocoService);
this.translocoService.instant('common.key');
```
Validation : clés pointillées correctes, module/service importé, clés présentes dans `en.json` et `fr.json`.

---

## Caveman — réponses compressées

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

---

## Skills

Trigger only on explicit match — planning (`/skill-plan`), implementing a defined step (`/skill-agent`), writing/updating tests (`/skill-test`), fixing failing tests (`/skill-fix-test`), auditing an implemented step (`/skill-review`), resolving rebase/merge conflicts (`/skill-rebase`).

---

## Dead code

Never delete silently. Log in `./deadcode.md` under "Pending review". Delete only after user validation.

---

## Git policy

Never run `git commit`/`git push`. If needed, ask the user to run it manually.

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
