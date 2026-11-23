# Configurer la conformité

La vérification de conformité d’un obstacle est **entièrement pilotée par un seul fichier de paramètrage**,
`public/data/obstacle_configuration.json`. Il déclare quels types d’obstacle peuvent être vérifiés,
quelles règles réglementaires leur sont applicables, les distances légales par tension, les conditions
climatiques de chaque règle et les zones de vent. Aucun changement de code n’est nécessaire pour ajouter
un type d’obstacle, une règle ou une zone de vent.

Le fichier configure aussi l’outil **Tranchées forestières** de Studio, par ses blocs `forest_trenches` et
`floor_obstacle`. Ils sont décrits dans {doc}`app/forest_trenches` et dans
{ref}`conformity-config-forest-trenches`.

Cette page décrit le fichier. La manière dont le moteur l’utilise est décrite dans {doc}`conformity` ;
le point de vue utilisateur est présenté dans le {doc}`guide utilisateur <../user_guide/conformity>`.

---

## Du fichier à la vérification

```mermaid
flowchart LR
    JSON["public/data/obstacle_configuration.json"] -->|mise à jour du catalogue| IMP["configuration JSON d’import<br/>(obstacles.config.ts)"]
    IMP --> DB[("tables Dexie<br/>catObstacle*")]
    DB --> MODAL["modale Conformity<br/>(ConformityComponent)"]
    MODAL -->|"règles, distances, formulaire"| PY["Python get_conformity"]
```

- Le fichier est similaire à un **catalogue** : il est rafraîchi par la mise à jour du catalogue, pas par la
  mise à jour de l’application (voir {doc}`app/catalog_update`). Son SHA-256 est listé dans
  `data_hashes` de `assets_list.json`, généré par `npm run create-assets-list-for-service-worker`
  (partie de `npm run build`).
- L’import est un import JSON en **mode remplacement** (`createObstaclesConfig()` dans
  `src/app/shared/catalog/csv-import/configs/obstacles.config.ts`) : les six tables ci-dessous sont
  vidées et réécrites dans une transaction Dexie unique, donc le fichier est la source de vérité.
- La charge utile est vérifiée par `assertObstacleConfigurationJson()` avant toute écriture. Un
  fichier invalide est rejeté avec une erreur du type
  `Obstacle configuration: obstacles[3].redZone must be a boolean`, et le catalogue précédent reste en place.

| Partie JSON | Table Dexie | Entité |
|---|---|---|
| `obstacles[]` (nom, détails) | `catObstacleTypes` | `CatalogObstacleTypeEntity` |
| `obstacles[]` (`redZone`, `conformity`) | `catObstacleConfigurations` | `CatalogObstacleConfigurationEntity` |
| `obstacles[].distances[]` | `catObstacleDistances` | `CatalogObstacleDistanceEntity` |
| `rules[]` | `catObstacleRuleDefinitions` | `CatalogObstacleRuleDefinitionEntity` |
| `windZone.values[]` | `catObstacleWindZones` | `CatalogObstacleWindZoneEntity` |
| `repartitionTemperatureFields`, `lateralTemperatureFields`, `windZone.default`, `intermediatePointPositions`, `forest_trenches`, `floor_obstacle` (`redZone`, `distances`) | `catObstacleConformityConfig` (une ligne, clé `main`) | `CatalogObstacleConformityConfigEntity` |

Les champs `floor_obstacle.obstacleType`, `obstacleName` et `details` sont validés mais non
stockés : le sol n’est pas un type d’obstacle du catalogue.

Les entités sont dans `src/app/infrastructure/database/entities/`, et le mapping JSON→entité dans
`src/app/shared/catalog/csv-import/configs/obstacles.config.helpers.ts`.

---

## Structure du fichier

```json
{
  "obstacles": [ /* une entrée par type d’obstacle */ ],
  "rules": [ /* une entrée par règle réglementaire */ ],
  "repartitionTemperatureFields": { "defaultValue": 70 },
  "lateralTemperatureFields": { "defaultValue": 65, "ruleType": "RULE_2", "message": "..." },
  "windZone": { "default": "200", "values": [ /* zones de vent */ ] },
  "intermediatePointPositions": [0.33, 0.66],
  "forest_trenches": { /* réglages de l’outil Tranchées forestières de Studio */ },
  "floor_obstacle": { /* obstacle de sol de l’outil Tranchées forestières */ }
}
```

