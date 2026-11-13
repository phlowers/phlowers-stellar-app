# Visées tangentes

## Objectif

Les visées tangentes calculent le paramètre de fléchage d'une portée à partir de l'angle de la tangente au câble vue depuis un appareil de visée. Trois variantes existent, sélectionnées par `FieldMeasure.calculationMethod` ; elles ne diffèrent que par la **position de l'appareil** par rapport au support de gauche et par la manière dont leurs entrées sont converties pour le moteur.

| Variante | `calculationMethod` | Position de l'appareil | Composant de formulaire |
|---|---|---|---|
| Support | `tangente-aiming` | À la verticale de l'accrochage du câble du support de gauche | `TangentAimingSupportComponent` |
| Intérieur | `tangente-aiming-interior` | Dans la portée, à droite du support de gauche | `TangentAimingInteriorComponent` |
| Extérieur | `tangente-aiming-exterior` | Hors de la portée, à gauche du support de gauche | `TangentAimingExteriorComponent` |

Les méthodes PAPOTO et PEP ne sont pas des visées tangentes et sont absentes de `TANGENT_AIMING_MODES`.

## Fichiers

Chemins relatifs à `src/app/features/studio/field-measuring/presentation/` :

- `components/calculus-setting/calculus-setting.component.*` : sélecteur radio et conteneur affichant le formulaire de la méthode sélectionnée.
- `components/calculus-setting/tangent-aiming-support/`, `tangent-aiming-interior/`, `tangent-aiming-exterior/` : un composant par variante, chacun avec son `.constantes.ts` (description des champs et règles), son `.helpers.ts` (fabrique de formulaire, valeurs par défaut, validité, entrées de la tâche) et son `.interfaces.ts`.
- `components/calculus-setting/tangent-aiming-common/` : logique partagée par les trois variantes.
  - `tangent-aiming-form.base.ts` : `TangentAimingFormBase`, directive abstraite portant l'état du formulaire, le suivi du support de gauche et le déroulement de `calculate()`. Chaque composant fournit uniquement un `TangentAimingFormConfig`.
  - `tangent-aiming-common.constantes.ts` : `TANGENT_AIMING_FIELD_RULES` (bornes / décimales / défaut de chaque type de saisie) et `TANGENT_AIMING_CALCULATION_TYPE`.
  - `tangent-aiming-header/`, `tangent-aiming-number-field/`, `tangent-aiming-results/` : composants de présentation partagés (le composant de résultats affiche paramètre, incertitude et critère 1 %).
- `tangent-aiming-modes.constantes.ts` : `TANGENT_AIMING_MODES`, comportement de chaque variante (clé de sortie, validité, valeurs par défaut, invalidation du résultat, réinitialisation des champs masqués) retrouvé via `calculationMethod`.

## Modèle persisté

Chaque variante a ses propres champs dans `FieldMeasure` (`@shared/domain/models/field-measure.model`) et son propre résultat dans `outputs` :

| Variante | Support de gauche | Type de calcul | Résultat |
|---|---|---|---|
| Support | `tangentLeftSupport` | `calculationType` | `outputs.tangentAimingSupport` |
| Intérieur | `interiorLeftSupport` | `interiorCalculationType` | `outputs.tangentAimingInterior` |
| Extérieur | `exteriorLeftSupport` | `exteriorCalculationType` | `outputs.tangentAimingExterior` |

Seule la méthode de calcul active est persistée à l'enregistrement d'une mesure ; les saisies des autres méthodes sont effacées.

## Calcul

`TangentAimingFormBase.calculate()` exécute toujours `Task.calculateTangentAiming` avec les entrées renvoyées par `config.toTaskInputs` de la variante. Le worker la route vers `calculate_tangent_aiming` (`stellar-engine/src/stellar_engine/tools/tangent_aiming.py`), qui s'appuie sur `mechaphlowers.TangentialSightingParameterMeasure` et renvoie `parameter`, `uncertainty`, `criterion` (en pourcentage) et `checkValidity`.

Les trois variantes partagent le même appel au moteur (angles en grades, longueurs en mètres). La position de l'appareil est encodée dans la correspondance entre champs du formulaire et entrées de la tâche :

| Entrée de la tâche | Support | Intérieur | Extérieur |
|---|---|---|---|
| `angleToCableTangent` | `tangentAngle` | `tangentAngle` | `tangentAngle` |
| `angleToLeftSupport` | `0` | `verticalAccAngleLeft` | `verticalAccAngleLeft` |
| `angleToRightSupport` | `verticalAccAngle` | `verticalAccAngleRight` | `verticalAccAngleRight` |
| `spanLength` | `spanLength` | `spanLength` | `spanLength` |
| `inputHeight` | `hAccDistance` (distance verticale) | `0` | `0` |
| `distance` | `0` | `hAccDistance` | `-hAccDistance` |

Une `distance` négative place l'appareil du côté extérieur du support de gauche (Extérieur).

```{note}
Seul le type de calcul `tangente` est calculé. Le type `parametre` peut être sélectionné et enregistré, mais le moteur ne déduit le paramètre qu'à partir de l'angle de la tangente au câble.
```

## Validation et invalidation

- Les saisies numériques sont validées par des validateurs de formulaire Angular construits à partir de `TANGENT_AIMING_FIELD_RULES` (p. ex. longueur de portée 0–5000 m, angles −200–200 gr) ; `is…DataValid` reconstruit le formulaire pour réutiliser ces validateurs sur une mesure persistée.
- Modifier une saisie affichée efface le résultat de la variante et le paramètre à 15 °C automatique qui en découle (`clearAutoParameter15C`).
- Le support de gauche vaut par défaut celui de la portée sélectionnée et est mémorisé par portée (`LeftSupportState`).
