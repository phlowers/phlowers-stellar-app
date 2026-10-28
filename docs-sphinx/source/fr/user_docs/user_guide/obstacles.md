# Obstacles

## Altitude : absolue (NGF) ou relative

Chaque point d'obstacle possède une coordonnée `z` dont l'interprétation dépend du champ **Type d'altitude**.

- **Absolue (NGF)**
  - `z` est une altitude NGF absolue.
  - Sur les graphiques (2D/3D), le point est placé à l'altitude NGF saisie.
  - Exemple : si `z = 50`, le point se trouve à **50 NGF**, quel que soit le support.

- **Relative (au support)**
  - `z` est un delta par rapport à l'altitude NGF du support de référence.
  - L'altitude NGF affichée/placée sur les graphiques est :

$$\text{altitudeNGF} = \text{altitudeSupportNGF} + z$$

  - Exemple : si le support est à **30 NGF** et que `z = 20`, alors le point est à **50 NGF**.

## Affichage sur le graphique

- Chaque point est représenté par :
  - un **marqueur** ("●") au niveau exact du point
  - une **étiquette** (nom de l'obstacle) juste au-dessus du marqueur
- Il n'y a **pas** de ligne/flèche entre le point et l'étiquette.
- L'**infobulle** (au survol) est attachée **uniquement au marqueur**, pas à l'étiquette.

## Positionnement libre

Le mode **Positionnement libre** permet de placer un point en cliquant sur le graphique.

- Pour quitter le mode, désactivez l'interrupteur **Positionnement libre**.

Voir {doc}`Positionnement libre <plot/free-positioning>` pour le comportement
complet du mode (portée figée, contrôles figés, restauration de la vue).

### Interaction avec l'altitude

- En mode **Absolue (NGF)** : un clic définit directement `z` à l'altitude NGF cliquée.
- En mode **Relative (au support)** : un clic enregistre `z` comme un delta :

$$z = \text{altitudeCliquéeNGF} - \text{altitudeSupportNGF}$$

Le point reste affiché au bon niveau NGF (altitude du support + delta).

## Tableau d'obstacles

Le **Tableau d'obstacles** liste les points des obstacles du canton avec leurs distances au câble, et
permet d'en générer un rapport PDF.

### Ouvrir le tableau

1. Ouvrez une étude, puis un canton dans le **Studio**.
2. Dans la barre d'outils, ouvrez le menu **Tableau**, puis choisissez **Tableau d'obstacles**.

### Filtre et contexte

- **Portée** : affiche les obstacles d'une seule portée. La première portée du canton est
  sélectionnée par défaut ; choisissez **Toutes les portées** pour lister les obstacles de tout le
  canton.
- **Condition initiale** et **Cas de charge** : rappellent la condition initiale et le cas de charge
  sélectionnés dans le Studio. Les distances du tableau correspondent à cet état.

### Colonnes

Le tableau compte **une ligne par point d'obstacle** : un obstacle de trois points occupe trois lignes.

| Colonne | Contenu |
|---|---|
| **N°** | Numéro de la ligne. |
| **Nom d'obstacle** | Nom de l'obstacle. |
| **Type d'obstacle** | Type de l'obstacle, issu du catalogue. |
| **Portée** | Portée de l'obstacle, désignée par ses deux supports (par exemple `AB12C - AB13C`). |
| **Support de référence** | Support à partir duquel **Dist. supp. réf.** est mesurée. |
| **Type d'altitude** | **Absolue (NGF)**, **Relative au support** ou **Relative accr. câble**. |
| **Type de distance latérale** | Axe à partir duquel **Dist. axe ligne** est mesurée : **Axe de la portée** ou **Axe de ligne**. |
| **Point** | Numéro du point dans l'obstacle. |
| **Altitude** | Coordonnée `z` du point, en mètres, interprétée selon le **Type d'altitude**. |
| **Dist. supp. réf.** | Distance au support de référence (coordonnée `x`), en mètres. |
| **Dist. axe ligne** | Distance latérale à l'axe (coordonnée `y`), en mètres. |
| **Oblique** | Distance directe entre le point et le câble, en mètres. |
| **Verticale** | Distance verticale entre le point et le câble, en mètres. |
| **Horizontale** | Distance horizontale entre le point et le câble, en mètres. |

Les distances **Oblique**, **Verticale** et **Horizontale** affichent « - » lorsqu'elles n'ont pas
pu être calculées pour ce point.

Cliquez sur l'en-tête **Nom d'obstacle** pour trier le tableau par nom. Le nombre de lignes par page
(10, 25, 50 ou 100) se règle au-dessus du tableau.

### Rapport PDF

Le bouton **Rapport**, en bas de la fenêtre, télécharge le tableau au format PDF. Il est désactivé
tant que le tableau est vide, et affiche un indicateur de chargement pendant le calcul des distances
ou la génération du rapport.

Le rapport reprend le tableau **tel qu'il est affiché** : même filtre de portée et même ordre de tri.

- **Première page (portrait)** : le titre « Rapport Tableau des obstacles », la date, puis le
  cartouche **Étude et canton** (auteur, étude, description, canton, commentaire, condition
  initiale, cas de charge et sa description).
- **Pages suivantes (paysage)** : le **Tableau des points d'obstacle**. Les colonnes du tableau y
  deviennent des lignes et chaque point d'obstacle une colonne, avec 5 points au plus par tableau.
  La colonne **N°** n'est pas reprise. Un texte trop long pour sa cellule, comme un nom d'obstacle,
  est coupé après deux lignes et se termine par « … ».
- Chaque page est numérotée (« Page 2 / 3 »).

Le fichier est nommé `Rapport Tableau des obstacles_<canton>_<cas de charge>_<date> <heure>.pdf`,
par exemple `Rapport Tableau des obstacles_Canton A_Cas 1_22-10-2026 14-35.pdf`.
