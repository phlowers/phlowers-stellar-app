# Worker du moteur

L'application utilise un worker pour exécuter [mechaphlowers](https://github.com/phlowers/mechaphlowers), qui est le moteur de calcul de l'application. Le worker est situé à "src/app/core/engine/worker/worker.ts" et est responsable de :

- l'installation de mechaphlowers
- l'exécution du moteur
- le retour du résultat

## Installation de Mechaphlowers

L'installation de mechaphlowers se fait grâce à pyodide à l'aide de la fonction `loadPyodide`. Elle charge partiellement les wheels des paquets python nécessaires via un CDN pour les paquets les plus lourds (numpy, pandas, etc.) et charge le reste des paquets depuis les assets locaux.

Juste après l'installation, la fonction `pyodide.runPython` est utilisée pour exécuter un import initial de tous les paquets afin de les charger en mémoire.

## Exécution du moteur

Le moteur est exécuté avec la fonction `runTask`. Elle prend une tâche et un objet de données en arguments.

La tâche est une chaîne de caractères correspondant à la fonction à appeler dans le fichier `worker.ts`. Les fonctions sont des fichiers python situés dans le répertoire `src/app/core/engine/python-functions`.

Les données sont un objet contenant les données à transmettre à la fonction. Les données sont transmises à la fonction python grâce à la fonction `pyodide.globals.set`.

## Données retournées

Une fois la fonction python exécutée, le résultat du calcul est lu par le code javascript grâce à la fonction `pyodide.globals.get`, puis renvoyé à l'appelant de la fonction `runTask` via la fonction `postMessage`. Le résultat peut être utilisé pour mettre à jour l'interface utilisateur ou pour mettre à jour la base de données.

## Configuration cachée du moteur

Certaines options de mechaphlowers restent modifiables mais ne sont pas exposées dans l'interface. Elles sont surchargées depuis la console du navigateur, appliquées immédiatement puis de nouveau à chaque démarrage du worker.

### Commandes de la console

La console expose deux commandes sur l'objet global `stellarConfig`.

```js
stellarConfig.setEngineConfig({ 'solver.acceleration.banded_jacobian.active': false })
```

`setEngineConfig(config)` stocke l'objet `config` au format JSON dans la clé `engineConfig` du `localStorage` du navigateur et l'applique immédiatement. Chaque option surchargeable est d'abord restaurée à sa valeur par défaut de mechaphlowers, le résultat ne dépend donc que de `config`. Pour réinitialiser, appliquez un objet vide :

```js
stellarConfig.setEngineConfig({})
```

La configuration stockée est appliquée de nouveau à chaque démarrage du worker. Supprimer la clé avec `localStorage.removeItem('engineConfig')` ne modifie pas le worker en cours : rechargez l'application pour que cela prenne effet.

`stellarConfig.getEngineConfig()` retourne une promesse résolue avec la valeur courante, dans l'environnement Python, de chaque option surchargeable (ce qui est réellement appliqué, et non ce qui est stocké) :

```js
await stellarConfig.getEngineConfig()
// { 'solver.acceleration.banded_jacobian.active': true }
```

### Options disponibles

Les clés correspondent au chemin pointé de l'option dans l'objet `options` de mechaphlowers. Seules les clés listées ci-dessous sont acceptées.

| Clé | Type | Option mechaphlowers |
|---|---|---|
| `solver.acceleration.banded_jacobian.active` | booléen | `BandedJacobianConfig.active` |

### Fonctionnement de l'application

1. Le worker charge Pyodide, puis `functions.py` exécute `init_config()` et `api.py` est chargé.
2. Une fois le worker prêt (et à chaque appel de `setEngineConfig` depuis la console), `WorkerPythonService` lit la clé `engineConfig` du localStorage et exécute la tâche `setEngineConfig`, qui appelle la fonction python `set_engine_config` (`stellar_engine/core/engine_config.py`).
3. Toutes les options surchargeables sont d'abord restaurées à leur valeur par défaut. Si la configuration stockée est vide, rien d'autre n'est modifié et un log d'information « No engine configuration overload » est émis. Si le contenu stocké n'est pas un objet JSON, un log d'avertissement est émis dans la console et une configuration vide est envoyée.
4. Sinon, chaque clé/valeur est validée : clé exacte, type et contenu de la valeur. Les entrées invalides sont ignorées et un log d'avertissement « Wrong engine configuration loaded ... check or reset it » est émis.
5. Les entrées validées sont appliquées sur les `options` de mechaphlowers. Un log d'avertissement liste chaque option surchargée avec sa valeur, et un avertissement python `EngineConfigWarning` est levé. Il est affiché une fois à l'utilisateur sous forme de toast (voir [ajouter des codes d'erreur](how_to_add_error_codes.md)).

Pour rendre une nouvelle option surchargeable, ajoutez son chemin pointé et une fonction de validation à `ENGINE_CONFIG_VALIDATORS` dans `engine_config.py`, puis reconstruisez le wheel du moteur avec `npm run set-up-mechaphlowers:engine-only`.
