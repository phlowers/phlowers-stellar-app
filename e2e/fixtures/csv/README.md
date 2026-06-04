# Anonymized CSV fixtures

These files are **synthetic, anonymized samples** used by unit tests and Playwright e2e specs.
They mirror the production CSV schemas but contain no real RTE data, so they are safe to publish on the public repository.

## Catalogs covered

| Fixture | Purpose | Edge cases |
|---|---|---|
| `attachments.fixture.csv` | Grouped-mode streaming pipeline | Missing altitude, missing length, row with empty `support_idr` AND empty `support_adr` (must be filtered) |
| `cables.fixture.csv` | Replace-mode, many numeric columns | Empty `name` (must be filtered), `is_bimetallic` empty string, `is_polynomial` `True`/`true` casing |
| `chains.fixture.csv` | Replace-mode, comma decimals | `v_chain` true/false, French decimal separator (`3,250`), row without `chain_name` (must be filtered) |
| `lines.fixture.csv` | Replace-mode + dedup + sort | Duplicate keys (S002/S003, S007/S008), row with `voltage_adr = 0.0` → `NO_VOLTAGE`, row with empty `voltage_idr`, row with empty `link_idr` (must be filtered) |
| `maintenance.fixture.csv` | Replace-mode, fallback id field | `maintenance_center_id` empty → fallback `maintenance_id`, row with empty `maintenance_team_id` (must be filtered) |
| `obstacles.fixture.csv` | Replace-mode, **semicolon delimiter** | Empty `obstacle_type` (must be filtered) |

## Conventions

- All identifiers and labels start with `FAKE_`, `Fake`, `Cable IDR`, etc., to make their synthetic nature obvious.
- Numeric values are realistic order of magnitude but arbitrary.
- One "skipped" row per file demonstrates the engine's row filtering.

## Usage

```ts
import { readFileSync } from 'fs';
import { resolve } from 'path';

const csv = readFileSync(resolve(__dirname, '../../../../../e2e/fixtures/csv/cables.fixture.csv'), 'utf-8');
```
