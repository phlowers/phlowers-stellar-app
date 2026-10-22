# Geographic System

## Summary

This document describes how Stellar handles geographic and geometric coordinates across the import,
storage, and computation pipeline: Lambert93 for surveyed input data, GPS (WGS84) as the
international pivot format, relative span and angle coordinates for internal storage, and the
forward geodesic reconstruction used inside a study. All coordinate transforms and geodesic math
are delegated to the [`pyproj`](https://pyproj4.github.io/pyproj/stable/) package (`Geod`, `Proj`,
`Transformer`) in `stellar_engine.data.geography`, executed inside the Pyodide worker. The frontend
never re-implements this math.

## Why four coordinate representations

| Stage | Representation | Reason |
|---|---|---|
| Import (survey file) | Lambert93 (EPSG:2154) | Survey input files (`PIED_X_LAMBERT93` / `PIED_Y_LAMBERT93`) are produced in this French national grid. |
| Core / pivot | GPS decimal degrees (WGS84, EPSG:4326) | GPS is international and valid anywhere; Lambert93 is France-specific. `Support.footLatitude` / `footLongitude` (and `Support.spanAzimut`) are the stored source of truth; the section start point is the foot of `supports[0]` (`Section.start_azimuth` is kept on the section). |
| Study storage | Relative span length + line angle (flat plane) | Each support stores only its span length and line angle relative to the previous support (`Support.spanLength`, `spanAngle`), along with a flat azimuth for the first support; this is compact and projection-independent. |
| Study forward computation | GPS reconstructed geodesically from the relative model | Rendering a section on a map recomputes absolute GPS positions on demand from the relative model. |

The coordinate systems are not used in the plotting part.


## GeopositioningService

`GeopositioningService` (`src/app/core/services/geopositioning`) is the single entry point to get, set, compute, persist and reproject the geopositioning of a section. Pure helpers live in `src/app/shared/domain/helpers/geopositioning.helpers.ts`.

| Method | Role |
|---|---|
| `getFootGps` / `getStartGps` / `setStartGps` | Read/write the foot GPS in memory; the start point is `supports[0]`. |
| `computeFootGps` | Computes every foot GPS and `spanAzimut` with `Task.computeLocalization` from the start point, `start_azimuth` and the span geometry. Never throws: the section is returned unchanged if inputs are missing or the worker fails. |
| `syncFootGps` | Recomputes only when a start GPS exists and the geometry changed (start point, `start_azimuth`, support uuids/order, `spanLength`, `spanAngle`) or a foot GPS is missing. |
| `save` | `syncFootGps` then `SectionService.createOrUpdateSection`. A worker failure never blocks a save. |
| `resolveLocalization` | Stored foot GPS/`spanAzimut` when complete, otherwise an on-the-fly computation that is not persisted. |
| `toCrs` / `sectionToCrs` | On-the-fly reprojection of WGS84 points to any EPSG CRS with `Task.convertCoordinates`. |
| `applyImportedCoordinates` | Applies imported WGS84 or Lambert93 coordinates (see the section import adapters). Throws a `GeopositioningError` when the Lambert93 reprojection fails. |

Geopositioning is optional: a section without start GPS (e.g. a ProtoV4 study import) is valid and is never forced to compute.

`Task.convertCoordinates` (Python `convert_coordinates`) takes `{ sourceCrs, targetCrs, x, y }` (`x` = longitude/easting, `y` = latitude/northing, `NaN` stays `NaN`) and returns `{ x, y }` using `pyproj.Transformer`.

### Storage migration

Dexie version 11 moves the former `Section.start_latitude` / `start_longitude` onto the first support foot GPS (when empty) and removes both fields. Legacy section/study JSON files are not supported for the start point: it is ignored on import and filled on the next save.
