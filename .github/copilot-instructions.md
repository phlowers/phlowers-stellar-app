# Copilot Instructions — phlowers-stellar-app (Stellar)

Angular PWA (see `package.json` for the current version) · Pyodide/Web Worker · Dexie (via
`StorageService`) · Plotly.js · PrimeNG · SCSS/BEM · Vitest · Transloco.

Technology-specific conventions (i18n/Transloco, Vitest tests, SCSS/BEM, Pyodide, Dexie, Studio
section plot) live in `.github/instructions/*.instructions.md` and are loaded automatically only
for matching files — do not duplicate them here.

---

## Language

All code, comments, TSDoc, test descriptions, commit messages → **English only**.
User-facing text → **Transloco**, never `$localize` or `i18n` attributes (see
`.github/instructions/i18n.instructions.md` for the full convention).

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
@adapters/*       → src/adapters/*
@plugins/*        → src/plugins/*
```

---

## Angular — mandatory patterns

Every component: no `standalone: true` (default since Angular 20) · `ChangeDetectionStrategy.OnPush` · `inject()` (no constructor DI) · `input()`/`output()` (no `@Input`/`@Output`).  
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

## Reuse before creating (mutualisation)

Before adding any helper, constant, interface, service, i18n key, or component logic, search the repo for an
existing equivalent (grep the behavior, not only the name) and **reuse or extend it** (optional parameter with
the legacy default) instead of writing a parallel version.

- Same rule used by two features → extract it once in the lowest shared place (feature helpers file if both
  consumers are in the same feature, otherwise `@shared`), and make every consumer use it.
- Same i18n text used by two places → one key under `common.*` (see `i18n.instructions.md`).
- Prefer editing existing files over creating new ones; keep the footprint of a change as small as possible.
- If reuse would force a risky change to an unrelated consumer, ask before diverging.

---

## UUID

Always `import { v4 as uuidv4 } from 'uuid'` — never `crypto.randomUUID()`.

---

## Dates — RFC 9557 raw format

Every raw date string written by the app (persisted timestamps, `.stsec` / `.stsd` / `.clst` exports, JSON export of a
field measure) is RFC 9557: `2026-11-06T16:46:15.869+01:00[Europe/Paris]`. The zone comes from `environment.timeZone`
(fallback `Europe/Paris`). Helpers: `@shared/helpers/date-time.helpers` (docs: `developer_guide/app/date_time_format.md`).

- Write: `nowRfc9557()` / `formatRfc9557(date)` — never `new Date().toISOString()` for a stored or exported date.
- Read: `parseRfc9557(value)` — never `new Date(value)` or the `date` pipe directly on a raw string (neither accepts
  `[Zone]`). In templates: `{{ value | rfc9557ToDate | date: format }}`. Old `...Z` values must keep working.
- Sort / compare raw dates with `compareRfc9557`, never as text (`localeCompare`, Dexie `orderBy`).
- In memory and towards Pyodide, dates stay `Date` objects; only strings written to storage or files are RFC 9557.
- Only the raw format is standard: displayed formats (`date` pipe, `toLocaleDateString`, PDF) are separate and unchanged.
- Field measure `date` / `time` in files: `serializeFieldMeasureDates` / `normalizeFieldMeasureDates`.
- Tests touching dates run in several zones (`TZ=Europe/Paris`, `UTC`, `America/New_York`); never assert a `Z` string.

---

## Terminal commands — RTK

For all shell commands that support it, use RTK to reduce the output sent to the Copilot context
(e.g. `rtk git status`, `rtk git diff`, `rtk rg "pattern" src`, `rtk npm test`). Do not prefix
unsupported commands with `rtk`. Use `rtk proxy <command>` only when unfiltered output is required.

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

## Security

- Never write secrets, tokens, or API keys in source, tests, or config committed to the repo.
- Sanitize any user-provided or imported data (CSV imports, obstacle configuration) before
  rendering it with `[innerHTML]` or interpolating it into a DOM attribute.
- Treat OIDC claims and tokens as sensitive: never log them via `LoggerService`, never persist
  them in Dexie.
- Never copy real/PO-provided production data (real line/site names, internal database IDs or
  UUIDs, GPS/Lambert coordinates, maintenance team or organization names, etc.) into test
  fixtures, specs, or documentation — even as a one-off "realistic" example. Always hand-craft
  fully synthetic values (fake names, out-of-range coordinates, placeholder IDs) before
  committing, and double-check any fixture built from a pasted external file for real identifiers.

---

## Working style

- Ground answers in what is actually observed in this repo (code, config, `package.json`) —
  never invent a file path, folder, or convention. If unsure, search before answering.
- Stop exploring once you have enough context to act; prefer a targeted search over repeated
  broad scans of the repository.
- Keep responses concise: state what changed and why, skip restating unchanged code.

---

## Tests — mandatory with every change

Every requested feature, fix, or modification **must** ship with its corresponding Vitest test(s) in the same
task, without being asked: add new specs or update the existing ones so the new behavior is pinned down.
Run the targeted specs and report the result. Conventions: `.github/instructions/testing.instructions.md`.

---

## Comments — keep them up to date with every change

Every feature, fix, or modification **must** leave the comments of the code it touches accurate, in the same task,
without being asked: TSDoc of classes, methods and constants, inline comments, and header comments of files or blocks
whose behavior, parameters, defaults, or contract changed.

- Re-read the comments around each modified line and fix or delete any that became wrong (e.g. "a single `<p-toast>`"
  after adding a second one).
- Public API TSDoc (services, helpers, components) must describe the current behavior, including new methods and
  new obligations for callers.
- Scope: only the code touched by the change — do not rewrite unrelated comments.
- Do not add comments that merely restate the code or a constant's name.
- Update the related developer documentation (`docs-sphinx`, both `en` and `fr`) when the documented behavior changes.

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
ng g c features/<feat>/<name> --standalone --change-detection OnPush
ng g s core/services/<name>
```