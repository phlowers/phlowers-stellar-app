# agent.md — Stellar (phlowers-stellar-app)

Normative development reference for all AI assistants on this project.
Read this file entirely before writing any code.

---

## 1. Stack & contexte projet

| Technologie | Version | Rôle |
|---|---|---|
| Angular | 19.2.x | Framework principal (standalone, signals) |
| TypeScript | ~5.6.2 | Langage — mode strict activé |
| PrimeNG | 19.1.x | Bibliothèque de composants UI |
| Plotly.js | 3.x (`plotly.js-dist-min`) | Rendu graphique / plots |
| Pyodide | 0.28.x | Calculs Python dans le navigateur (WebWorker) |
| Dexie.js | 4.x | Persistance locale (IndexedDB) |
| SCSS + BEM | — | Styles composants — convention BEM stricte |
| Angular i18n natif | XLIFF 2.0 | Internationalisation (en-US, fr) |
| Tailwind CSS | 3.x | Utilitaires CSS (via `tailwindcss-primeui`) |
| Jest | 29.x | Tests unitaires |
| Clean Architecture + DDD | — | Organisation du code en couches |

**Application** : outil de calcul et visualisation pour lignes électriques aériennes (mécanique des câbles), fonctionnant entièrement hors-ligne (PWA/Service Worker).

---

## 2. Architecture DDD & Clean Architecture

### Arborescence réelle du projet

```
src/app/
├── core/                          ← couche domaine + application
│   ├── domain/
│   │   └── models/                ← entités et interfaces métier pures
│   │       ├── catalog/
│   │       ├── charge.model.ts
│   │       ├── section.model.ts
│   │       ├── study.model.ts
│   │       └── ...
│   ├── infrastructure/
│   │   ├── database/              ← Dexie (schémas, entités DB)
│   │   └── dto/                   ← Data Transfer Objects + mappers
│   └── services/                  ← cas d'usage (services applicatifs)
│       ├── studies/
│       ├── sections/
│       ├── cables/
│       ├── worker_python/         ← pilotage Pyodide (WebWorker)
│       └── ...
└── ui/                            ← couche présentation
    ├── app.routes.ts
    ├── pages/                     ← composants de pages (routées)
    │   ├── home/
    │   ├── studies/
    │   ├── study/
    │   ├── studio/                ← page principale de calcul / visualisation
    │   ├── admin/
    │   ├── news/
    │   ├── changelog/
    │   └── 404/
    └── shared/
        ├── components/            ← composants réutilisables (atoms, layout, studio)
        ├── constants/
        ├── helpers/
        ├── model/
        ├── service/
        ├── types/
        └── styles/                ← styles globaux, BEM, variables CSS
```

### Chemins TypeScript (tsconfig.json paths)

```
@core/*     → src/app/core/*
@services/* → src/app/core/services/*
@ui/*       → src/app/ui/*
@app/*      → src/app/*
@src/*      → src/*
```

Toujours utiliser ces alias — jamais de chemins relatifs remontants (`../../..`).

### Règles DDD

- **Domain** (`core/domain/`) : zéro dépendance Angular, Dexie ou framework tiers. Uniquement des interfaces et types TypeScript purs.
- **Infrastructure** (`core/infrastructure/`) : implémentations Dexie, DTOs et mappers. Les mappers (domaine ↔ DTO) vivent exclusivement ici.
- **Services applicatifs** (`core/services/`) : cas d'usage, orchestration entre domaine et infrastructure. Injecter via `InjectionToken` pour abstraire les dépendances d'infrastructure.
- **Présentation** (`ui/`) : composants Angular, pages, styles. Dépend de `core/` mais `core/` ne dépend jamais de `ui/`.
- **Pas d'import croisé entre pages** : `ui/pages/studio/` ne doit pas importer depuis `ui/pages/study/` et vice-versa. Passer par `ui/shared/` ou `core/`.
- Nouveaux domaines métier → créer un dossier dédié dans `core/services/` avec ses modèles dans `core/domain/models/`.

---

## 3. TypeScript — Configuration stricte

### Flags activés (tsconfig.json)

```jsonc
{
  "strict": true,                          // active tous les strict checks
  "noImplicitOverride": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "isolatedModules": true,
  "experimentalDecorators": true
}
```

```jsonc
// angularCompilerOptions
{
  "strictInjectionParameters": true,
  "strictInputAccessModifiers": true,
  "strictTemplates": true,
  "enableI18nLegacyMessageIdFormat": false
}
```

### Règles impératives

