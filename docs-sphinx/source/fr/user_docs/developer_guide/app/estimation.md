# Fonctionnalité d'estimation

La fonctionnalité d'estimation résout un problème inverse sur une étude de section : elle recherche une longueur de corde, une température de câble, une charge sur une portée ou une pression de vent qui produit une distance demandée par rapport à un obstacle. Les fonctions Python valident le payload du frontend, délèguent la résolution à `SectionStudy.estimation_engine` et renvoient un résultat sérialisable en JSON sans modifier l'état de l'étude.

## Architecture et flux d'appel

```text
Task.estimate* (TypeScript)
  → table de tâches de handle-task.ts et appel Pyodide
  → wrapper de tasks/python-scripts/api.py
  → stellar_engine.core.estimation
  → SectionStudy.estimation_engine (mechaphlowers)
```

L'énumération `Task` et ses correspondances `TaskInputs`/`TaskOutputs` sont définies dans `src/app/core/services/worker_python/tasks/types.ts`. `src/app/core/services/worker_python/tasks/handle-task.ts` associe `estimateRope`, `estimateTemperature`, `estimateLoad` et `estimateWind` aux fonctions snake_case correspondantes de `src/app/core/services/worker_python/tasks/python-scripts/api.py`. Chaque wrapper API convertit les entrées JavaScript en valeurs Python et appelle la fonction correspondante de `stellar-engine/src/stellar_engine/core/estimation.py` avec l'étude courante.

## Entrées des tâches

Tous les champs utilisent le camelCase à la frontière du worker. Chaque tâche reçoit `spanIndex`, `obstaclePoint` et, facultativement, `bounds` et `iceThickness`. `spanIndex` est l'index **avant manipulation**. `obstaclePoint` est `[x, y, z]` en mètres ; à sa place, `obstacleUuid` et `pointIndex` (base 0) peuvent désigner un point d'un obstacle enregistré dans l'étude, que le moteur résout dans son propre repère (un UUID inconnu déclenche `ObstacleNotFoundError`). Si `bounds` est fourni, il représente `[lower, upper]` dans les unités de la variable estimée ; les deux valeurs doivent être finies et `lower < upper`. En l'absence de bornes, les valeurs par défaut de l'estimateur mechaphlowers sont utilisées. `iceThickness` est exprimé en centimètres à la frontière de l'API TypeScript/Python et converti en mètres avant l'appel à mechaphlowers.

| Tâche | Variable estimée | Entrées propres à la tâche |
|---|---|---|
| `estimateTemperature` | Température du câble (°C) | `targetDistance` (m) obligatoire ; `windPressure` (Pa) fixe facultatif. |
| `estimateWind` | Pression du vent (Pa) | `targetDistance` (m) obligatoire ; `temperature` (°C) fixe facultative. |
| `estimateLoad` | Masse de charge (kg) | `targetDistance` (m) et `loadPositionDistance` (m depuis le support gauche de la portée) obligatoires ; `temperature` (°C) fixe et `windPressure` (Pa) fixes facultatifs. |
| `estimateRope` | Longueur de corde (m) | `supportIndex` (avant manipulation) et `targetVerticalDistance` (m) obligatoires ; `ropeLineicMass` (kg/m), `temperature` (°C) fixe et `windPressure` (Pa) fixes facultatifs. |

Pour l'estimation de corde, `targetVerticalDistance` correspond à l'altitude du câble moins celle de l'obstacle et peut être négative. Sa valeur doit être finie, mais n'a pas à être positive. `supportIndex` indique où la corde est fixée ; `spanIndex` désigne toujours la portée contenant l'obstacle. Les conditions fixes facultatives peuvent être omises ou définies à `null`.

La validation commune rejette les valeurs obligatoires absentes ou non finies, les indices négatifs ou fractionnaires et les points d'obstacle qui ne contiennent pas trois coordonnées finies. `targetDistance` et `loadPositionDistance` doivent être strictement positifs ; si `ropeLineicMass` est fourni, il doit également être strictement positif. Les bornes doivent contenir exactement deux valeurs finies dans l'ordre croissant.

## Indexation des portées et supports virtuels

Les quatre tâches reçoivent `spanIndex` selon la convention d'indexation avant manipulation. `estimateTemperature` et `estimateWind` le convertissent en interne avec `study.manipulation.span_index_after_virtual_support`, car mechaphlowers attend l'index de portée après manipulation pour ces deux estimateurs. `estimateLoad` et `estimateRope` transmettent l'index initial à leur estimateur mechaphlowers. Si un support virtuel divise la portée demandée, chaque tâche refuse l'estimation avec `EstimateOnSplitSupportError` ; l'estimation sur l'une des parties d'une portée divisée n'est pas prise en charge.

Pour l'estimation de corde, `supportIndex` est également fourni selon la convention avant manipulation. Un index de portée ou de support hors limites déclenche `InvalidManipulationIndex` de mechaphlowers.

