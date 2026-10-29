# Vérification de conformité

## Objectif

Un obstacle proche d’une portée (un arbre, un bâtiment, une route, le sol…) doit rester suffisamment
éloigné du câble, quelle que soit la météo. La **vérification de conformité** répond à cette question
pour un obstacle donné : elle déplace le câble de la portée selon les conditions climatiques des règles
réglementaires, mesure sa distance par rapport à l’obstacle dans chacune d’elles, puis indique, règle par
règle, si la distance requise est respectée.

Le résultat est un **tableau** de valeurs et un **graphique** des positions du câble autour de l’obstacle.

---

## Ce qui est vérifié

### Règles

Une **règle** est une exigence réglementaire. Elle définit :

- les **conditions climatiques** dans lesquelles la position du câble est évaluée (température du câble
  et pression du vent) ;
- les **distances minimales** à respecter, qui dépendent de la **tension électrique** de l’étude
  (63, 90, 150, 225 ou 400 kV) et du **type d’obstacle**.

Vous pouvez vérifier un obstacle contre plusieurs règles à la fois. Les règles proposées pour un obstacle,
et celles sélectionnées par défaut, dépendent de son type.

### Deux distances

| Distance | Mesurée | Position du câble |
|---|---|---|
| **Surplomb** | Verticalement, entre l’obstacle et le câble au-dessus de lui. | Câble dans l’état de surplomb de la règle. |
| **Latérale** | Horizontalement, à travers la portée, entre l’obstacle et le câble déporté latéralement par le vent. | Câble dans l’état latéral de la règle, dans **les deux** sens du vent. |

Certains types d’obstacle n’ont qu’une distance de surplomb.
D’autres en ont deux.

### La coupe transversale

Toutes les distances sont mesurées dans un plan vertical **perpendiculaire à la portée** et passant
par l’obstacle. Le graphique montre ce plan vu depuis le support :

- l’axe horizontal est la **distance à l’axe de la portée**, en mètres ;
- l’axe vertical est l’**altitude**, en mètres.

---

## Accès

1. Ouvrez une étude, puis une section dans le **Studio**.
2. Dans le formulaire d’obstacle, sélectionnez un obstacle **enregistré**.
3. Cliquez sur **Conformité**, à côté de **Calculer et enregistrer**.

La fenêtre **Respect conformité** s’ouvre. Si une condition n’est pas remplie, un message indique
laquelle, et la fenêtre ne s’ouvre pas :

| Message | Ce qu’il faut faire |
|---|---|
| *L'obstacle doit être enregistré* | Enregistrez d’abord l’obstacle. |
| *Le type d'obstacle '…' n'est pas éligible au contrôle de conformité* | Ce type d’obstacle n’a pas de règles de conformité. Rien ne peut être vérifié. |
| *Le canton doit avoir un niveau de tension électrique* | Définissez le niveau de tension électrique du canton. |

---

## Description des champs

### Obstacle

Récapitulatif de l’obstacle : **Nom**, **Type**, **Portée**, **Support de référence**,
**Type d’altitude d’obstacle**, et **Altitude point**, **Distance au support référence** et
**Distance axe ligne** du point. Ces champs ne sont pas modifiables ici.

Quand l’obstacle a plusieurs points, choisissez celui à vérifier dans **Point de l’obstacle**. Le choix est
obligatoire pour calculer.

:::{note}
Le calcul mesure les distances depuis le **point sélectionné**, et le graphique montre sa position sous la
forme *"<nom de l’obstacle> point N"*. Pour vérifier un autre point, sélectionnez-le et recalculez.
:::

### Tension électrique

La tension électrique de l’étude. Elle sélectionne les distances minimales de chaque règle. Elle ne peut pas
être modifiée ici.

### Zone de vent

La zone de vent de l’obstacle. Elle donne la pression du vent utilisée par les règles qui dépendent du vent.
Une zone par défaut est sélectionnée.

### Vent -

Inverse la direction du vent du cas **latéral** affiché dans le tableau. La direction opposée est toujours
vérifiée aussi, donc le verdict ne change pas : seul le côté affiché dans la colonne **Latéral** change.

### Présence de zone rouge