- **Zéro `any`**. Utiliser `unknown` + type guard, ou typer précisément.
- **Interfaces** pour les objets du domaine ; **types** pour les unions et alias.
- **`readonly`** sur les propriétés de signal immuables et les constantes d'objet.
- **`@ts-ignore` et `@ts-expect-error` interdits** sans commentaire justificatif documenté immédiatement au-dessus.
- Les types de retour de fonctions publiques doivent être explicites.
- Pas de `as` cast arbitraire ; préférer les type guards.

---

## 4. Angular 19 — Pratiques modernes obligatoires

### Composants

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,           // OBLIGATOIRE sur TOUS les composants
  changeDetection: ChangeDetectionStrategy.OnPush,  // OBLIGATOIRE sur TOUS
  imports: [/* imports individuels uniquement */],
  templateUrl: './my-component.component.html',
  styleUrl: './my-component.component.scss',
})
export class MyComponent { }
```

- **`NgModule` interdit** — toute la base de code est standalone.
- **`ChangeDetectionStrategy.OnPush` obligatoire** sur chaque composant.
- **`inject()` uniquement** pour l'injection de dépendances — l'injection par constructeur est interdite.
- **Imports individuels uniquement** : pas de `CommonModule`, pas de barrel PrimeNG (`PrimeNGModule`). Importer chaque directive/composant séparément.

### Flux de contrôle (Angular 17+ control flow)

```html
<!-- OBLIGATOIRE -->
@if (condition) { ... } @else { ... }
@for (item of items; track item.id) { ... }
@switch (value) { @case ('x') { ... } }
```

- `*ngIf`, `*ngFor`, `*ngSwitch` **INTERDITS**.
- `track` **obligatoire** sur tous les `@for` — utiliser un identifiant stable (id, uuid…).

### Services

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly otherService = inject(OtherService);
}
```

---

## 5. Signals — Signal-first obligatoire

### Règles fondamentales

```typescript
// État local du composant
readonly count = signal(0);

// Dérivé → computed() uniquement, jamais effect() pour dériver
readonly doubled = computed(() => this.count() * 2);

// Effets de bord uniquement
effect(() => {
  console.log('count changed:', this.count());
});

// Signal modifiable dérivé (Angular 19)
readonly selected = linkedSignal(() => this.items()[0]);

// Chargement async (Angular 19)
readonly data = resource({
  request: () => ({ id: this.id() }),
  loader: ({ request }) => this.service.load(request.id),
});
```

- **`signal()`, `computed()`, `effect()`** pour tout état de composant.
- **`computed()`** pour les données dérivées — jamais `effect()` pour dériver.
- **`allowSignalWrites: true`** si un `effect()` doit écrire dans un signal (à éviter au maximum).
- **`toSignal()`** pour convertir les Observables en signals dans les composants.
- **RxJS** uniquement pour les flux async externes (HTTP, WebSocket) — toujours converti via `toSignal()`.
- **`linkedSignal()`** pour les signaux modifiables dérivés (Angular 19).
- **`resource()`** pour le chargement async réactif (Angular 19).
- **`input()` / `output()`** API signals — `@Input` / `@Output` legacy **INTERDITS**.

```typescript
// inputs/outputs
readonly label = input.required<string>();
readonly value = input(0);
readonly valueChange = output<number>();
```

---

## 6. SCSS — Méthodologie BEM stricte

### Convention de nommage

```scss
// ✅ Correct
.study-card { }
.study-card__title { }
.study-card__title--highlighted { }
.study-card--loading { }

// ❌ Interdit
.studyCard { }           // camelCase
.study_card { }          // underscores simples
.study-card .title { }   // descendant sans BEM
```

### Règles

- **Un fichier SCSS par composant** — correspond exactement au fichier `.ts`.
- **Variables CSS uniquement** — pas de valeurs magiques inline (`color: #1a2b3c` → utiliser `var(--color-primary)`).
- Les variables CSS globales sont définies dans `src/app/ui/styles/custom-properties/`.
- **Pas de sélecteur global** dans les fichiers de composant (pas de `body`, `html`, `*`…).
- **Media queries à l'intérieur des blocs BEM**, pas en dehors.
- **Maximum 3 niveaux d'imbrication** SCSS.
- **`!important` interdit**.
- Les abstracts partagés (mixins, functions) sont dans `src/app/ui/styles/abstracts/` — inclus via `stylePreprocessorOptions.includePaths` dans `angular.json`.
- La classe utilitaire `.visually-hidden` est définie dans `src/app/ui/styles/styles.scss` — utiliser cette classe pour masquer visuellement du contenu accessible.

---

## 7. HTML5 — Sémantique & Accessibilité

