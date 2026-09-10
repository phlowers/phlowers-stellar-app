# Système géographique

## Résumé

Ce document décrit comment Stellar gère les coordonnées géographiques et géométriques dans le
pipeline d'import, de stockage et de calcul : Lambert93 pour les données d'arpentage, GPS (WGS84)
comme format pivot international, coordonnées relatives de travée/angle pour le stockage interne,
et reconstruction géodésique à l'avant pour une étude. Toutes les transformations de coordonnées et
les calculs géodésiques sont délégués au package [`pyproj`](https://pyproj4.github.io/pyproj/stable/)
(`Geod`, `Proj`, `Transformer`) dans `stellar_engine.data.geography`, exécuté dans le worker Pyodide.
Le front-end ne réimplémente jamais ces calculs.

## Pourquoi quatre représentations de coordonnées

| Étape | Représentation | Raison |
|---|---|---|
| Import (fichier GeoLiaison) | Lambert93 (EPSG:2154) | Les fichiers de terrain (`PIED_X_LAMBERT93` / `PIED_Y_LAMBERT93`) sont produits dans ce repère national français. |
| Coeur / pivot | Degrés décimaux GPS (WGS84, EPSG:4326) | Le GPS est mondialement valide, contrairement à Lambert93 limité au territoire français. `Section.start_latitude` / `start_longitude` et `Support.footLatitude` / `footLongitude` sont stockés dans ce système. |
| Stockage d'étude | Longueur de travée relative + angle de ligne (plan plat) | Chaque support ne stocke que sa longueur de travée et son angle par rapport au support précédent (`Support.spanLength`, `spanAngle`), avec un azimut plat pour le premier support ; cela reste compact et indépendant de toute projection absolue. |
| Calcul d'une étude | GPS reconstruit géodésiquement depuis le modèle relatif | Le rendu d'une section sur une carte recalculera les positions GPS absolues à la demande à partir du modèle relatif. |

Les systèmes de coordonnées ne sont pas utilisés dans la partie tracé du graphique.