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

## UUID

Always `import { v4 as uuidv4 } from 'uuid'` — never `crypto.randomUUID()`.

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

---

## Working style

- Ground answers in what is actually observed in this repo (code, config, `package.json`) —
  never invent a file path, folder, or convention. If unsure, search before answering.
- Stop exploring once you have enough context to act; prefer a targeted search over repeated
  broad scans of the repository.
- Keep responses concise: state what changed and why, skip restating unchanged code.

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