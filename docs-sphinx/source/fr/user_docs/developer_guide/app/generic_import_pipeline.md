# Pipeline d'import générique

Ce document explique l'architecture de la fonctionnalité d'import réutilisable partagée par les contextes **Study** et **Section**.

---

## Aperçu

Le système d'import est construit autour de trois couches :

| Couche | Rôle |
|---|---|
| **`ImportComponent`** | UI générique : sélecteur de fichier, liste des résultats, boîte de dialogue de collision |
| **`GenericImportEngineService`** | Orchestration du pipeline : validation → vérification de collision → traitement |
| **`ImportAdapter<T>`** | Logique métier spécifique au contexte : parsing, validation, persistance |

L'UI et le moteur ne savent rien de Study ou Section. Ils dépendent uniquement de l'interface `ImportAdapter`, résolue à l'exécution via le système d'injection de dépendances d'Angular à l'aide de `IMPORT_ADAPTER_TOKEN`.

---

## Fichiers clés

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

## L'interface `ImportAdapter`

Tout contexte souhaitant s'intégrer au système d'import générique doit implémenter cette interface :

```typescript
interface ImportAdapter<TEntity = unknown> {
  accepts(file: File): boolean;
  checkCollision(file: File): Promise<{ uuid: string; label: string } | null>;
  processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<TEntity | null>;
}
```

| Méthode | Étape | Responsabilité |
|---|---|---|
| `accepts(file)` | `FILE_VALIDATION` | Retourne `true` si l'extension/le type de fichier est pris en charge |
| `checkCollision(file)` | `COLLISION_CHECK` | Lit l'UUID du fichier et vérifie si une entité existe déjà |
| `processFile(file, resolver)` | `DECODING → PERSISTENCE` | Parse, valide, mappe et persiste l'entité |

---

## Le `IMPORT_ADAPTER_TOKEN`

```typescript
export const IMPORT_ADAPTER_TOKEN = new InjectionToken<ImportAdapter>('IMPORT_ADAPTER_TOKEN');
```

Ce token d'injection de dépendances est le pont entre le moteur générique et un adaptateur spécifique au contexte. Le composant hôte est responsable de lier le bon service à ce token dans son tableau `providers`.

---

## L'input `ImportContextConfig`

`ImportComponent` accepte un unique input requis de type `ImportContextConfig` :

```typescript
interface ImportContextConfig {
  acceptedFiles: AcceptedFileSpec;          // required — drives the <input accept> attribute and hint text
  entityLabel: string;                      // required — used in the collision confirmation message
  texts?: {
    uploadPrompt?: string;                  // replaces "Upload one or several files" + sets aria-label
    description?: string;                  // optional paragraph shown above the upload zone
  };
  navigationRoute?: (entityId: string) => string;  // if set, renders an "Open" link on each success item
  successAction?: {                         // if set, renders an action button on each success item
    label: string;                          // button text
    action: (outcome: ImportOutcome) => void; // callback invoked on click
  };
}
```

**Effet de chaque propriété sur l'UI rendue :**

| Propriété | Effet |
|---|---|
| `acceptedFiles.extensions` + `mimeTypes` | Calcule l'attribut `[accept]` sur l'`<input>` de fichier |
| `acceptedFiles.hint` | Affiché comme sous-libellé à l'intérieur de la zone de dépôt |
| `texts.description` | Paragraphe affiché au-dessus de la zone de dépôt (masqué si absent) |
| `texts.uploadPrompt` | Texte principal de la zone de dépôt et `aria-label` sur l'input |
| `entityLabel` | Inséré dans la boîte de dialogue de collision : *« Section X already exists… »* |
| `navigationRoute` | Affiche un bouton `<a [routerLink]="...">` sur chaque élément importé avec succès |
| `successAction` | Affiche un bouton d'action sur chaque élément réussi ; le clic appelle `action(outcome)` et émet `successActionTriggered` |

---

## Étapes du pipeline

Pour chaque fichier, le moteur exécute ces étapes dans l'ordre :

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

Les fichiers sont traités **séquentiellement** — une seule boîte de dialogue de confirmation à la fois.

---

## Comment câbler un nouveau contexte

**1. Créer un service implémentant `ImportAdapter<YourEntity>` :**

```typescript
@Injectable()
export class YourImportService implements ImportAdapter<YourEntity> {
  accepts(file: File): boolean { /* check extension */ }
  async checkCollision(file: File) { /* check UUID */ }
  async processFile(file, resolver) { /* parse + validate + persist */ }
}
```

**2. Créer un composant wrapper hôte qui fournit l'adaptateur :**

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

**3. Définir votre constante de configuration dans un fichier `.constantes.ts` :**

```typescript
export const YOUR_IMPORT_CONFIG: ImportContextConfig = {
  acceptedFiles: { extensions: ['.json'], hint: 'File format: .json' },
  entityLabel: 'Your Entity',
  texts: { description: 'Import a ...', uploadPrompt: 'Upload a file' }
};
```

**4. Utiliser le wrapper dans votre template parent :**

```text
<app-import-your-context
  (importCompleted)="onImportCompleted($event)"
/>
```

> **Remarque :** Le `ConfirmationService` et le `<p-confirmdialog key="positionDialog" />` **doivent** être fournis par le wrapper lui-même. Ne comptez pas sur le fait qu'un composant parent les ait déjà enregistrés.

---

## Diagramme de portée (scoping) de l'injection de dépendances

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

Chaque instance de `<app-import>` obtient son propre `GenericImportEngineService`. L'adaptateur est partagé depuis l'injecteur parent.

---

## Catalogue d'erreurs

Codes d'erreur standard levés par les adaptateurs :

| Code | Étape | Signification |
|---|---|---|
| `FILE_TYPE_NOT_ALLOWED` | `FILE_VALIDATION` | Extension non acceptée par `adapter.accepts()` |
| `FILE_READ_ERROR` | `DECODING` | Échec de `file.text()` ou du FileReader |
| `FILE_PARSE_ERROR` | `PARSING` | Échec du parsing JSON / CSV |
| `VALIDATION_ERROR` | `VALIDATION` | Violation d'une règle métier (champ manquant, valeur hors limites…) |
| `PERSISTENCE_ERROR` | `PERSISTENCE` | Échec de la couche de stockage |

Les adaptateurs peuvent ajouter des codes spécifiques au contexte en étendant le type union `ImportErrorCode`.

---

## Sortie — `importCompleted`

Après chaque lot de fichiers, `ImportComponent` émet `ImportOutcome[]` via son output `importCompleted`.

```typescript
interface ImportOutcome {
  fileName: string;
  status: 'success' | 'error' | 'skipped';
  error?: ImportError;     // present when status === 'error'
  entityId?: string;       // present when status === 'success'
  entityLabel?: string;    // present when status === 'success'
}
```

Le wrapper hôte transmet cet événement vers le haut. Le parent (par exemple une modale) peut l'inspecter pour se fermer en cas de succès :

```typescript
onImportCompleted(outcomes: ImportOutcome[]): void {
  if (outcomes.some(o => o.status === 'success')) {
    this.closeModal();
  }
}
```
