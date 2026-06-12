# Obstacle DB Snapshot — 2026-06-12

Source of truth: `public/data/obstacle_configuration.json`  
DB version: V7 (Dexie / IndexedDB — `stellar-db`)

---

## `catObstacleTypes` + `catObstacleConfigurations` (10 rows)

| `obstacleType` | `obstacleName` | `redZone` | `conformity` |
|---|---|---|---|
| `ordinary_ground` | Terrain ordinaire | false | `overhang` |
| `agricultural_land` | Terrain agricole | false | `overhang` |
| `traffic_lane` | Voie de circulation | false | `overhang` |
| `high_clearance_equipment_area` | Aire engin gde hauteur | false | `null` |
| `high_clearance_vehicle_route` | Itinéraire véhicule gde hauteur | false | `null` |
| `silo_proximity` | Proximité de silo | false | `null` |
| `accessible_building` | Bâtiment accessible | false | `cable_track` |
| `non_accessible_structure` | Construction non accessible | false | `cable_track` |
| `maintained_structure` | Construction entretenue | false | `cable_track` |
| `vegetation` | Végétation | **true** | `vegetation` |

---

## `catObstacleRuleDefinitions` (3 rows)

| `ruleType` | `color` | lateral `temperature` | lateral `pressure` | lateral `redZone` | overhang `temperature` | overhang `pressure` | overhang `redZone` |
|---|---|---|---|---|---|---|---|
| `AT` | `#FF0000` | 15°C | WindZoneInput | false | null | 0 | false |
| `CCG-LA` | `#FFA500` | 65°C | WindZoneInput | **true** | null | 0 | false |
| `CDT` | `#0000FF` | 15°C | WindZoneInput | false | null | 0 | false |

---

## `catObstacleDistances` (17 rows)

### `ordinary_ground`
| rule | active | overhang (63/90/150/225/400 kV) | lateral |
|---|---|---|---|
| AT | ✅ | 6.2 / 6.2 / 6.4 / 6.6 / 7.0 | — |
| CCG-LA | ✅ | 6.5 / 6.5 / 7.0 / 7.0 / 7.5 | — |

### `agricultural_land`
| rule | active | overhang (63/90/150/225/400 kV) | lateral |
|---|---|---|---|
| AT | ✅ | 6.3 / 6.5 / 6.8 / 7.1 / 8.0 | — |
| CCG-LA | ✅ | 6.8 / 7.0 / 7.5 / 7.5 / 8.5 | — |

### `traffic_lane`
| rule | active | overhang (63/90/150/225/400 kV) | lateral |
|---|---|---|---|
| AT | ✅ | 8.0 / 8.0 / 8.0 / 8.0 / 9.0 | — |
| CCG-LA | ✅ | 8.5 / 8.5 / 8.5 / 8.5 / 9.5 | — |

### `high_clearance_equipment_area` — no distances
### `high_clearance_vehicle_route` — no distances
### `silo_proximity` — no distances

### `accessible_building`
| rule | active | overhang (63/90/150/225/400 kV) | lateral (63/90/150/225/400 kV) |
|---|---|---|---|
| AT | ✅ | 3.5 / 3.7 / 4.1 / 4.7 / 6.0 | 3.3 / 3.5 / 3.8 / 4.1 / 5.0 |
| CCG-LA | ✅ | 3.8 / 4.0 / 5.5 / 5.5 / 6.5 | 3.8 / 4.0 / 4.5 / 4.5 / 5.5 |
| CDT | ❌ inactive | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 |

### `non_accessible_structure`
| rule | active | overhang (63/90/150/225/400 kV) | lateral (63/90/150/225/400 kV) |
|---|---|---|---|
| AT | ✅ | 2.0 / 2.0 / 2.1 / 2.7 / 4.0 | 1.2 / 1.2 / 1.4 / 1.6 / 2.0 |
| CCG-LA | ✅ | 2.0 / 2.0 / 2.7 / 2.7 / 4.0 | 3.0 / 3.0 / 3.0 / 3.0 / 4.0 |
| CDT | ❌ inactive | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 |

### `maintained_structure`
| rule | active | overhang (63/90/150/225/400 kV) | lateral (63/90/150/225/400 kV) |
|---|---|---|---|
| AT | ✅ | 2.0 / 2.0 / 2.1 / 2.7 / 4.0 | 1.2 / 1.2 / 1.4 / 1.6 / 2.0 |
| CCG-LA | ✅ | 3.0 / 3.0 / 3.0 / 3.0 / 4.0 | 3.0 / 3.0 / 3.0 / 3.0 / 4.0 |
| CDT | ❌ inactive | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 | 5.0 / 5.0 / 5.0 / 5.0 / 5.0 |

### `vegetation`
| rule | active | overhang (63/90/150/225/400 kV) | lateral (63/90/150/225/400 kV) |
|---|---|---|---|
| AT | ✅ | 2.0 / 2.0 / 2.7 / 2.7 / 4.0 | 2.0 / 2.0 / 2.0 / 2.0 / 2.0 |
| CCG-LA | ✅ | 3.5 / 3.5 / 4.5 / 4.5 / 6.0 | 8.5 / 8.5 / 9.5 / 9.5 / 11.0 |

---

## `catObstacleWindZones` (3 rows)

| `label` | `normal` (Pa) | `redZone` (Pa) |
|---|---|---|
| ZVN | 240 | 360 |
| ZVF | 360 | 480 |
| HPV | 360 | 480 |

---

## `catObstacleConformityConfig` (1 singleton row)

| field | value |
|---|---|
| `repartitionTemperatureFields.defaultValue` | 75°C |
| `lateralTemperatureFields.ruleType` | CCG-LA |
| `lateralTemperatureFields.message` | Valeur de 65°C dans les CCG-LA-ON (2023) ou OOE (2024) |
| `windZone.default` | ZVN |
| `intermediatePointPositions` | [0.33, 0.66] |