### Éléments sémantiques

- Utiliser les balises HTML5 natives : `<main>`, `<header>`, `<nav>`, `<section>`, `<aside>`, `<article>`, `<button>`, `<figure>`, `<figcaption>`, etc.
- **Pas de rôles ARIA redondants** sur les éléments natifs (`role="main"` sur `<main>` → interdit).
- `<div>` et `<span>` réservés aux éléments sans sémantique propre.

### Attributs ARIA

- `aria-label` / `aria-labelledby` / `aria-describedby` selon le contexte.
- `aria-busy="true"` pendant les chargements.
- `aria-live="polite"` pour les notifications non bloquantes.
- `aria-live="assertive"` pour les erreurs bloquantes.
- `aria-hidden="true"` sur les icônes décoratives.
- `alt` renseigné sur toutes les `<img>` (vide `alt=""` si purement décorative).

### Navigation & Focus

- Navigation clavier complète sur tous les éléments interactifs.
- Focus visible en permanence (WCAG 2.4.7) — ne jamais `outline: none` sans alternative visible.
- Contraste WCAG AA : 4.5:1 pour le texte normal, 3:1 pour le texte large et les composants UI.

### Formulaires

- `<label>` avec `for`/`id` sur tous les champs.
- `aria-invalid="true"` dynamique sur les inputs en erreur.
- `aria-describedby` pointant vers le message d'erreur.
- Jamais `placeholder` comme substitut de `<label>`.

### Tableaux (WCAG 1.3.1 Niveau A)

- **Tableaux simples** : `scope="col"` ou `scope="row"` sur chaque `<th>` — suffisant.
- **Tableaux complexes** (colspan/rowspan) : `id` unique sur chaque `<th>` + attribut `headers` sur chaque `<td>`.
- **`<caption>` visible et obligatoire** sur tous les tableaux de données — jamais masquée avec `.visually-hidden`.
- `<th>` jamais vide.
- Pas de `role="table"` sur un `<table>` natif.
- Attribut `summary` **INTERDIT** (obsolète HTML5).

---

## 8. Angular i18n — Standard natif (XLIFF 2.0)

### Règles fondamentales

- **`ngx-translate` INTERDIT** — uniquement l'i18n natif Angular.
- Locales supportées : `en-US` (source) et `fr`.
- Format : **XLIFF 2.0** (`version="2.0"`).

### Dans les templates HTML

```html
<!-- Texte simple avec ID explicite -->
<span i18n="@@studies.list.title">Studies</span>

<!-- Attribut HTML -->
<input i18n-placeholder="@@search.input.placeholder" placeholder="Search..." />
<button i18n-aria-label="@@action.delete.ariaLabel" aria-label="Delete">

<!-- Pluriel ICU -->
<span i18n="@@studies.count">
  {count, plural, =0 {No studies} =1 {One study} other {{{count}} studies}}
</span>

<!-- Select ICU -->
<span i18n="@@status.label">
  {status, select, active {Active} inactive {Inactive} other {Unknown}}
</span>
```

- **IDs explicites obligatoires** avec la convention `@@feature.component.element` — les IDs auto-générés sont interdits.
- `i18n-<attribut>` pour tous les attributs HTML traduits (`i18n-placeholder`, `i18n-aria-label`, `i18n-title`…).

### Dans TypeScript

```typescript
// $localize pour les chaînes TypeScript
const message = $localize`:@@error.network.message:Network error, please retry`;
```

### Fichiers de traduction

| Fichier | Emplacement | Rôle |
|---|---|---|
| `messages.xlf` | `assets/i18n/messages.xlf` | Source de vérité anglais (géré par `ng extract-i18n`) |
| `messages.fr.xlf` | `assets/i18n/messages.fr.xlf` | Traductions françaises (à éditer manuellement) |

- **`messages.xlf` : ne jamais éditer manuellement** — généré et mis à jour par `npm run extract-i18n`.
- **`messages.fr.xlf` : seul fichier à éditer** pour ajouter/modifier les traductions françaises.
- Les deux fichiers sont versionnés dans le dépôt.

### Commandes i18n

```bash
# Extraire les nouvelles chaînes et fusionner dans les fichiers de traduction
npm run extract-i18n

# Servir en français
npm run start:fr

# Construire en français / anglais
npm run build:fr
npm run build:en
```

### Configuration angular.json

```json
"i18n": {
  "sourceLocale": "en-US",
  "locales": {
    "fr": { "translation": "assets/i18n/messages.fr.xlf" },
    "en": { "translation": "assets/i18n/messages.xlf" }
  }
}
```

---

