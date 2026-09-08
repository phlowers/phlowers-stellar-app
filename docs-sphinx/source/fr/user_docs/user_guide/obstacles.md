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

### Interaction avec l'altitude

- En mode **Absolue (NGF)** : un clic définit directement `z` à l'altitude NGF cliquée.
- En mode **Relative (au support)** : un clic enregistre `z` comme un delta :

$$z = \text{altitudeCliquéeNGF} - \text{altitudeSupportNGF}$$

Le point reste affiché au bon niveau NGF (altitude du support + delta).
