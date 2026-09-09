# Comment ajouter des codes d'erreur/d'avertissement et comment fonctionne le pipeline de toasts

Ce document explique comment ajouter un nouveau code d'erreur ou d'avertissement Python
afin qu'il apparaisse sous forme de toast dans l'application, puis décrit comment
fonctionne de bout en bout le pipeline sous-jacent de capture des erreurs/avertissements.

---

## Partie 1 — Ajouter un nouveau code d'erreur/d'avertissement

Il existe deux déclencheurs distincts côté Python, et tous deux sont acheminés
vers la même forme `PythonDiagnostic` côté TypeScript :

- **Une exception levée** — par ex. `raise ValueError("SolverError: ...")` — est
  capturée par le `try/except` dans `handleTask()`.
- **Un avertissement capturé** — par ex. `warnings.warn("...")` — ne lève jamais
  d'exception, mais est intercepté par un hook `warnings.showwarning` et récupéré
  après chaque tâche.

Dans les deux cas, le côté JS/TS identifie quel code a été levé en vérifiant
si le message de l'exception ou le texte de l'avertissement **contient** l'une des
valeurs connues de l'énumération `PythonErrorCode` en tant que sous-chaîne. Cela signifie que :

- Le côté Python n'a **pas** besoin d'envoyer un code structuré — il suffit que
  le nom du code apparaisse quelque part dans le message de l'exception ou le texte de l'avertissement.
- Ajouter un nouveau code est un changement purement côté TypeScript (enum + message +
  sévérité), tant que le texte du message Python contient ce nom de code.

### Étapes pour ajouter un nouveau code

1. **Ajouter la valeur d'énumération** dans types.ts :

   ```typescript
   export enum PythonErrorCode {
     // ...existing codes
     MyNewError = 'MyNewError'
   }
   ```

   La valeur de la chaîne **doit** être exactement la sous-chaîne qui apparaît dans le
   message d'exception Python ou le texte de `warnings.warn(...)` (par ex. `MyNewError`).

2. **Ajouter sa clé de traduction** dans python-error-messages.ts, dans `PYTHON_ERROR_KEYS`, puis ajouter
   l'entrée correspondante à la fois dans `public/i18n/en.json` et `public/i18n/fr.json` sous `shared.python-errors.*` :

   ```typescript
   const PYTHON_ERROR_KEYS: Record<PythonErrorCode, string> = {
     // ...
     [PythonErrorCode.MyNewError]: 'shared.python-errors.my-new-error'
   };
   ```

   ```json
   // public/i18n/en.json and public/i18n/fr.json
   {
     "shared": {
       "python-errors": {
         "my-new-error": "A description shown to the user."
       }
     }
   }
   ```

