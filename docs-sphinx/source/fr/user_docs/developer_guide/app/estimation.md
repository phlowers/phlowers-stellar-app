# Fonctionnalité d'estimation

La fonctionnalité d'estimation résout un problème inverse sur une étude de section : elle recherche une longueur de corde, une température de câble, une charge sur une portée ou une pression de vent qui produit une distance demandée par rapport à un obstacle, ou la pression de vent qui rapproche le plus le câble d'un obstacle. Les fonctions Python valident le payload du frontend, délèguent la résolution à `SectionStudy.estimation_engine` et renvoient un résultat sérialisable en JSON sans modifier l'état de l'étude.

## Architecture et flux d'appel

```text
Task.estimate* (TypeScript)
  → table de tâches de handle-task.ts et appel Pyodide
  → wrapper de tasks/python-scripts/api.py
  → stellar_engine.core.estimation
  → SectionStudy.estimation_engine (mechaphlowers)
```

L'énumération `Task` et ses correspondances `TaskInputs`/`TaskOutputs` sont définies dans `src/app/core/services/worker_python/tasks/types.ts`. `src/app/core/services/worker_python/tasks/handle-task.ts` associe `estimateRope`, `estimateTemperature`, `estimateLoad`, `estimateLoadRelative`, `estimateWind` et `estimateMinimumDistanceWind` aux fonctions snake_case correspondantes de `src/app/core/services/worker_python/tasks/python-scripts/api.py`. Chaque wrapper API convertit les entrées JavaScript en valeurs Python et appelle la fonction correspondante de `stellar-engine/src/stellar_engine/core/estimation.py` avec l'étude courante.

## Entrées des tâches

Tous les champs utilisent le camelCase à la frontière du worker. Chaque tâche, sauf `estimateLoadRelative`, reçoit `spanIndex`, `obstaclePoint` et, facultativement, `bounds` et `iceThickness`. `spanIndex` est l'index **avant manipulation**. `obstaclePoint` est `[x, y, z]` en mètres. Si `bounds` est fourni, il représente `[lower, upper]` dans les unités de la variable estimée ; les deux valeurs doivent être finies et `lower < upper`. En l'absence de bornes, les valeurs par défaut de l'estimateur mechaphlowers sont utilisées. `iceThickness` est exprimé en centimètres à la frontière de l'API TypeScript/Python et converti en mètres avant l'appel à mechaphlowers.