Les huit clés de premier niveau sont obligatoires.

---

## Types d’obstacle : `obstacles[]`

```json
{
  "obstacleType": "vegetation",
  "obstacleName": "Vegetation",
  "details": "Isolated tree or vegetation (...)",
  "redZone": true,
  "conformity": "vegetation",
  "distances": [
    {
      "ruleType": "RULE_1",
      "active": true,
      "overhang": { "63": 1.1, "90": 1.2, "150": 1.3, "225": 1.4, "400": 1.5 },
      "lateral":  { "63": 0.6, "90": 0.7, "150": 0.8, "225": 0.9, "400": 1.0 }
    }
  ]
}
```

| Champ | Type | Signification |
|---|---|---|
| `obstacleType` | chaîne | Identifiant technique, stocké dans `Obstacle.type`. Doit être unique. |
| `obstacleName` | chaîne | Libellé affiché dans le menu déroulant des types d’obstacle. |
| `details` | chaîne | Description du type d’obstacle. |
| `redZone` | booléen | Indique si la case **Présence de zone rouge** est affichée dans la modale Conformité pour ce type d’obstacle. Voir [Zone rouge](#conformity-config-red-zone). |
| `conformity` | `"overhang"`, `"cable_track"`, `"vegetation"` ou `null` | Type de graphique, qui sélectionne également la manière dont le moteur construit la zone. Voir [Types de graphique](#conformity-config-graph-types). |
| `distances` | tableau | Distances légales par règle. Un tableau vide rend le type d’obstacle **non éligible**. |

### Éligibilité

Le bouton **Conformité** du formulaire d’obstacle vérifie, dans `ObstaclesFormComponent.openConformityModal()`,
que l’obstacle est enregistré, que l’étude a un niveau de tension électrique et que
`catObstacleDistances` contient **au moins une ligne** pour ce type d’obstacle. Un type d’obstacle avec
`"distances": []` (zones de grande hauteur, proximité d’un silo dans le fichier livré) est donc refusé
avec *obstacle type '…' is not eligible for conformity control*.

Un type avec des distances mais `"conformity": null` ouvre la modale, mais le calcul est refusé avec
*Cannot calculate conformity: obstacle type has no conformity configuration*. Il est conseillé de conserver `distances` vide
**et** `conformity` à `null` ensemble.

(conformity-config-graph-types)=
### Types de graphique

| `conformity` | Figure | Distances à fournir |
|---|---|---|
| `overhang` | Ligne horizontale | `overhang` uniquement : `lateral` vaut `null` |
| `vegetation` | Tranchée | `overhang` et `lateral` |
| `cable_track` | Disques | `overhang` et `lateral` |

Le type pilote aussi le tableau : les colonnes **latérales** sont masquées pour `overhang`, et le
bloc **Cas distance minimale** n’est affiché que pour `cable_track`.

:::{warning}
Le moteur construit un scénario pour une direction uniquement lorsque sa distance n’est pas `null`.
Un obstacle `cable_track` sans distances latérales obtiendrait des points intermédiaires sans distance,
ce que la figure ne peut pas dessiner. Donnez toujours les deux distances aux obstacles `vegetation`
et `cable_track`.
:::

(conformity-config-distances)=
### Distances : `distances[]`

| Champ | Type | Signification |
|---|---|---|
| `ruleType` | chaîne | Doit correspondre à `ruleType` d’une entrée de `rules[]`. |
| `active` | booléen | La règle est **pré-sélectionnée** dans la multiselect de conformité. L’utilisateur peut toujours sélectionner une règle inactive. |
| `overhang` | carte ou `null` | Distance minimale verticale (m) par tension. `null` : la règle n’a pas de contrainte de surplomb. |
| `lateral` | carte ou `null` | Distance minimale horizontale (m) par tension. `null` : la règle n’a pas de contrainte latérale. |

Une table de distances est indexée par la tension en kV, **sous forme de chaîne** : `"63"`, `"90"`,
`"150"`, `"225"`, `"400"`. Le moteur choisit l’entrée correspondant à la tension de la section
(`voltage_idr`, par exemple `"400 KV"`). **Une table non nulle doit contenir les cinq clés** : une clé manquante
fait échouer le calcul. Une autre tension n’est pas prise en charge par le moteur : il faudrait
alors une nouvelle entrée dans `ElectricTensionMapper` (`stellar-engine/src/stellar_engine/entities/conformity.py`).

L’ordre des entrées de `distances[]` n’a pas d’importance : les règles atteignent le moteur dans
l’ordre renvoyé par Dexie, c’est-à-dire l’ordre de la clé primaire `[obstacle_type+rule_type]`
(alphabétique par `ruleType`). Cet ordre est la priorité d’empilement de la figure.

---

## Règles : `rules[]`

```json
{
  "ruleType": "RULE_2",
  "ruleName": "RULE_2",
  "color": "#FFA500",
  "lateralPoint":  { "temperature": null, "pressure": "WindZoneInput", "redZone": true },
  "overhangPoint": { "temperature": null, "pressure": 0,              "redZone": false }
}
```

| Champ | Type | Signification |
|---|---|---|
| `ruleType` | chaîne | Identifiant technique, clé primaire de `catObstacleRuleDefinitions`. |
| `ruleName` | chaîne | Libellé affiché dans la multiselect et les en-têtes de tableau. |
| `color` | chaîne | Couleur de la zone, **`#rrggbb`** (6 chiffres hexadécimaux : la figure le parse pour construire un `rgba()`). |
| `lateralPoint` | point | Condition climatique du câble pour le contrôle **latéral**. |
| `overhangPoint` | point | Condition climatique du câble pour le contrôle **de surplomb**. |

Une règle référencée par `distances[]` mais absente de `rules[]` affiche son `ruleType` comme libellé,
et n’a **aucun résultat** : elle n’est jamais envoyée au moteur comme condition climatique, donc sa colonne
reste vide avec la conformité *Inconnu*.

### Point de scénario climatique

Chaque point définit **l’état du câble** dans lequel sa position est mesurée.

| Champ | Valeur | Effet |
|---|---|---|
| `temperature` | nombre (°C) | Température fixe de la règle. |
| | `null` | La température saisie par l’utilisateur est utilisée : **Température de répartition** pour `overhangPoint`, **Température de distance latérale** pour `lateralPoint`. |
| `pressure` | nombre (Pa) | Pression de vent fixe de la règle. |
| | `"WindZoneInput"` | La pression de la zone de vent choisie par l’utilisateur. |
| `redZone` | booléen | Transmis au moteur, non utilisé. Voir [Zone rouge](#conformity-config-red-zone). |

La chaîne complète de surcharge, avec les cas testés par le moteur, est dans
{ref}`conformity-overwrite-rules`.

---

## Zones de vent : `windZone`

```json
"windZone": {
  "default": "200",
  "values": [
    { "label": "200",     "normal": 200, "redZone": 300 },
    { "label": "300",     "normal": 300, "redZone": 400 },
    { "label": "300-400", "normal": 300, "redZone": 400 }
  ]
}
```

| Champ | Signification |
|---|---|
| `default` | Libellé sélectionné à l’ouverture de la modale. Il doit correspondre à l’un des `label`s. |
| `values[].label` | Libellé affiché dans la liste **Zone de vent**. Unique. |
| `values[].normal` | Pression du vent (Pa) de la zone. |
| `values[].redZone` | Pression du vent (Pa) de la zone lorsque l’obstacle est dans une zone rouge. |

(conformity-config-red-zone)=
### Zone rouge

La zone rouge correspond à une **augmentation de la pression du vent**, et elle est entièrement
résolue par l’application avant d’appeler le moteur :

1. Le type d’obstacle a `"redZone": true` : la case **Présence de zone rouge** est affichée.
2. L’utilisateur sélectionne une zone de vent et coche, ou non, la case.
3. `ConformityComponent.effectiveWindPressure` prend `values[].redZone` si la case est cochée et
   `values[].normal` sinon.
4. Cette valeur est envoyée sous `form.windPressure`. Elle remplace toutes les pressions
   `"WindZoneInput"` des règles, **pour toutes les règles sélectionnées**.

Le moteur valide seulement `redZonePresence` et transmet la valeur `redZone` des points climatiques ;
il n’applique aucune logique de zone rouge. Les flags `rules[].lateralPoint.redZone` et
`rules[].overhangPoint.redZone` sont requis par le schéma et conservés dans le catalogue, mais aucun code
ne les lit : ils ne restreignent pas les règles qui reçoivent la pression de zone rouge.

---

## Paramètres scalaires

| Clé | Signification |
|---|---|
| `repartitionTemperatureFields.defaultValue` | Valeur initiale (°C) de **Température de répartition**. |
| `lateralTemperatureFields.defaultValue` | Valeur initiale (°C) de **Température de distance latérale**. Nombre fini obligatoire. |
| `lateralTemperatureFields.ruleType` | Règle dont le nom préfixe le libellé **Température de distance latérale**. Son `lateralPoint.temperature` n’est que la valeur initiale de secours, lorsque `defaultValue` manque dans la configuration enregistrée. |
| `lateralTemperatureFields.message` | Indication affichée sous **Température de distance latérale**. |
| `intermediatePointPositions` | Fractions dans `]0, 1[` localisant les états intermédiaires du câble pour le type de graphique `cable_track`. `[0.33, 0.66]` donne quatre points intermédiaires. Ignoré pour les autres types de graphique. |

:::{note}
La température latérale initiale est `lateralTemperatureFields.defaultValue`, quelle que soit la
`temperature` de la règle `lateralTemperatureFields.ruleType` (`null` pour `RULE_2` dans le fichier livré).
Une règle avec une `lateralPoint.temperature` fixe ignore le champ lors du calcul.
:::

Les deux champs de température acceptent des valeurs de 0 à 250 °C avec au plus 2 décimales
(`CONFORMITY_BOUNDS` dans `conformity.constantes.ts`).

---

(conformity-config-forest-trenches)=
## Tranchées forestières : `forest_trenches` et `floor_obstacle`

L’outil **Tranchées forestières** de Studio lit deux blocs du fichier. `forest_trenches` contient les
réglages de l’outil, `floor_obstacle` contient l’obstacle de sol qu’il vérifie. Les deux sont stockés dans
la ligne unique de `catObstacleConformityConfig`, et l’outil les lit via `getForestTrenchesConfig()`.

```json
"forest_trenches": {
  "ground_n_slicing_points_choices": [5, 9, 17],
  "overhang_rules_selected": ["RULE_1"],
  "lateral_rules_selected": ["RULE_1", "RULE_2"],
  "chart": {
    "cable": { "marker": "circle", "line": "solid" },
    "limit": { "marker": "square-open", "line": "dash" },
    "overhang_color": "#0000FF"
  }
},
"floor_obstacle": {
  "obstacleType": "floor",
  "obstacleName": "floor",
  "details": "",
  "redZone": true,
  "conformity": "forest_trenches",
  "distances": [
    {
      "ruleType": "RULE_1",
      "active": true,
      "overhang": { "63": 2.0, "90": 2.0, "150": 2.0, "225": 2.0, "400": 2.0 },
      "lateral": { "63": 3.0, "90": 3.0, "150": 3.0, "225": 0.0, "400": 3.0 }
    },
    {
      "ruleType": "RULE_2",
      "active": true,
      "overhang": { "63": 4.0, "90": 4.0, "150": 4.0, "225": 4.0, "400": 4.0 },
      "lateral": { "63": 5.0, "90": 5.0, "150": 5.0, "225": 5.0, "400": 5.0 }
    }
  ]
}
```

### `forest_trenches`

| Clé | Type | Signification |
|---|---|---|
| `ground_n_slicing_points_choices` | tableau non vide d’entiers ≥ 2 | Choix de **Nombre de points de découpage du sol**. Le premier est la valeur par défaut. |
| `overhang_rules_selected` | tableau de chaînes `ruleType` | Règles proposées par l’outil pour le calcul de surplomb. |
| `lateral_rules_selected` | tableau de chaînes `ruleType` | Règles proposées par l’outil pour le calcul latéral. |
| `chart.cable` | `{ marker, line }` | Style des courbes de câble. |
| `chart.limit` | `{ marker, line }` | Style des courbes limites. |
| `chart.overhang_color` | chaîne ou `null` | Couleur des courbes de câble de surplomb. `null` conserve la couleur de la règle. |

Les règles proposées par l’outil sont l’union de `overhang_rules_selected` et de
`lateral_rules_selected`. Une règle présente dans les deux listes est calculée en surplomb et en latéral ;
une règle présente dans une seule liste n’est calculée que pour ce contrôle.

Les valeurs de `marker` sont les clés de `PLOTLY_MARKER_SYMBOLS` : `circle`, `circle-open`, `square`,
`square-open`, `diamond`, `diamond-open`, `cross`, `cross-open`, `x`, `x-open`, `triangle-up`,
`triangle-up-open`, `triangle-down`, `triangle-down-open`, `star`, `star-open`. Les valeurs de `line` sont
les clés de `PLOTLY_LINE_DASHES` : `none` (marqueurs seuls), `solid`, `dot`, `dash`, `longdash`,
`dashdot`, `longdashdot`.

### `floor_obstacle`

| Clé | Type | Signification |
|---|---|---|
| `obstacleType`, `obstacleName`, `details` | chaîne | Validés seulement, non stockés. |
| `redZone` | booléen | Valeur par défaut de la case **Présence de zone rouge** de l’outil. La case est toujours affichée. |
| `conformity` | `"forest_trenches"` | Valeur obligatoire. |
| `distances[]` | tableau | Même format que [`distances[]`](#conformity-config-distances). Ce sont les distances utilisées par l’outil ; les distances de `obstacles[]` ne le sont pas. |

Le champ `active` d’une entrée de `distances[]` pré-sélectionne la règle dans l’outil.

:::{note}
Chaque règle sélectionnée dans l’outil a besoin à la fois :

- d’une entrée dans `floor_obstacle.distances[]`, faute de quoi le calcul échoue avec
  *Missing floor-obstacle distance for rule "…"* ;
- d’une entrée dans `rules[]`, faute de quoi il échoue avec *Missing climatic definition for rule "…"*.

Une règle `lateral` a besoin d’une table `lateral` non nulle, et une règle de surplomb d’une table
`overhang` non nulle, faute de quoi le moteur lève une `ConformityInputError`.

Un catalogue enregistré avant l’existence de ces clés n’a pas de configuration `forest_trenches` : l’outil
affiche alors le message de configuration manquante jusqu’à la mise à jour du catalogue.
:::

---

## How to

### Ajouter un type d’obstacle

1. Ajoutez une entrée à `obstacles[]` avec un nouveau `obstacleType`, un type de graphique `conformity` et
   une entrée `distances[]` par règle, avec les cinq tensions.
2. Vérifiez que chaque `ruleType` existe dans `rules[]`.

### Ajouter une règle

1. Ajoutez une entrée à `rules[]` avec un nouveau `ruleType` et une `color` non utilisée par les autres règles.
2. Ajoutez une entrée `distances[]` avec ce `ruleType` à chaque type d’obstacle qui doit être vérifié.

### Configurer les tranchées forestières

1. Ajoutez la règle à `forest_trenches.overhang_rules_selected` et/ou
   `forest_trenches.lateral_rules_selected`.
2. Ajoutez une entrée `floor_obstacle.distances[]` pour cette règle, avec les cinq tensions.
3. Vérifiez que la règle existe dans `rules[]`.
4. Vérifiez le changement avec `npm run test -- obstacles.config` et
   `npm run test -- forest-trenches`.

### Modifier une distance ou une condition climatique

Modifiez la valeur. Rien d’autre n’est nécessaire : la prochaine mise à jour du catalogue réécrit
les tables.

### Vérifier le changement

- `npm run test -- obstacles.config` lance la spécification d’import (validation et mapping).
- `npm run test -- conformity` lance les spécifications de la modale et de la figure.
- Ouvrez l’étude, un obstacle du type concerné, puis la modale **Conformité** : la multiselect liste
  les règles de `distances[]` avec les règles `active` pré-sélectionnées.

---

## Documentation associée

- {doc}`conformity` — le module Python de conformité et la couche TypeScript pilotée par sa sortie.
- {doc}`app/catalog_update` — comment le catalogue atteint la base de données hors ligne.
- {doc}`../user_guide/conformity` — la vérification de conformité telle que la voit l’utilisateur.
- {doc}`app/forest_trenches` — l’outil Tranchées forestières, son calcul et sa configuration de catalogue.
- {doc}`../user_guide/forest_trenches` — l’outil Tranchées forestières tel que le voit l’utilisateur.
