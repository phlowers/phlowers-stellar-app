# Raw date format (RFC 9557)

Every raw date written by the application (persisted timestamps, exported files, JSON export of a field measure) uses **RFC 9557**, the extension of ISO 8601 / RFC 3339 that adds the time zone name:

```
2026-11-06T16:46:15.869+01:00[Europe/Paris]
YYYY-MM-DDTHH:mm:ss.SSS±HH:MM[Zone]
```

- `±HH:MM` is the offset from UTC **in force at that instant**, so daylight saving time is included (`+01:00` in winter, `+02:00` in summer for `Europe/Paris`).
- `[Zone]` is the IANA time zone name, read from `environment.timeZone`.

Only the **raw** format changes. The **displayed** dates (date pipe, `toLocaleDateString`, PDF reports, "time ago") keep their own formats.

## Time zone

The zone is a single value, `timeZone`, in `src/environments/environment.ts` and `environment.development.ts` (default `Europe/Paris`). To change it, edit that value and rebuild; no other code changes. A missing or invalid value falls back to `Europe/Paris` (`DEFAULT_TIME_ZONE`).

The zone applies to the **instant**: the exact moment is kept and written in the zone's local time and offset. A browser set to another zone writes the same instant in the configured zone's clock.

## Helpers

All in `src/app/shared/helpers/date-time.helpers.ts`:

| Helper | Role |
|---|---|
| `formatRfc9557(date, timeZone?)` | Writes a `Date` as an RFC 9557 string in the configured zone |
| `formatRfc9557OrNull(date)` | Same, `null` for a missing or invalid date |
| `nowRfc9557()` | Current instant, used for `created_at`, `updated_at`, `created_at_offline`, `updated_at_offline`, catalog timestamps |
| `parseRfc9557(value)` | Reads an RFC 9557 string, a legacy ISO 8601 string (`...Z`), a timestamp or a `Date`; `null` if unreadable |
| `compareRfc9557(a, b, order?)` | Compares two raw dates **by instant**; unreadable values last |

## Rules

- **In memory, dates stay `Date` objects** (field measure `date` and `time`, data sent to the Python worker). Only strings written to storage or to a file are RFC 9557.
- **Never read a raw date with `new Date(value)` or the `date` pipe directly**: neither accepts the `[Zone]` suffix. Use `parseRfc9557`, or the `rfc9557ToDate` pipe in templates (`{{ value | rfc9557ToDate | date: format }}`).
- **Never sort raw dates as text**: offsets differ (`+01:00` / `+02:00`) and old values end with `Z`. Use `compareRfc9557`.
- **Exports**: `serializeFieldMeasureDates` / `serializeSectionDates` (`field-measure.helpers.ts`) write the `Date` fields of field measures for the `.stsec`, `.stsd` and `.clst` files. `normalizeFieldMeasureDates` reads them back.
- **Old data**: nothing is migrated. A study or section saved before this format keeps its `...Z` timestamp until it is next updated; it is still read, sorted and displayed correctly.

## Reading a file from Python

`datetime.fromisoformat` does not accept the `[Zone]` suffix. Remove it first:

```python
from datetime import datetime
import re

value = "2026-11-06T16:46:15.869+01:00[Europe/Paris]"
moment = datetime.fromisoformat(re.sub(r"\[[^\]]*\]$", "", value))
```