## 9. Formulaires — Reactive Forms + Signals

### Règles

- **`ReactiveFormsModule` uniquement** — `[(ngModel)]` et `FormsModule` **INTERDITS**.
- `toSignal()` pour lire les valeurs de formulaire de manière réactive dans le composant.
- `FormBuilder` injecté via `inject(FormBuilder)`.

```typescript
export class MyFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    value: [0, Validators.min(0)],
  });

  // Lecture réactive via signal
  readonly nameValue = toSignal(this.form.controls.name.valueChanges, {
    initialValue: '',
  });
}
```

### Accessibilité des formulaires

```html
<label for="name-input" i18n="@@form.name.label">Name</label>
<input
  id="name-input"
  [formControlName]="'name'"
  [attr.aria-invalid]="form.controls.name.invalid && form.controls.name.touched"
  aria-describedby="name-error"
/>
@if (form.controls.name.invalid && form.controls.name.touched) {
  <span id="name-error" role="alert" aria-live="assertive" i18n="@@form.name.error.required">
    Name is required
  </span>
}
```

- `<label>` avec `for`/`id` sur tous les champs — jamais de `placeholder` en substitut.
- `[attr.aria-invalid]` dynamique lié à l'état du contrôle.
- `aria-describedby` pointant vers le conteneur du message d'erreur.
- Messages d'erreur avec `role="alert"` ou `aria-live="assertive"` pour les erreurs bloquantes.

---

## 10. Routes de l'application

| Chemin | Composant | Description |
|---|---|---|
| `/` | `HomeComponent` | Page d'accueil |
| `/studies` | `StudiesComponent` | Liste des études |
| `/study/:uuid` | `StudyComponent` | Détail d'une étude |
| `/study/:uuid/studio` | `StudioPageComponent` | Studio de calcul/visualisation |
| `/studio` | `StudioPageComponent` | Studio (accès direct) |
| `/admin` | `AdminComponent` | Administration |
| `/news` | `NewsComponent` | Actualités |
| `/changelog` | `ChangelogComponent` | Journal des modifications |
| `**` | `NotFoundComponent` | Page 404 |

Toutes les routes sont enfants de `LoggedLayoutComponent`.

---

## 11. Scripts npm

```bash
npm run start            # Serveur de développement (port 4200, locale par défaut)
npm run start:fr         # Serveur de développement en français
npm run build            # Build de production (fr par défaut)
npm run build:fr         # Build production français
npm run build:en         # Build production anglais
npm run test             # Tests unitaires Jest
npm run coverage         # Tests avec rapport de couverture
npm run extract-i18n     # Extraire les chaînes i18n → assets/i18n/
npm run lint-check       # ESLint
npm run type-check       # Vérification TypeScript sans émission
npm run format           # Formatage Prettier
npm run prettier-check   # Vérification Prettier
```

---

## 12. Tests — Jest

- Framework : **Jest 29** avec `jest-preset-angular`.
- Fichiers : `*.spec.ts` à côté du fichier source.
- Les services purs (domaine) sont testés sans Angular TestBed.
- Les composants utilisent `TestBed` avec `standalone: true`.
- **Pas de `jasmine`** — uniquement l'API Jest (`describe`, `it`, `expect`, `jest.fn()`…).
- `jest-sonar` pour le rapport SonarQube (sortie dans `coverage/`).

```bash
npm run test             # Tous les tests
npm run coverage         # Avec rapport de couverture
```

---

## 13. Interdictions absolues (résumé)

| Interdit | Raison |
|---|---|
| `NgModule` | Architecture standalone uniquement |
| `*ngIf` / `*ngFor` / `*ngSwitch` | Remplacés par `@if` / `@for` / `@switch` |
| `@Input()` / `@Output()` legacy | Remplacés par `input()` / `output()` signals |
| Injection par constructeur | Utiliser `inject()` |
| `any` TypeScript | Typage strict obligatoire |
| `ngx-translate` | i18n natif Angular uniquement |
| `CommonModule` / barrel PrimeNG | Imports individuels obligatoires |
| `[(ngModel)]` | ReactiveFormsModule uniquement |
| `!important` en SCSS | Spécificité CSS à gérer proprement |
| IDs i18n auto-générés | IDs explicites `@@feature.component.element` |
| `@ts-ignore` sans justification documentée | Typage strict à respecter |
| Chemins relatifs remontants (`../../..`) | Utiliser les alias `@core/*`, `@ui/*`, etc. |
| `summary` sur `<table>` | Attribut obsolète HTML5 |
| `role="table"` sur `<table>` natif | Rôle implicite natif, redondant |