3. **Classer sa sévérité** dans python-error-severity.ts, dans `PYTHON_ERROR_SEVERITY` :

   ```typescript
   export const PYTHON_ERROR_SEVERITY: Record<PythonErrorCode, DiagnosticSeverity> = {
     // ...
     [PythonErrorCode.MyNewError]: 'error' // or 'warning'
   };
   ```

   > **Important :** `python-error-severity.ts` ne doit jamais importer ni utiliser
   > `TranslocoService`/i18n. Il est importé par `handle-task.ts`, qui s'exécute
   > à l'intérieur du bundle Web Worker Pyodide — un bundle qui n'a **aucun
   > injecteur Angular**, donc `TranslocoService` ne peut pas y être instancié.
   > Les messages traduits appartiennent à `python-error-messages.ts` à la place, qui
   > ne doit être importé que depuis du code s'exécutant sur le thread principal (composants/services),
   > jamais depuis `handle-task.ts` ou tout autre élément intégré dans
   > `worker-python.ts`. Voir [Partie 2, section 2.7](#worker-bundle-transloco)
   > pour plus de détails.

   - `'error'` — affiché comme une notification d'erreur bloquante
     (`notificationService.error(...)`) et empêche le résultat du calcul
     d'être utilisé.
   - `'warning'` — affiché comme un toast d'avertissement non bloquant
     (`notificationService.warning(...)`) ; le résultat du calcul est tout de même
     utilisé.

   TypeScript impose que **chaque** `PythonErrorCode` ait à la fois un message et
   une sévérité — en oublier un est une erreur de compilation.

4. **Côté Python**, assurez-vous que le texte de l'erreur/de l'avertissement contient bien
   le nom du code :

   ```python
   # Exception — message must contain "MyNewError"
   raise ValueError("MyNewError: something went wrong")

   # Warning — message must contain "MyNewError"
   warnings.warn("MyNewError: something to flag")
   ```

5. **Vérifiez à nouveau les clés de traduction** ajoutées à l'étape 2 : elles doivent exister avec des valeurs correspondantes dans
   `public/i18n/en.json` et `public/i18n/fr.json` — Transloco se rabat silencieusement sur la chaîne
   brute de la clé si une traduction est manquante dans l'une des langues.

6. **Ajouter/mettre à jour les tests** :
   - python-error-severity.spec.ts
     vérifie que chaque `PythonErrorCode` possède un mappage de sévérité — cela échouera
     tant que vous n'aurez pas ajouté l'étape 3.
   - python-error-messages.spec.ts
     vérifie que chaque code connu produit un message non nul.
   - Ajoutez un cas à handle-task.spec.ts
     si le nouveau code nécessite une couverture dédiée pour la logique de correspondance.

Aucune modification n'est nécessaire dans `WorkerPythonService`, `PlotService` ou
`StudioComponent` — ils sont génériques sur `PythonDiagnostic[]` et
prennent automatiquement en compte tout nouveau code.

---

## Partie 2 — Comment fonctionne le pipeline de capture des erreurs/avertissements

### Aperçu

```
Python (Pyodide worker)
  │
  │  raises exception             warnings.warn(...)
  │        │                            │
  │        ▼                            ▼
  │  try/except in            warnings.showwarning hook
  │  handleTask()              (functions.py, _capture_warning)
  │        │                            │
  │        │                    appended to _captured_warnings[]
  │        │                            │
  │        └──────────┬─────────────────┘
  │                    ▼
  │         handleTask() builds diagnostics: PythonDiagnostic[]
  │                    │
  ▼                    ▼
worker-python.ts postMessage({ result, error, diagnostics })
  │
  ▼
WorkerPythonService.onmessage → runTask() resolves { result, error, diagnostics }
  │
  ▼
PlotService.diagnostics = signal<PythonDiagnostic[]>([...])
  │
  ▼
StudioComponent effect() → NotificationService.error()/.warning() (one toast per diagnostic)
```

### 2.1 — Côté Python : deux mécanismes de capture indépendants

**Les exceptions** ne sont pas du tout traitées côté Python — elles se propagent
normalement et sont capturées par le `try/catch` dans
`handle-task.ts` (`src/app/core/services/worker_python/tasks/handle-task.ts`).

**Les avertissements** seraient sinon affichés sur stderr et perdus, puisque
`warnings.warn()` ne lève pas d'exception. Pour les capturer,
`functions.py` (`src/app/core/services/worker_python/tasks/python-scripts/functions.py`)
installe un hook global au démarrage du worker :

```python
_captured_warnings: list[str] = []

def _capture_warning(message, category, filename, lineno, file=None, line=None):
    _captured_warnings.append(f"{category.__name__}: {message}")

warnings.showwarning = _capture_warning
warnings.simplefilter("always")  # capture every occurrence, not just the first
```

`get_and_clear_warnings()` renvoie et vide le tampon — elle est appelée par
TypeScript après chaque exécution de tâche (succès ou échec), afin que les avertissements ne
fuient jamais d'une tâche à l'autre.

### 2.2 — Côté TypeScript : `handleTask()` construit le tableau de diagnostics

`handleTask()` dans `handle-task.ts` retourne toujours :

```typescript
{ result, runTime, error: TaskError | null, diagnostics: PythonDiagnostic[] }
```

**En cas de succès :**

```typescript
const diagnostics = collectWarningDiagnostics(pyodide, task, log);
return { result: resultJs, runTime, error: null, diagnostics };
```

`collectWarningDiagnostics()` :
1. Appelle la fonction Python `get_and_clear_warnings()` et récupère les chaînes brutes des avertissements.
2. Pour chaque texte d'avertissement, trouve la première valeur d'énumération `PythonErrorCode` dont
   la chaîne est une sous-chaîne du texte (`warningText.includes(code)`).
3. Si une correspondance est trouvée, ajoute un diagnostic avec `origin: 'warning'`.
4. Si aucun code ne correspond, l'avertissement est **journalisé mais abandonné** — aucun toast n'est
   affiché pour les avertissements qui ne correspondent à aucun code connu.

**En cas d'échec (exception levée) :**

```typescript
const pythonErrorCode = Object.values(PythonErrorCode).find((code) => errorMessage.includes(code)) ?? null;
const diagnostics = collectWarningDiagnostics(pyodide, task, log); // any warnings before the throw
if (pythonErrorCode) {
  diagnostics.unshift({ code: pythonErrorCode, severity: PYTHON_ERROR_SEVERITY[pythonErrorCode], origin: 'exception', rawText: errorMessage });
}
return { result: null, runTime, error: errorType, diagnostics };
```

- Le message de l'exception est comparé aux `PythonErrorCode` de la même manière que
  pour les avertissements (correspondance de sous-chaîne).
- En cas de correspondance, le diagnostic de l'exception est placé **en premier** (`unshift`) afin que
  les consommateurs puissent le retrouver de manière fiable via `diagnostics.find(d => d.origin === 'exception')`.
- Les avertissements capturés *avant* que l'exception ne soit levée sont tout de même collectés
  et conservés dans le tableau (avec `origin: 'warning'`).
- `error` est toujours défini avec un `TaskError` générique (`CALCULATION_ERROR` ou
  `SOLVER_DID_NOT_CONVERGE`), qu'un code Python ait correspondu ou non —
  c'est ce qui détermine si le résultat du calcul est considéré comme en échec.

### 2.3 — Passage à travers la frontière du worker

- `worker-python.ts` (`src/app/core/services/worker_python/worker-python.ts`)
  poste `{ result, error, diagnostics }` vers le thread principal (revient
  à `diagnostics: []` si une tâche échoue avant même que `handleTask()` ne s'exécute).
- `worker-python.service.ts` (`src/app/core/services/worker_python/worker-python.service.ts`)
  reçoit le message, extrait `diagnostics` (`data.diagnostics ?? []`), et
  résout la promesse `runTask()`/`runTaskWithTimeout()` de l'appelant avec
  `{ result, error, diagnostics }`.

### 2.4 — Stockage : `PlotService.diagnostics`

`plot.service.ts` (`src/app/core/services/plot/plot.service.ts`)
expose un unique signal :

```typescript
diagnostics = signal<PythonDiagnostic[]>([]);
```

Il est défini après chaque appel à `runTask()` susceptible de produire des diagnostics
(`initSectionStudio()`, `refreshProjection()`, services de chargement/modification
de câble, …), et réinitialisé à `[]` dans `resetAll()` et `purgePlot()` afin que les
diagnostics obsolètes ne survivent jamais entre deux sections ou réinitialisations de plot.

### 2.5 — Rendu : effect de `StudioComponent` → toasts

`studio.component.ts` (`src/app/shared/components/studio/studio.component.ts`)
possède un unique `effect()` qui réagit à la fois à `plotService.error()` et
`plotService.diagnostics()` :

```typescript
effect(() => {
  const error = this.plotService.error();
  const diagnostics = this.plotService.diagnostics();
  const exceptionDiagnostic = diagnostics.find((d) => d.origin === 'exception') ?? null;

  if (error !== null) {
    const message = formatStudioError(error, exceptionDiagnostic?.code ?? null);
    if (exceptionDiagnostic?.severity === 'warning') {
      this.notificationService.warning(message);
    } else {
      this.notificationService.error(message);
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.origin === 'warning') {
      const message = formatPythonError(diagnostic.code);
      if (message !== null) {
        this.notificationService.warning(message);
      }
    }
  }
});
```

Cela produit au maximum :
- **Une notification bloquante** pour le diagnostic `origin: 'exception'` (le cas échéant)
  — routée vers `.error()` ou `.warning()` selon sa sévérité. Cela
  protège contre le cas où un code Python classé en sévérité `'warning'` serait
  levé comme une véritable exception (par ex. certains codes peuvent apparaître à la fois dans
  un message d'exception et un appel `warnings.warn()` selon le contexte).
- **Un toast d'avertissement par diagnostic `origin: 'warning'`** — chaque avertissement capturé
  qui a été résolu vers un code connu obtient son propre toast, en utilisant le simple
  message `formatPythonError()` (sans repli sur le message générique de `TaskError`,
  puisqu'il n'y a pas d'erreur au niveau de la tâche dans ce cas).

Les diagnostics avec `origin: 'warning'` ne sont jamais routés via
`notificationService.error()` — seules les exceptions peuvent produire une erreur bloquante.

### 2.6 — Pourquoi `origin` existe

`origin` (`'exception' | 'warning'`) est ce qui permet à `StudioComponent` de fusionner ce qui
était auparavant deux signaux/effects séparés (`pythonErrorCode` pour les exceptions,
`pythonWarningCodes` pour les avertissements capturés) en un unique tableau `diagnostics`
sans double affichage de toast : la branche exception ne regarde que
`origin === 'exception'`, et la boucle d'avertissement ne regarde que
`origin === 'warning'`, de sorte que le même diagnostic n'est jamais traité par les deux
chemins.

(worker-bundle-transloco)=
### 2.7 — Le bundle du worker et Transloco

`worker-python.ts` est packagé par Angular comme un **chunk Web Worker séparé**
(déclenché par l'appel `new Worker(new URL('./worker-python', import.meta.url))`
dans `worker-python.service.ts`). Ce chunk n'obtient que le code qu'il
importe de manière transitive — il ne s'exécute **pas** dans un contexte d'injection
Angular, donc les services obtenus via `inject()` (comme `TranslocoService`)
ne peuvent pas y être construits.

Cela signifie que **tout module importé (même de manière transitive) par `handle-task.ts` ou
`worker-python.ts` ne doit pas dépendre de `TranslocoService`** (directement ou via un
helper qui appelle `translate()`), sinon le script du worker lève une exception au
moment de sa construction/de son appel — ce qui ressemble, vu de l'extérieur, à
« Pyodide ne se charge pas ».

C'est pourquoi :

- `python-error-severity.ts` (mappage de sévérité, littéraux de chaîne simples) est un
  fichier **séparé** de `python-error-messages.ts` (mappage de clés de traduction,
  basé sur `TranslocoService`) — `handle-task.ts` n'importe que le premier.
- `python-error-messages.ts` ne doit être importé que depuis du code s'exécutant sur le thread principal
  (`studio.component.ts`, `errors.ts`, `free-positioning.component.ts`, …),
  jamais depuis `handle-task.ts`, `worker-python.ts`, ou tout fichier qu'ils importent.

Si vous devez ajouter une logique côté worker qui dépend d'un nouveau fichier, vérifiez que sa
chaîne d'imports n'atteint pas une utilisation de `TranslocoService` avant de fusionner.
