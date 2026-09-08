# Geographic System

## Summary

This document describes how Stellar handles geographic/geometric coordinates across the
import, storage, and computation pipeline: Lambert93 for surveyed input data, GPS (WGS84)
as the internationalized pivot format, relative span/angle coordinates for internal storage,
and the forward geodesic reconstruction used inside a study. All coordinate transforms and
geodesic math are delegated to the [`pyproj`](https://pyproj4.github.io/pyproj/stable/)
package (`Geod`, `Proj`, `Transformer`) in `stellar_engine.data.geography`, run inside the
Pyodide web worker — the frontend never re-implements any of this math.

## Why four coordinate representations

| Stage | Representation | Reason |
|---|---|---|
| Import (GeoLiaison file) | Lambert93 (EPSG:2154) | Source survey files (`PIED_X_LAMBERT93`/`PIED_Y_LAMBERT93`) are produced in this French national grid. |
| Core / pivot | GPS decimal degrees (WGS84, EPSG:4326) | Internationalization: GPS is valid anywhere on the globe, unlike Lambert93 which is France-only. `Section.start_latitude`/`start_longitude` and `Support.footLatitude`/`footLongitude` are stored in this system. |
| Study storage | Relative span length + line angle (flat plane) | Each support only stores its span length/line angle relative to the previous one (`Support.spanLength`, `spanAngle`), with flat azimuth for the first support — compact, and independent of any absolute projection. |
| Study forward computation | GPS, reconstructed geodesically from the relative model | Rendering a section on a map recomputes absolute GPS positions on demand from the relative model. |


The coordinates systems are not used in the plot part.