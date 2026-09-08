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
| Import (GeoLiaison file) | Lambert93 (EPSG:2154) | Survey input files (`PIED_X_LAMBERT93` / `PIED_Y_LAMBERT93`) are produced in this French national grid. |
| Core / pivot | GPS decimal degrees (WGS84, EPSG:4326) | GPS is international and valid anywhere; Lambert93 is France-specific. `Section.start_latitude` / `start_longitude` and `Support.footLatitude` / `footLongitude` are stored in this system. |
| Study storage | Relative span length + line angle (flat plane) | Each support stores only its span length and line angle relative to the previous support (`Support.spanLength`, `spanAngle`), along with a flat azimuth for the first support; this is compact and projection-independent. |
| Study forward computation | GPS reconstructed geodesically from the relative model | Rendering a section on a map recomputes absolute GPS positions on demand from the relative model. |

The coordinate systems are not used in the plotting part.
