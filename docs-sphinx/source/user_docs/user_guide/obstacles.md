# Obstacles

## Altitude: Absolute (NGF) vs Relative

Chaque point d’obstacle a une coordonnée `z` dont l’interprétation dépend du champ **Altitude type**.

- **Absolute (NGF)**
  - `z` est une altitude NGF absolue.
  - Sur les graphes (2D/3D), le point est placé à l’altitude NGF saisie.
  - Exemple : si `z = 50`, le point est à **50 NGF**, indépendamment du support.

- **Relative (to support)**
  - `z` est un delta par rapport à l’altitude NGF du support de référence.
  - L’altitude NGF affichée/placée sur les graphes est :

$$\text{altitudeNGF} = \text{altitudeSupportNGF} + z$$

  - Exemple : si le support est à **30 NGF** et `z = 20`, alors le point est à **50 NGF**.

## Affichage sur les graphes

- Chaque point est rendu avec :
  - un **marqueur** ("●") au niveau exact du point
  - un **label** (nom de l’obstacle) juste au-dessus du marqueur
- Il n’y a **pas** de ligne/flèche entre le point et le label.
- L’**infobulle** (hover) est attachée **uniquement au marqueur**, pas au label.

## Free positioning

Le mode **Free positioning** permet de positionner un point en cliquant sur le graphe.

- Sortie du mode :
  - en désactivant le toggle **Free positioning**, ou
  - en appuyant sur **Escape**

### Interaction avec l’altitude

- En **Absolute (NGF)** : un clic positionne directement `z` à l’altitude NGF cliquée.
- En **Relative (to support)** : un clic enregistre `z` comme un delta :

$$z = \text{altitudeCliqueeNGF} - \text{altitudeSupportNGF}$$

Le point reste affiché au bon niveau NGF (altitude du support + delta).
