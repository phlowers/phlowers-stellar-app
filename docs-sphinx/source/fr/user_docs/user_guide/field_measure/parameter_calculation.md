# Onglet Calcul du paramètre

## À quoi sert-il ?

L'onglet **Calcul du paramètre** permet aux personnes sur le terrain de mesurer le paramètre d'une portée en effectuant des mesures de terrain. Enregistrez les angles et distances de deux ou trois points d'observation, et {{app_name}} calcule le paramètre du câble avec différentes méthodes.

Le paramètre calculé est ensuite utilisé par l'onglet **Paramètre à 15 °C sans vent** pour générer une condition initiale (état de référence) pour la simulation.

## Choisir une méthode de calcul

Trois méthodes sont disponibles dans un sélecteur radio :

- **PAPOTO** (activé)
  - Mesure les angles et les distances à partir de plusieurs points d'observation
  - Plus précise avec 3 points de mesure ; fournit un contrôle de validité
  - C'est la méthode que vous utiliserez

- **Visée tangentielle** (désactivée)
  - Pas encore disponible dans {{app_name}}

- **PEP** (désactivée)
  - Pas encore disponible dans {{app_name}}

## Configuration de la mesure PAPOTO

Tous les champs du formulaire PAPOTO sont **obligatoires**. Vous devez les remplir tous avant de cliquer sur **Calculer**.

### Informations globales sur la portée

| Libellé | Unité | Signification |
|---|---|---|
| **Support de gauche** | — | Sélectionnez l'extrémité de la portée considérée comme le support « gauche » (les deux options sont les supports de la portée sélectionnée). Cela détermine la manière dont les angles horizontaux sont mesurés. |
| **Longueur mesurée de la portée** | m | Distance entre les deux points d'attache du câble sur les supports. |
| **Diff. d'altitude des attaches mesurées** | m | Différence de hauteur verticale entre les points d'attache gauche et droit. Si le côté droit est plus haut, la valeur est positive. |

Dans {{app_name}}, deux champs **Valeur calculée** (lecture seule) affichent la longueur de la portée et la différence d'altitude calculées à partir de l'analyse du terrain. Comparez-les avec vos valeurs mesurées pour valider vos mesures.

### Angles de mesure

Enregistrez les angles de deux à trois points d'observation le long du câble. Tous les angles sont exprimés en **grads (Gr)** (100 Gr = 90°, ou 400 Gr = 360°).

| Libellé | Unité | Signification |
|---|---|---|
| **HL** | Gr | Angle horizontal du support gauche au point d'observation gauche |
| **VL** | Gr | Angle vertical du support gauche au point d'observation gauche |
| **H1** | Gr | Angle horizontal au premier point d'observation intermédiaire |
| **V1** | Gr | Angle vertical au premier point d'observation intermédiaire |
| **H2** | Gr | Angle horizontal au deuxième point d'observation intermédiaire |
| **V2** | Gr | Angle vertical au deuxième point d'observation intermédiaire |
| **H3** | Gr | Angle horizontal au troisième point d'observation intermédiaire |
| **V3** | Gr | Angle vertical au troisième point d'observation intermédiaire |
| **HR** | Gr | Angle horizontal du support droit au point d'observation droit |
| **VR** | Gr | Angle vertical du support droit au point d'observation droit |

**Comment les angles sont-ils mesurés :**
- **Les angles horizontaux (H)** sont mesurés perpendiculairement à l'axe de la portée
- **Les angles verticaux (V)** sont mesurés dans le plan vertical contenant la portée
- Les angles sont signés (positifs / négatifs) selon la direction du point d'observation

Le bouton **Aide** (avec une icône ?) ouvre un diagramme visuel montrant comment ces angles sont mesurés et étiquetés.

## Exécution du calcul

1. **Remplissez tous les champs obligatoires** ci-dessus.
2. Cliquez sur le bouton **Calculer** (avec une icône de fusée).
3. {{app_name}} envoie vos mesures au moteur de calcul Python.
4. Les résultats apparaissent dans la section **Résultats** ci-dessous.

Le bouton **Calculer** est désactivé (grisé) tant que tous les champs ne contiennent pas une valeur. Une note au-dessus du formulaire rappelle : « Tous les champs sont obligatoires pour le réglage du calcul ».

## Lecture des résultats

Après le calcul, les résultats suivants sont affichés :

### Sortie principale

| Libellé | Unité | Signification |
|---|---|---|
| **Paramètre** | m | Paramètre de fléchage du câble (moyenne des trois calculs par paires). C'est la valeur utilisée pour l'étape suivante. |
| **paramètre d'incertitude** | m | Incertitude de mesure (±), calculée en faisant varier chaque angle de ±0,01 grad et en recalculant 1000 fois. La valeur affichée est $2 \times \text{écart type}$ des résultats valides. |

### Paramètres de diagnostic

| Libellé | Unité | Signification |
|---|---|---|
| **Paramètre 1-2** | m | Paramètre de fléchage calculé à partir des points de mesure 1 et 2 uniquement. Aide au diagnostic de cohérence des mesures. |
| **Paramètre 2-3** | m | Paramètre de fléchage calculé à partir des points de mesure 2 et 3 uniquement. |
| **Paramètre 1-3** | m | Paramètre de fléchage calculé à partir des points de mesure 1 et 3 uniquement (sans le point 2). |

Toutes les valeurs de paramètre sont **arrondies à une décimale au niveau Python** (par exemple, 12,5 m) et affichées en conséquence.

### Critère de validité

| Libellé | Signification |
|---|---|
| **Critère de 0,5 %** | Affiche **Oui** (icône ✓) ou **Non** (icône ✗). La mesure est valide si les trois paramètres par paires concordent à moins de 0,5 % de leur moyenne. Un « Non » indique que vos points de mesure ont pu être mal enregistrés ou que la géométrie de la portée rend la mesure difficile. |

## Messages d'erreur

Si le calcul échoue, un message d'erreur apparaît :

**« Une erreur s'est produite »**

Cela peut se produire si :
- les valeurs d'angle sont hors plage attendue
- le solveur numérique ne parvient pas à converger
- les données d'entrée sont incohérentes

Vérifiez les valeurs saisies et réessayez. Si l'erreur persiste, examinez vos mesures de terrain.

## Étape suivante

Une fois un résultat PAPOTO valide obtenu, passez à l'onglet **Calcul de la température** pour mesurer la température de surface du câble et le rayonnement solaire. Puis passez à l'onglet **Paramètre à 15 °C sans vent** (où le paramètre PAPOTO est prérempli automatiquement en mode « auto ») pour générer la condition initiale de simulation.