## Résultat et comportement du solveur

Chaque tâche réussie renvoie la même structure :

```json
{
  "value": 60.0,
  "residual": 0.001,
  "iterations": 8,
  "converged": true
}
```

`value` utilise les unités de la variable estimée, `residual` correspond au résidu final de la fonction objectif et `iterations` indique le nombre d'itérations du solveur. Bien que `EstimationResult.converged` soit un booléen, un résultat renvoyé contient toujours `converged: true` : `_solve` déclenche `EstimationNotConvergedError` au lieu de renvoyer un résultat non convergé. Un `ValueError` ordinaire de mechaphlowers, lorsque la distance à l'obstacle ne peut pas être calculée à une borne de recherche, est converti en cette même exception ; les exceptions typées du moteur sont propagées telles quelles.

## Correspondance des erreurs et avertissements

Le nom de la classe d'exception Python (ou le texte de l'avertissement) est recherché dans `PythonErrorCode` par `handle-task.ts`. La première valeur d'énumération correspondante est retenue. La sévérité est définie dans `src/app/core/services/worker_python/tasks/python-error-severity.ts`, tandis que le texte traduit est choisi dans `src/app/core/services/worker_python/tasks/python-error-messages.ts` à partir de `shared.python-errors.*`. Les messages de validation Python sont construits par `_Errors.estimation_*` dans `stellar-engine/src/stellar_engine/entities/errors.py`.

| Code Python | Situation | `TaskError` | Sévérité | Clé i18n |
|---|---|---|---|---|
| `EstimationInputError` | Une entrée d'estimation est absente ou invalide. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.estimation-input-error` |
| `EstimationNotConvergedError` | La cible est inaccessible dans les bornes ou la distance ne peut pas être calculée à une borne. | `SOLVER_DID_NOT_CONVERGE` | Erreur | `shared.python-errors.estimation-not-converged-error` |
| `EstimateOnSplitSupportError` | Un support virtuel divise la portée demandée. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.estimate-on-split-support-error` |
| `InvalidManipulationIndex` | Un index de portée ou de support est hors des limites valides. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.invalid-manipulation-index` |
| `EstimationWarning` | Une charge déjà présente sur la portée estimée est ignorée par l'estimation de charge. Les charges des autres portées sont conservées. | Aucun échec de tâche | Avertissement | `shared.python-errors.estimation-warning` |

`handle-task.ts` déduit `SOLVER_DID_NOT_CONVERGE` en vérifiant si le message d'exception contient la chaîne littérale `did not converge` ; les autres exceptions utilisent le `CALCULATION_ERROR` générique. Les diagnostics Python sont traités séparément et contiennent le message traduit et sa sévérité. L'avertissement de charge accompagne le résultat réussi, qui peut donc toujours être utilisé.

### Ajouter un code d'erreur d'estimation

Pour une nouvelle erreur ou un nouvel avertissement Python, ajoutez le nom de la classe d'exception comme valeur dans `PythonErrorCode`, définissez sa sévérité dans `python-error-severity.ts`, ajoutez la correspondance `shared.python-errors.*` dans `python-error-messages.ts`, puis ajoutez les traductions anglaise et française correspondantes dans `public/i18n/en.json` et `public/i18n/fr.json`. Vérifiez que le texte de l'exception ou de l'avertissement contient exactement la valeur de l'énumération. La recherche est fondée sur les sous-chaînes et la première correspondance dans l'ordre de déclaration de l'énumération est retenue ; évitez donc les codes qui se chevauchent et placez les valeurs les plus spécifiques avant les valeurs plus générales. Consultez [Ajouter des codes d'erreur et d'avertissement](how_to_add_error_codes.md) pour connaître le pipeline de diagnostic complet.

## Limitation connue : direction du vent

Stellar configure la direction du vent en `clockwise`, mais l'estimateur mechaphlowers applique actuellement toujours le vent en `anticlockwise`. Cela peut affecter les résultats de l'estimation du vent. Lorsque l'implémentation du moteur mechaphlowers sera mise à jour pour corriger cette divergence, reconstruisez le wheel du moteur local et les assets associés avec :

```bash
npm run set-up-mechaphlowers:engine-only
```

## Tests

Lancez le test Python ciblé depuis la racine du dépôt :

```bash
cd stellar-engine && uv run pytest test/core/test_estimation.py -q -p no:logging
```

Lancez les tests TypeScript ciblés depuis la racine du dépôt :

```bash
npx vitest run src/app/core/services/worker_python/tasks/
```

Les tests Python couvrent la structure des résultats, les estimations, la validation des entrées, les cibles inaccessibles, la conversion d'index, les portées divisées par des supports virtuels, l'avertissement de charge existante et la préservation de l'état de l'étude.