Cochez cette case lorsque l’obstacle est dans une zone rouge, où une pression du vent plus élevée s’applique.
La pression du vent de la zone sélectionnée devient alors la pression de **zone rouge** au lieu de la pression
normale, pour toutes les règles sélectionnées.

La case n’est affichée que pour les types d’obstacle concernés.

### Température de répartition (°C)

La température du câble pour le cas **surplomb** des règles qui ne fixent pas la leur. Une valeur par défaut
est proposée.

### Température de distance latérale (°C)

La température du câble pour le cas **latéral** des règles qui ne fixent pas la leur. L’indication sous le
champ donne la valeur de référence. Une règle qui fixe sa propre température latérale ignore ce champ.

Les deux températures sont obligatoires, entre **0** et **250 °C**, avec jusqu’à 2 décimales.

### Conformité

Les règles à vérifier. Les règles actives par défaut pour le type d’obstacle sont sélectionnées. Sélectionnez
ou désélectionnez des règles à tout moment : le graphique suit immédiatement, et les colonnes du tableau aussi
(voir [Résultats](#conformity-user-results)).

### Calculer

Lance le calcul. Le bouton est disponible lorsque le formulaire est valide et, pour un obstacle avec plusieurs points,
qu’un point est sélectionné.

---

(conformity-user-results)=
## Résultats

### Tableau

Chaque règle sélectionnée a une colonne **Surplomb** et, sauf pour un obstacle qui n’a que la distance de
surplomb, une colonne **Latéral**.

| Ligne | Signification |
|---|---|
| **Altitude câble** | Altitude du câble dans le cas considéré, dans le graphique. |
| **Distance axe ligne câble** | Position du câble dans le cas considéré, sous forme de distance à l’axe de la ligne, dans le graphique. |
| **Distance à respecter** | La distance requise par la règle, à la tension électrique de l’étude. |
| **Altitude à respecter** | *Surplomb* uniquement. Écart vertical entre l’obstacle et le câble dans le cas de surplomb, moins la distance à respecter. Une valeur négative signifie que l’obstacle est trop proche **ou au-dessus du câble**. |
| **Distance axe ligne respect** | *Latéral* uniquement. Distance entre l’obstacle et la position de câble la plus proche du côté latéral (deux directions du vent et positions intermédiaires), moins la distance à respecter. Une valeur négative signifie que l’obstacle est trop proche. |
| **Respect conformité** | Le verdict pour la règle : **Oui**, **Non** ou **Inconnu**. |

Une cellule est vide lorsque la valeur ne s’applique pas.

#### Cas distance minimale

Pour le tracé de conformité `cable_track`, un bloc **Cas distance minimale** ajoute, pour les colonnes
**Surplomb** et **Latéral**, la **Température** (°C), la **Pression du vent** (Pa) et la **Distance mini** (m).

Ces valeurs décrivent la **position du câble la plus proche** de l’obstacle. Chaque règle déplace le câble
à travers plusieurs scénarios, et chaque scénario donne une position du câble dans le graphique :

- colonne **Surplomb** : la position de surplomb ;
- colonne **Latéral** : la position latérale dans les deux sens du vent et les positions intermédiaires entre eux.

Pour chaque colonne, la position la plus proche de l’obstacle est conservée. **Distance mini** est la
distance, dans le graphique, entre l’obstacle et cette position, et **Température** et **Pression du vent**
correspondent au scénario qui l’a produite. Cela indique dans quelle condition climatique l’obstacle est le plus proche du câble.
La pression du vent de la colonne latérale est négative lorsque la position la plus proche est celle du sens opposé du vent.

### Respect conformité

Le verdict est calculé à partir des deux valeurs de conformité du tableau et dépend du
**type de graphique** de l’obstacle (voir [Graphique](#conformity-user-graph)) :

- `cable_track` : l’obstacle est comparé à des **zones circulaires**. La valeur de surplomb est la distance à la position de surplomb et la valeur latérale la distance à la position latérale la plus proche, chacune moins sa distance à respecter. Le verdict est **Oui** lorsque l’obstacle est hors des zones circulaires, c’est-à-dire lorsque aucune valeur n’est négative (une valeur égale à 0 est conforme).
- `vegetation` : l’obstacle est comparé à un **rectangle**. La valeur de surplomb est l’écart vertical jusqu’à la position de surplomb et la valeur latérale l’écart horizontal jusqu’à la position latérale la plus proche, chacune moins sa distance à respecter. Le verdict est **Non** seulement lorsque l’obstacle est **à l’intérieur du rectangle** : trop proche verticalement (ou au-dessus du câble), et soit trop proche latéralement soit horizontalement entre les positions latérales. Être trop proche sur un seul axe n’est pas suffisant.
- `overhang` : l’obstacle est comparé à une **ligne**. Seule la valeur de surplomb existe : l’écart vertical jusqu’à la position de surplomb moins la distance de surplomb. Le verdict est **Oui** quand il n’est pas négatif, donc **Non** quand l’obstacle est trop proche ou au-dessus du câble.

Le verdict est **Inconnu** lorsque la règle n’a pas de résultat : par exemple une règle que vous avez sélectionnée
**après** le calcul. Cliquez sur **Calculer** à nouveau pour l’inclure.

Le graphique aide à visualiser la situation ; la ligne **Respect conformité** est le résultat de référence.

(conformity-user-graph)=
### Graphique

Chaque règle a sa propre couleur. L’obstacle est le **losange** sombre. Les positions du câble sont des marqueurs ;
survolez un point pour lire ses coordonnées, utilisez la molette pour zoomer et la barre d’outils du graphique pour
panoramiser ou enregistrer une image. Les deux axes ont la même échelle, donc les distances ne sont pas déformées.

Le graphique dépend du **type de graphique** de l’obstacle : `overhang`, `vegetation` ou `cable_track`.
L’affectation ci-dessous correspond au catalogue par défaut.

#### `overhang` : ligne horizontale

Pour les obstacles avec une distance de surplomb uniquement. Chaque règle dessine une ligne horizontale,
à l’altitude de la position du câble moins la distance de surplomb. L’obstacle doit rester **sous** la ligne.

#### `vegetation` : tranchée (rectangle)

Utilisé pour la végétation. Les positions du câble de chaque règle (surplomb, latéral et latéral dans la direction opposée)
sont entourées par une zone de dégagement, prolongée de la distance latérale sur les côtés et de la distance de surplomb
en haut et en bas. La bordure est dessinée sur les côtés et le bas, comme une tranchée.

#### `cable_track` : disques (zones de rayon)

Utilisé pour les bâtiments et structures. Chaque position du câble est le centre d’un **disque** dont le rayon est la distance à respecter.
Les positions sont le cas de surplomb, le cas latéral dans les deux directions et les positions intermédiaires entre elles,
qui donnent la *trajectoire* du câble. L’obstacle doit rester **hors** de tous les disques. Les disques sont entièrement opaques.

### Agrandir le graphique

**Agrandir la vue graphique** masque le formulaire et le tableau et donne tout l’espace à la figure.
**Réduire la vue graphique** les fait réapparaître.

---

## Enregistrer

**Enregistrer** conserve les choix du formulaire (zone de vent, cases à cocher, températures, règles sélectionnées et point).
Les résultats eux-mêmes ne sont pas enregistrés : lorsque vous rouvrez la fenêtre d’un obstacle avec des choix enregistrés,
le calcul est relancé automatiquement.

:::{note}
**Rapport** et **Export** sont affichés dans la fenêtre mais ne sont pas encore disponibles.
:::

---

## Dépannage

| Message | Cause |
|---|---|
| *Impossible de calculer la conformité : le type d'obstacle n'a pas de configuration de conformité* | Le catalogue n’a pas de paramètre de conformité pour ce type d’obstacle. |
| *Échec du calcul : …* | Le moteur n’a pas pu calculer. Le message indique pourquoi, par exemple si aucune zone de vent n’est sélectionnée. |

Les règles, les distances, les conditions climatiques et les zones de vent font partie du catalogue de l’application.
Pour les modifier, consultez le {doc}`guide développeur <../developer_guide/configure_conformity>`.

---

## Documentation associée

- {doc}`Obstacles <obstacles>` — types d’altitude et affichage des obstacles dans le graphique.
- {doc}`Positionnement libre <plot/free-positioning>` — placez les obstacles sur le graphique.