| Tâche | Variable estimée | Entrées propres à la tâche |
|---|---|---|
| `estimateTemperature` | Température du câble (°C) | `targetDistance` (m) obligatoire ; `windPressure` (Pa) fixe facultatif. |
| `estimateWind` | Pression du vent (Pa) | `targetDistance` (m) obligatoire ; `temperature` (°C) fixe facultative. |
| `estimateMinimumDistanceWind` | Pression du vent (Pa) minimisant la distance | `temperature` (°C) fixe obligatoire ; aucune distance cible. |
| `estimateLoad` | Masse de charge (kg) | `targetDistance` (m) et `loadPositionDistance` (m depuis le support gauche de la portée) obligatoires ; `temperature` (°C) fixe et `windPressure` (Pa) fixes facultatifs. |
| `estimateLoadRelative` | Masse de charge (kg), également renvoyée en daN | Sans obstacle. `targetDistance` signé (m, variation d'altitude du câble à la position de la charge, généralement négative) et `loadPositionDistance` (m depuis le support gauche de la portée) obligatoires ; `temperature` (°C) fixe et `windPressure` (Pa) fixes facultatifs. `extra.x_shift` est le décalage d'abscisse du câble (m) au point de charge ; `effort` est la charge en daN. |
| `estimateRope` | Longueur de corde (m) | `supportIndex` (avant manipulation) et `targetVerticalDistance` (m) obligatoires ; `ropeLineicMass` (kg/m), `temperature` (°C) fixe et `windPressure` (Pa) fixes facultatifs. |

Pour l'estimation de corde, `targetVerticalDistance` correspond à l'altitude du câble moins celle de l'obstacle et peut être négative. Sa valeur doit être finie, mais n'a pas à être positive. `supportIndex` indique où la corde est fixée ; `spanIndex` désigne toujours la portée contenant l'obstacle. Les conditions fixes facultatives peuvent être omises ou définies à `null`.

Au lieu de coordonnées brutes, une tâche peut désigner un obstacle enregistré dans l'étude avec `obstacleUuid` et `pointIndex` (indexé à partir de 0, alors obligatoire). Le point est alors résolu par `find_obstacle_point` (partagé avec la conformité) à partir des coordonnées absolues du moteur, dans le repère du canton, et `obstaclePoint` est ignoré. Le frontend doit utiliser cette forme : les points d'obstacle rendus dans `litData.obstacles` sont reprojetés pour la vue 2D et ne sont pas dans le repère du moteur. Un `obstacleUuid` inconnu lève `ObstacleNotFoundError` ; un `pointIndex` absent, négatif ou fractionnaire lève `EstimationInputError`, un `pointIndex` hors limites `ConformityInputError` (cas inatteignable depuis l'interface).

La validation commune rejette les valeurs obligatoires absentes ou non finies, les indices négatifs ou fractionnaires et les points d'obstacle qui ne contiennent pas trois coordonnées finies. `targetDistance` et `loadPositionDistance` doivent être positifs ou nuls ; si `ropeLineicMass` est fourni, il doit être strictement positif. Un `targetDistance` nul est transmis au moteur, qui ne l'atteint jamais : les estimations de température et de charge renvoient un résultat non convergé avec un `EstimationNotConvergedWarning`, celle du vent une `SolverError` dès que la chaîne d'isolateurs se retourne. Les bornes doivent contenir exactement deux valeurs finies dans l'ordre croissant.

## Indexation des portées et supports virtuels

Les six tâches reçoivent `spanIndex` selon la convention d'indexation avant manipulation. `estimateTemperature`, `estimateWind` et `estimateMinimumDistanceWind` le convertissent en interne avec `study.manipulation.span_index_after_virtual_support`, car mechaphlowers attend l'index de portée après manipulation pour ces estimateurs climatiques. `estimateLoad`, `estimateLoadRelative` et `estimateRope` transmettent l'index initial à leur estimateur mechaphlowers. Si un support virtuel divise la portée demandée, chaque tâche refuse l'estimation avec `EstimateOnSplitSupportError` ; l'estimation sur l'une des parties d'une portée divisée n'est pas prise en charge.

Pour l'estimation de corde, `supportIndex` est également fourni selon la convention avant manipulation. Un index de portée ou de support hors limites déclenche `InvalidManipulationIndex` de mechaphlowers.

## Résultat et comportement du solveur

Chaque tâche de recherche de racine réussie renvoie la même structure :

```json
{
  "value": 60.0,
  "residual": 0.001,
  "iterations": 8,
  "converged": true,
  "extra": {}
}
```

`value` utilise les unités de la variable estimée, `residual` correspond au résidu final de la fonction objectif `iterations` indique le nombre d'itérations du solveur et `extra` contient les valeurs nommées supplémentaires calculées par le moteur (vide s'il n'y en a pas). Bien que `EstimationResult.converged` soit un booléen, un résultat qui n'a pas convergé est tout de même renvoyé, avec `converged: false` (la valeur la plus proche trouvée), et `_solve` émet un `EstimationNotConvergedWarning` (voir le tableau ci-dessous). Un `ValueError` ordinaire de mechaphlowers, lorsque la distance à l'obstacle ne peut pas être calculée à une borne de recherche, n'a pas de résultat : il est converti en `EstimationNotConvergedError` ; les exceptions typées du moteur sont propagées telles quelles.

### Pression de vent pour distance minimale

`estimateMinimumDistanceWind` n'a pas de cible : elle minimise la distance 3D entre le câble et le point d'obstacle sur les bornes `bounds` de pression de vent (par défaut `[-1000, 1000]` Pa), à la `temperature` fixe, et renvoie :

```json
{
  "value": 831.2,
  "distance": 7.19,
  "iterations": 11
}
```

`value` est la pression de vent (Pa), `distance` la distance oblique minimale (m) et `iterations` le nombre d'évaluations de la distance. `estimate_minimum_distance_wind` utilise le mode « point le plus proche » de `estimate_wind` de mechaphlowers (`target_distance=None`) : son minimiseur de Brent évalue la distance aux deux `bounds` et suppose un seul minimum à l'intérieur (par défaut `[-1000, 1000]` Pa). La recherche est encapsulée dans une `RobustEstimation` (voir *Estimation robuste* ci-dessous), qui réduit d'abord les bornes aux pressions de vent que le solveur d'équilibre sait résoudre autour de l'absence de vent (un vent fort retourne les chaînes d'isolateurs, `SuspectedChainReversal`, ce qui ferait échouer la recherche via l'évaluation des bornes), puis relance la recherche sur des bornes resserrées vers l'absence de vent si les chaînes se retournent encore pendant celle-ci. Un minimum situé sur une borne (éventuellement cette limite solvable) renvoie cette borne avec un `EstimationNotConvergedWarning` ; une distance NaN déclenche `EstimationNotConvergedError` ; un échec du solveur d'équilibre sans vent, ou un retournement des chaînes qui persiste après les nouvelles tentatives, est propagé tel quel.

### Estimation robuste

Les recherches de mechaphlowers évaluent la fonction objectif aux deux bornes et s'arrêtent au premier échec du solveur d'équilibre : une seule valeur d'essai non résoluble fait donc échouer toute l'estimation. `RobustEstimation` (`stellar-engine/src/stellar_engine/core/estimation/robust.py`) rend une recherche 1D robuste à ces valeurs. Elle est indépendante de mechaphlowers : l'estimation fournit un prédicat `is_solvable(value)` et un appelable `search(bounds)`, ce qui permettra de la réutiliser plus tard pour d'autres estimations. `estimate_minimum_distance_wind` en est aujourd'hui la seule utilisatrice.

| Champ | Défaut | Rôle |
|---|---|---|
| `variable` | | Nom de la variable estimée, pour les logs |
| `is_solvable` | | Indique si le solveur d'équilibre réussit pour une valeur |
| `tolerance` | | Précision des limites solvables (dichotomie) |
| `step` | | Pas du balayage vers l'extérieur qui cherche la première valeur non résoluble |
| `neutral` | `0` | Valeur supposée résoluble (par ex. absence de vent) |
| `retries` | `3` | Nombre de nouvelles tentatives de la recherche après un échec `retried_errors` |
| `shrink` | `0.75` | Fraction de chaque borne (depuis la référence) conservée à chaque nouvelle tentative |
| `retried_errors` | `(SuspectedChainReversal,)` | Échecs du solveur qui déclenchent une nouvelle tentative |

Pour le vent, `estimate_minimum_distance_wind` fixe `tolerance=WIND_SOLVABLE_TOLERANCE` (1 Pa), `step=WIND_SOLVABLE_STEP` (50 Pa), `retries=WIND_REVERSAL_RETRIES` (3) et `shrink=WIND_REVERSAL_SHRINK` (0,75), et construit `is_solvable` avec `is_state_solvable` à la température, l'épaisseur de glace et la direction du vent fixées.

**Le vent peut échouer à l'intérieur des bornes.** Les pressions de vent résolubles ne forment pas un seul intervalle : un vent fort retourne les chaînes d'isolateurs, puis un vent beaucoup plus fort peut de nouveau être résolu sur un état à chaînes retournées. Avec les bornes par défaut `[-1000, 1000]` Pa, une section fictive pourrait se comporter ainsi :

```text
  -1000      -950        -300     0      400        ~950       1000
    |  solves  |   fails   |    solves    |   fails   |  solves  |
    |  again   | (reversal)|  (reference) | (reversal)|  again   |
               <-------------- kept bounds ------------>
                           [-300, 400]
```

Résoluble sur `[-300, 400]`, en échec sur `(400, ~950)` et `(-950, -300)`, puis de nouveau résoluble au-delà. Cela a deux conséquences, chacune traitée par `RobustEstimation` :

1. **Îlots de nouveau résolubles.** Une simple dichotomie entre une borne et la référence pourrait converger vers une limite voisine de l'îlot « de nouveau résoluble » (par ex. vers 950 Pa) et laisser une zone en échec à l'intérieur des bornes. `solvable_bounds(bounds)` part donc de `reference(bounds)` (`neutral` ramené dans les bornes), balaie chaque côté vers l'extérieur par pas de `step` jusqu'à la première valeur non résoluble, puis affine cette limite par dichotomie jusqu'à `tolerance`. Seul l'intervalle contenant la référence est conservé (`[-300, 400]` ci-dessus). Si la référence elle-même n'est pas résoluble, les bornes sont renvoyées inchangées afin que l'erreur du solveur parvienne à l'utilisateur.
2. **Zones en échec plus étroites que `step`.** Le balayage ne teste qu'une valeur tous les `step` : une zone en échec plus étroite que `step` entre deux valeurs balayées peut donc être manquée, et un `SuspectedChainReversal` peut encore survenir pendant la recherche dans les bornes conservées. `run(search, bounds)` intercepte les `retried_errors`, rapproche les deux bornes de la référence avec `shrunk_bounds(bounds, reference)` (chaque borne conserve la fraction `shrink` de sa distance à la référence) et relance la recherche, au plus `retries` fois ; l'erreur est ensuite propagée.

`is_state_solvable(study, **state)` est la sonde mechaphlowers derrière `is_solvable` : elle appelle `solve_change_state(**state)` sur une `deepcopy` du moteur d'équilibre de l'étude (sans ses observateurs, pour ne pas copier les moteurs en aval) et renvoie `False` en cas de `SolverError`. Une copie neuve est utilisée à chaque sonde, car un calcul en échec corrompt le moteur, et le moteur est résolu directement, comme dans les recherches d'estimation de mechaphlowers, plutôt que via `SectionStudy.solve_change_state`, dont le démarrage à chaud (warm start) résout plus de cas que la recherche.

### Charge relative (effort)

`estimateLoadRelative` (`estimate_load_relative`) ne nécessite aucun obstacle : elle estime la masse de charge donnant une variation d'altitude cible du câble à `loadPositionDistance`, par rapport au câble avant la charge. En plus des champs communs, elle renvoie `effort`, la même charge en daN (`units` de mechaphlowers, soit 1 kg = 0,981 daN), et `extra.x_shift`, le décalage (m) de l'abscisse du câble au point de charge (initiale moins finale) :

```json
{
  "value": -123.4,
  "residual": 0.0,
  "iterations": 5,
  "converged": true,
  "extra": { "x_shift": -0.126 },
  "effort": -121.05
}
```

Une masse négative est une traction (le câble monte, `targetDistance` positif), une masse positive un poids (le câble descend). Les `bounds` par défaut de mechaphlowers sont `[0, 2000]` kg (poids uniquement) : une traction nécessite des `bounds` négatives, que l'onglet d'effort envoie selon le sens. L'étude reste intacte ; les charges des autres portées sont conservées et une charge existante sur la portée est remplacée.

## Correspondance des erreurs et avertissements

Le nom de la classe d'exception Python (ou le texte de l'avertissement) est recherché dans `PythonErrorCode` par `handle-task.ts`. La première valeur d'énumération correspondante est retenue. La sévérité est définie dans `src/app/core/services/worker_python/tasks/python-error-severity.ts`, tandis que le texte traduit est choisi dans `src/app/core/services/worker_python/tasks/python-error-messages.ts` à partir de `shared.python-errors.*`. Les messages de validation Python sont construits par `_Errors.estimation_*` dans `stellar-engine/src/stellar_engine/entities/errors.py`.

| Code Python | Situation | `TaskError` | Sévérité | Clé i18n |
|---|---|---|---|---|
| `EstimationInputError` | Une entrée d'estimation est absente ou invalide. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.estimation-input-error` |
| `EstimationNotConvergedError` | La distance à l'obstacle ne peut pas être calculée à une borne (pas de résultat). | `SOLVER_DID_NOT_CONVERGE` | Erreur | `shared.python-errors.estimation-not-converged-error` |
| `EstimationNotConvergedWarning` | La cible est inaccessible dans les bornes : le résultat est renvoyé avec `converged: false`. | aucun (résultat renvoyé) | Avertissement | `shared.python-errors.estimation-not-converged-warning` |
| `EstimationTargetAboveBoundsWarning` | Sous-classe d'`EstimationNotConvergedWarning` émise par `estimate_temperature` quand la recherche s'arrête sur la borne supérieure : la cible nécessite une température plus élevée. | aucun (résultat renvoyé) | Avertissement | `shared.python-errors.estimation-target-above-bounds-warning` |
| `EstimationTargetBelowBoundsWarning` | Idem sur la borne inférieure : la cible nécessite une température plus basse. | aucun (résultat renvoyé) | Avertissement | `shared.python-errors.estimation-target-below-bounds-warning` |
| `EstimateOnSplitSupportError` | Un support virtuel divise la portée demandée. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.estimate-on-split-support-error` |
| `InvalidManipulationIndex` | Un index de portée ou de support est hors des limites valides. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.invalid-manipulation-index` |
| `ObstacleNotFoundError` | `obstacleUuid` n'est pas enregistré dans l'étude. | `CALCULATION_ERROR` | Erreur | `shared.python-errors.obstacle-not-found-error` |
| `EstimationWarning` | Une charge déjà présente sur la portée estimée est ignorée par l'estimation de charge. Les charges des autres portées sont conservées. | Aucun échec de tâche | Avertissement | `shared.python-errors.estimation-warning` |

`handle-task.ts` déduit `SOLVER_DID_NOT_CONVERGE` en vérifiant si le message d'exception contient la chaîne littérale `did not converge` ; les autres exceptions utilisent le `CALCULATION_ERROR` générique. Les diagnostics Python sont traités séparément et contiennent le message traduit et sa sévérité. L'avertissement de charge accompagne le résultat réussi, qui peut donc toujours être utilisé.

### Ajouter un code d'erreur d'estimation

Pour une nouvelle erreur ou un nouvel avertissement Python, ajoutez le nom de la classe d'exception comme valeur dans `PythonErrorCode`, définissez sa sévérité dans `python-error-severity.ts`, ajoutez la correspondance `shared.python-errors.*` dans `python-error-messages.ts`, puis ajoutez les traductions anglaise et française correspondantes dans `public/i18n/en.json` et `public/i18n/fr.json`. Vérifiez que le texte de l'exception ou de l'avertissement contient exactement la valeur de l'énumération. La recherche est fondée sur les sous-chaînes et la première correspondance dans l'ordre de déclaration de l'énumération est retenue ; évitez donc les codes qui se chevauchent et placez les valeurs les plus spécifiques avant les valeurs plus générales. Consultez [Ajouter des codes d'erreur et d'avertissement](how_to_add_error_codes.md) pour connaître le pipeline de diagnostic complet.

## Outil du Studio : Estimations

La modale **Estimations** (`src/app/features/studio/estimations/`) s'ouvre depuis le menu **Outils** du Studio et depuis les accès rapides (outil `estimations` du `ToolbarDialogService`). Elle contient trois onglets : **Température de conformité** (US.EST.TCO), **Pression vent pour distance mini.** (US.EST.PRE-DIS) et **Effort déplacement vert. câble** (US.EST.PDS-TRA). Chaque onglet étend `EstimationCalculationBase` (`presentation/estimation-calculation.base.ts`), qui gère le calcul, la correspondance entre le résultat et le canton, le verrouillage des saisies et la copie dans le presse-papier ; chaque onglet fournit son formulaire, sa tâche et la conversion de ses entrées. Les deux onglets d'obstacle étendent `EstimationFormBase` (`presentation/estimation-form.base.ts`), qui ajoute le choix de l'obstacle et du point et ne demande que les champs numériques. Leur mise en page est partagée par les mixins de `_estimation-form.scss`.

L'onglet **Température de conformité** (`TemperatureEstimationComponent`) invite à choisir un obstacle tant qu'aucun n'est sélectionné, et liste les obstacles du canton ayant au moins un point (filtrables par nom). L'obstacle sélectionné dans le Studio (`ObstaclesService.selectedMeasureUuid`) est présélectionné à l'ouverture de l'onglet ; sinon, ou si la sélection est un sol, aucun n'est sélectionné. La liste **Point** est en lecture seule et positionnée sur le premier point de l'obstacle sélectionné. La **Distance verticale cible** est obligatoire, dans ]0 ; 150] m avec au plus 2 décimales (minimum `0.01` : le moteur accepte une distance nulle mais ne l'atteint jamais et répond par un `EstimationNotConvergedWarning`). **Calculer** exécute `estimateTemperature` avec `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex` et `bounds = [-50, 250]` °C ; l'obstacle et la distance sont verrouillés jusqu'à la fin du calcul, pour que le résultat leur corresponde toujours. Le résultat est affiché avec 2 décimales et peut être copié dans le presse-papier ; il est effacé dès qu'une saisie ou le canton change. En cas d'échec, le message d'erreur Python localisé est affiché, ou à défaut `studio.estimations.calculation-failed`. Quand la cible est au-delà des bornes de recherche, la valeur la plus proche trouvée est tout de même affichée, avec un avertissement qui cite la borne avec son unité (`EstimationCalculationBase.boundsUnitKey`, `toBoundsErrorParams`), p. ex. « La cible ne peut pas être atteinte : elle nécessite plus de 250 °C. La valeur la plus proche trouvée est affichée. ».

L'onglet **Pression vent pour distance mini.** (`WindPressureEstimationComponent`) reprend le comportement de l'obstacle et du point. La **Température** est obligatoire, dans [-50 ; 250] °C avec au plus 2 décimales. **Calculer** exécute `estimateMinimumDistanceWind` avec `spanIndex = obstacle.supportIndex`, `obstacleUuid`, `pointIndex`, `temperature` et `bounds = [-1000, 1000]` Pa. Les résultats affichent la **Pression de vent** sans décimale (copiable, sans séparateur de milliers) et la **Distance oblique minimum** avec 2 décimales. En cas d'échec, le message d'erreur Python localisé est affiché, ou à défaut `studio.estimations.wind-pressure-calculation-failed`.

L'onglet **Effort déplacement vert. câble** (`EffortEstimationComponent`) estime l'effort à appliquer en un point d'une portée, sans obstacle. La liste **Portée** (filtrable) contient toutes les portées du canton, la portée courante étant sélectionnée par défaut ; la liste **Support de référence** est réduite aux deux supports de la portée (support de départ par défaut). La **Distance au support de référence** est obligatoire, dans [0 ; longueur de portée] m avec au plus 2 décimales (0 par défaut), la **Température** est obligatoire, dans [-50 ; 250] °C avec au plus 2 décimales (vide par défaut), et le **Dépl. cible** est un interrupteur **Montée** (défaut) / **Descente** avec un entier obligatoire dans [0 ; 150] m (0 par défaut). **Calculer** exécute `estimateLoadRelative` (`toEffortEstimationInputs`) avec `spanIndex`, `loadPositionDistance` (la distance, ou la longueur de portée moins la distance depuis le support de droite), `temperature`, `targetDistance` (le déplacement, négatif pour **Descente**) et les `bounds` de masse : `[-2000, 0]` kg pour **Montée** (traction) ou `[0, 2000]` kg pour **Descente** (poids) (`EFFORT_MAX_LOAD_MASS`). Les résultats affichent l'effort **Traction (-) / Poids (+)** en daN (`effort`, copiable, sans unité ni séparateur de milliers) et le **Déplact selon axe de portée (x)** en m (valeur absolue de `extra.x_shift`), tous deux avec 2 décimales, et sont effacés dès qu'une saisie ou le canton change. En cas d'échec, le message d'erreur Python localisé est affiché, ou à défaut `studio.estimations.effort-calculation-failed`.

> Le moteur estime la température pour une distance verticale (`distance_type="vertical"`, défaut de mechaphlowers) entre le câble et le point d'obstacle, comme le libellé *Distance verticale cible* de l'interface.

## Limitation connue : direction du vent

Stellar configure la direction du vent en `clockwise`, mais l'estimateur mechaphlowers applique actuellement toujours le vent en `anticlockwise`. Cela peut affecter les résultats de l'estimation du vent, y compris le signe de la pression de vent pour distance minimale. Lorsque l'implémentation du moteur mechaphlowers sera mise à jour pour corriger cette divergence, reconstruisez le wheel du moteur local et les assets associés avec :

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
npx vitest run src/app/core/services/worker_python/tasks/ src/app/features/studio/estimations/
```

Les tests Python couvrent la structure des résultats, les estimations, la validation des entrées, les cibles inaccessibles, la conversion d'index, les portées divisées par des supports virtuels, l'avertissement de charge existante, la préservation de l'état de l'étude et la recherche de la pression de vent pour distance minimale (minimum de chaque côté, sur une borne, retournement des chaînes avant le minimum, distances NaN, échec de l'affinage).
