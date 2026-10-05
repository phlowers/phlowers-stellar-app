# Onglet Calcul du paramètre

## Objectif

L'onglet **Calcul du paramètre** fournit des méthodes de mesure de terrain pour calculer le paramètre électrique de fléchage à partir d'observations d'angle et de distance sur site. Actuellement, seule la méthode **PAPOTO** est implémentée ; les méthodes Tangent Aiming et PEP sont des composants d'espace réservé (boutons radio désactivés).

Le paramètre calculé alimente ensuite l'onglet **Paramètre à 15 °C sans vent** en mode « auto », qui utilise `outputs.papoto.parameter` et `outputs.papoto.uncertainty` pour effectuer les calculs thermiques suivants.

## Arborescence des composants et fichiers

L'onglet de calcul du paramètre est implémenté par les composants suivants (chemins relatifs depuis `src/app/features/studio/field-measuring/`) :

- **Sélecteur de méthode et conteneur** : `presentation/components/calculus-setting/calculus-setting.component.ts` et `.html`
  - Boutons radio pour PAPOTO, Tangent Aiming (désactivé), PEP (désactivé)
  - Affichage conditionnel du composant enfant selon la sélection
- **Formulaire de mesure PAPOTO** : `presentation/components/calculus-setting/papoto/papoto.component.ts` et `.html`
  - Champs de saisie pour la longueur de portée, la différence d'altitude et 12 angles (HL, H1–H3, HR, VL, V1–V3, VR)
  - Boîte de dialogue d'aide avec guidance visuelle (`papoto-help.webp`)
  - Section de résultats (paramètre, incertitude, paramètres 1–2, 2–3, 1–3, critère de validité à 0,5 %)
  - **Composants de remplacement** (sans logique) :
    - `presentation/components/calculus-setting/tangent-aiming/tangent-aiming.component.ts` (désactivé)
    - `presentation/components/calculus-setting/pep/pep.component.ts` (désactivé)
