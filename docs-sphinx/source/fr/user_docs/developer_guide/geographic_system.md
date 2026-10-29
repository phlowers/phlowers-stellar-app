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
| Import (fichier d'arpentage) | Lambert93 (EPSG:2154) | Les fichiers de terrain (`PIED_X_LAMBERT93` / `PIED_Y_LAMBERT93`) sont produits dans ce repère national français. |
| Coeur / pivot | Degrés décimaux GPS (WGS84, EPSG:4326) | Le GPS est mondialement valide, contrairement à Lambert93 limité au territoire français. `Support.footLatitude` / `footLongitude` (et `Support.spanAzimut`) sont la source de vérité stockée ; le point de départ de la section est le pied de `supports[0]` (`Section.start_azimuth` reste porté par la section). |
| Stockage d'étude | Longueur de travée relative + angle de ligne (plan plat) | Chaque support ne stocke que sa longueur de travée et son angle par rapport au support précédent (`Support.spanLength`, `spanAngle`), avec un azimut plat pour le premier support ; cela reste compact et indépendant de toute projection absolue. |
| Calcul d'une étude | GPS reconstruit géodésiquement depuis le modèle relatif | Le rendu d'une section sur une carte recalculera les positions GPS absolues à la demande à partir du modèle relatif. |

Les systèmes de coordonnées ne sont pas utilisés dans la partie tracé du graphique.


## GeopositioningService

`GeopositioningService` (`src/app/core/services/geopositioning`) est le point d'entrée unique pour lire, écrire, calculer, persister et reprojeter le géopositionnement d'une section. Les helpers purs sont dans `src/app/shared/domain/helpers/geopositioning.helpers.ts`.

| Méthode | Rôle |
|---|---|
| `getFootGps` / `getStartGps` / `setStartGps` | Lecture/écriture en mémoire du GPS des pieds ; le point de départ est `supports[0]`. |
| `computeFootGps` | Calcule tous les GPS de pied et `spanAzimut` avec `Task.computeLocalization` à partir du point de départ, de `start_azimuth` et de la géométrie des portées. Ne lève jamais d'erreur : la section est renvoyée inchangée si des entrées manquent ou si le worker échoue. |
| `syncFootGps` | Ne recalcule que si un GPS de départ existe et que la géométrie a changé (point de départ, `start_azimuth`, uuids/ordre des supports, `spanLength`, `spanAngle`) ou qu'un GPS de pied manque. |
| `save` | `syncFootGps` puis `SectionService.createOrUpdateSection`. Un échec du worker ne bloque jamais une sauvegarde. |
| `resolveLocalization` | GPS de pied/`spanAzimut` stockés si complets, sinon calcul à la volée non persisté. |
| `toCrs` / `sectionToCrs` | Reprojection à la volée de points WGS84 vers n'importe quel CRS EPSG avec `Task.convertCoordinates`. |
| `applyImportedCoordinates` | Applique les coordonnées WGS84 ou Lambert93 importées (voir les adaptateurs d'import de section). Lève une `GeopositioningError` si la reprojection Lambert93 échoue. |
| `computeStartFromNextSupport` | Utilisé quand un support est inséré avant le support 0 : renvoie `{ point, azimuth }`, le GPS du nouveau support 0 et le nouvel azimut de départ, pour que les supports existants gardent leur position. Ne lève jamais d'erreur : renvoie `null` en cas d'échec. |

### Contrôles de position à l'import

Les positions sont la source de vérité. Après un import avec coordonnées, le worker reconstruit la géométrie à partir des positions (WGS84 via `Task.validateGpsPositions`, Lambert93 via `Task.importLambertAndValidate`) et les valeurs calculées écrasent les valeurs du fichier : `spanAzimut`, `start_azimuth` et `position_error_meters` par support.

- `position_error_meters` est la distance (m) entre le GPS importé de chaque support et la position reconstruite depuis la géométrie de la section (longueurs et angles de travée). Elle vaut `null` si elle n'est pas calculée. Les valeurs non finies renvoyées par Python (`NaN`, `Infinity`) sont stockées à `null`.
- L'ancienne clé `mean_reprojection_diff_meters` est supprimée au chargement par `stripLocalization`.
- Les notices d'import reposent sur deux seuils :

| Contrôle | Seuil | Inférieur ou égal au seuil | Au-dessus du seuil |
|---|---|---|---|
| Écart d'azimut de travée (fichier vs calculé, en degrés) | `SPAN_AZIMUTH_ERROR_THRESHOLD_DEG` = 1° | notice d'information | notice d'avertissement |
| Écart de position d'un support (mètres, maximum et son support) | `POSITION_ERROR_THRESHOLD_METERS` = 1 m | notice d'information | notice d'avertissement |

Les notices sont affichées après l'import lorsque l'écart peut être calculé (le contrôle d'azimut nécessite un azimut dans le fichier, le contrôle de position nécessite une erreur finie), et le vecteur d'erreurs complet est journalisé. Un avertissement invite l'utilisateur à vérifier les valeurs importées.

Si la validation WGS84 échoue, les GPS de pied sont conservés, les azimuts du fichier restent inchangés et un avertissement est journalisé.

Le géopositionnement est optionnel : une section sans GPS de départ (ex. import d'étude ProtoV4) est valide et n'est jamais forcée à calculer.

`Task.convertCoordinates` (Python `convert_coordinates`) prend `{ sourceCrs, targetCrs, x, y }` (`x` = longitude/easting, `y` = latitude/northing, `NaN` reste `NaN`) et renvoie `{ x, y }` via `pyproj.Transformer`.

### Migration du stockage

La version 11 de Dexie déplace les anciens `Section.start_latitude` / `start_longitude` vers le GPS de pied du premier support (s'il est vide) puis supprime ces deux champs. Les anciens fichiers JSON de section/étude ne sont pas supportés pour le point de départ : il est ignoré à l'import et renseigné à la prochaine sauvegarde.