- **Modèle de domaine** : `domain/types.ts` (exporte l'interface `FieldMeasure` avec les champs PAPOTO et `PapotoResult`)
- **Helpers** : `presentation/helpers.ts` et `presentation/constants.ts`
- **Mesure de terrain principale** : `presentation/components/field-measuring/field-measuring.component.ts` (cycle de vie, validation, synchronisation des onglets)

## Flux de données

```{mermaid}
sequenceDiagram
    User->>PapotoComponent: Remplir HL, H1..H3, HR, VL, V1..V3, VR, etc.
    User->>PapotoComponent: Cliquer sur « Calculer »
    PapotoComponent->>WorkerPythonService: runTask(Task.calculatePapoto, {inputs})
    WorkerPythonService->>Pyodide Worker: Passer la tâche + dictionnaire d'entrée au worker web
    Pyodide Worker->>handle-task: Envoyer Task.calculatePapoto → calculate_papoto
    handle-task->>api.py: Appeler calculate_papoto(js_inputs.to_py())
    api.py->>papoto.py: Appeler calculate_papoto(inputs) depuis stellar_engine.tools
    papoto.py->>PapotoParameterMeasure: Créer et exécuter PapotoParameterMeasure()
    PapotoParameterMeasure->>mechaphlowers: Calculer 3 paramètres PAPOTO (1-2, 2-3, 1-3)
    mechaphlowers-->>PapotoParameterMeasure: Retourner paramètre, validité, parameter_1_2, parameter_2_3, parameter_1_3
    PapotoParameterMeasure->>uncertainty: Monte Carlo (draw_number=1000, angle_error=0.01 grad)
    uncertainty-->>PapotoParameterMeasure: Retourner std_parameter_valid_values
    PapotoParameterMeasure-->>papoto.py: Retourner {parameter, parameter_1_2, parameter_2_3, parameter_1_3, checkValidity, uncertainty}
    papoto.py-->>api.py: Retourner dictionnaire de résultats
    api.py-->>handle-task: Retourner le résultat au worker Pyodide
    Pyodide Worker-->>WorkerPythonService: postMessage(result)
    WorkerPythonService-->>PapotoComponent: Résoudre avec {result, error}
    PapotoComponent->>PapotoComponent: Mettre à jour measureData().outputs.papoto
    PapotoComponent->>User: Afficher les résultats (paramètre, incertitude, paramètres, critère)
```

## Entrées et sorties

### Entrées de `calculate_papoto`

Tous les angles sont exprimés en **grads (Gr)** (100 grad = 90°). Les distances sont en **mètres (m)**.

| Champ | Type | Unité | Signification |
|---|---|---|---|
| `spanLength` | number | m | Longueur mesurée de la portée (distance entre les deux supports) |
| `measuredElevationDifference` | number | m | Distance verticale entre les points d'attache du câble gauche et droit |
| `HL` | number | Gr | Angle horizontal du support gauche au point de mesure gauche |
| `H1` | number | Gr | Angle horizontal au premier point intermédiaire |
| `H2` | number | Gr | Angle horizontal au deuxième point intermédiaire |
| `H3` | number | Gr | Angle horizontal au troisième point intermédiaire |
| `HR` | number | Gr | Angle horizontal du support droit au point de mesure droit |
| `VL` | number | Gr | Angle vertical du support gauche au point de mesure gauche |
| `V1` | number | Gr | Angle vertical au premier point intermédiaire |
| `V2` | number | Gr | Angle vertical au deuxième point intermédiaire |
| `V3` | number | Gr | Angle vertical au troisième point intermédiaire |
| `VR` | number | Gr | Angle vertical du support droit au point de mesure droit |

**Support de gauche** : l'utilisateur choisit dans une liste déroulante. Les deux options sont les supports gauche et droit de la portée.

### Sorties de `calculate_papoto`

| Champ | Type | Unité | Signification |
|---|---|---|---|
| `parameter` | number | m | Moyenne des trois paramètres PAPOTO calculés à partir des paires de points 1–2, 2–3 et 1–3 |
| `parameter_1_2` | number | m | Paramètre PAPOTO calculé à partir des points de mesure 1 et 2 |
| `parameter_2_3` | number | m | Paramètre PAPOTO calculé à partir des points de mesure 2 et 3 |
| `parameter_1_3` | number | m | Paramètre PAPOTO calculé à partir des points de mesure 1 et 3 |
| `checkValidity` | boolean | — | Indique si le critère de validité (0,5 %) est satisfait (true si la validité < 0,005) |
| `uncertainty` | number | m | $2 \times \text{std}(\text{paramètre des échantillons valides})$, calculé via Monte Carlo (1000 tirages, erreur d'angle ±0,01 grad) |

## Champs de `FieldMeasure`

Le modèle `FieldMeasure` stocke à la fois les entrées et les sorties :

### Entrées (depuis le formulaire PAPOTO)

- `leftSupport: string | null` – support sélectionné (par exemple, « 1 », « 2 »)
- `spanLength: number | null` – longueur de portée mesurée (m)
- `measuredElevationDifference: number | null` – différence d'altitude mesurée (m)
- `HL, H1, H2, H3, HR: number | null` – angles horizontaux (Gr)
- `VL, V1, V2, V3, VR: number | null` – angles verticaux (Gr)

### Sorties

- `outputs.papoto: PapotoResult | null` – objet résultat contenant les six champs ci-dessus (paramètre, parameter_1_2, parameter_2_3, parameter_1_3, checkValidity, uncertainty)

## Validation et gestion des erreurs

### Validation du formulaire

Les 13 champs sont obligatoires (appliqués par `isFormValid()` calculé dans `PapotoComponent`) :
- le support de gauche doit être sélectionné
- tous les champs de longueur de portée, d'altitude et d'angle doivent avoir une valeur non nulle

Le bouton **Calculer** reste désactivé tant que tous les champs ne sont pas remplis.

### Erreurs de calcul

Si une erreur survient pendant le calcul Python (par exemple, plage d'angle invalide, échec de convergence), ce qui suit se produit :

1. le drapeau d'erreur `papotoError` est défini à true.
2. le message d'erreur **« Une erreur s'est produite »** (`field-measuring.papoto.error-message`) est affiché à l'utilisateur.
3. `outputs.papoto` est effacé (mis à `null`).
4. la section de résultats est masquée.

Les détails de l'erreur sont consignés dans la console du navigateur, mais ne sont pas exposés à l'utilisateur final dans l'interface.

## Intégration avec l'onglet Paramètre à 15 °C

Quand l'utilisateur ouvre l'onglet **Paramètre à 15 °C sans vent** en mode de mise à jour **« auto »** :

1. `parameterPapoto` est alimenté depuis `outputs.papoto.parameter`
2. `parameterUncertaintyPapoto` est alimenté depuis `outputs.papoto.uncertainty`

Si l'utilisateur bascule en mode **« manuel »**, les valeurs préremplies automatiquement sont conservées et deviennent modifiables. Toute modification des entrées PAPOTO (HL, H1, etc., ou longueur de portée) efface le résultat obsolète (`outputs.papoto = null`), forçant ainsi un recalcul si nécessaire.

## Tests

**Tests du composant Angular :**
- `src/app/features/studio/field-measuring/presentation/components/calculus-setting/papoto/papoto.component.spec.ts`

**Tests Python backend :**
- `stellar-engine/test/tools/test_papoto.py` (teste la fonction `papoto.calculate_papoto()` et la classe `PapotoParameterMeasure` de mechaphlowers)

## Notes de conception

- Le **bouton d'aide** ouvre une boîte de dialogue affichant un diagramme visuel (`papoto-help.webp`) expliquant la géométrie de mesure et l'étiquetage des points.
- Le bouton « Import station's datas » est actuellement désactivé (espace réservé pour une future importation).
- Un message d'information secondaire (« Tous les champs sont obligatoires pour le réglage du calcul ») est affiché pour guider les utilisateurs.
- Deux champs supplémentaires en lecture seule affichent **des valeurs calculées** (à partir de l'analyse du terrain) :
  - Longueur calculée de la portée (depuis le service de traçage)
  - Différence calculée d'altitude (depuis le service de traçage)
  Ces champs aident les utilisateurs à valider leurs mesures manuelles.
- Les angles sont affichés et saisis en **grads (Gr)** dans l'interface ; le backend Python attend la même unité.
- Les valeurs de paramètre sont **arrondies à une décimale au niveau du calcul Python**.
