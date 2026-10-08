# Section Import Adapters

Section import is format-independent. Each file format is handled by a **section import adapter**; the core pipeline does everything else (collision, validation, coordinates reprojection, persistence, notifications).

This page builds on the [generic import pipeline](generic_import_pipeline.md).

---

## Architecture

```
src/app/shared/import/section-adapter/       ← public contract + core composition
  section-import-adapter.ts                  ← barrel: import from here
  section-import-adapter.interfaces.ts       ← SectionImportAdapter, SectionImportPayload, ...
  section-import-adapters.providers.ts       ← final adapter list (stellar_json + optional ones)

src/adapters/section-import/                 ← adapters, one folder each
  section-import-adapters.config.ts          ← optional adapters enabled in this build
  stellar-json/                              ← default adapter (mandatory, reference example)
  rte-custom/                                ← optional RTE canton format

src/app/features/study/application/services/
  section-import.service.ts                  ← orchestrator (ImportAdapter<Section>)
```

The orchestrator reads the file once, picks the first adapter (registry order) whose extensions include the file extension and whose `canHandle` returns `true`, then runs:

1. `adapter.import(source)` — parse, validate its own format, map to a `Section`.
2. Core validation of the mapped `Section` (required fields, supports bounds), unless the adapter sets `skipSectionValidation`.
3. Coordinates reprojection, when the adapter returned `coordinates`.
4. Collision check and persistence, then notifications (success, reprojection info, adapter notices).

---

## The contract

```typescript
interface SectionImportAdapter {
  readonly id: string;                       // unique snake_case id
  readonly formatLabel: string;              // shown in the upload hint
  readonly extensions: readonly string[];    // lowercase, with dot
  readonly mimeTypes?: readonly string[];
  canHandle(source: SectionImportSource): boolean;          // cheap, sync, never throws
  extractUuid(source: SectionImportSource): string | null;  // collision check, never throws
  import(source: SectionImportSource): Promise<SectionImportPayload>;
}

interface SectionImportPayload {
  section: Section;
  coordinates?: { crs: 'LAMBERT93' | 'WGS84'; x: (number | null)[]; y: (number | null)[] };
  notices?: { severity: 'info' | 'warning'; message: string }[];
  skipSectionValidation?: boolean;           // default false
}
```

- `source` carries `fileName`, the decoded `text` and the parsed `json` (`undefined` when the text is not valid JSON).
- `coordinates` holds one `x`/`y` entry per support, in support order.
  - `LAMBERT93`: easting/northing in meters. The core reprojects them to GPS, fills `footLatitude`/`footLongitude`, the section start location and the mean reprojection error.
  - `WGS84`: `x` is the longitude and `y` the latitude, in degrees; applied as-is.
  - Any `null` entry skips the reprojection without blocking the import.
- `notices.message` must already be localized.
- `skipSectionValidation: true` skips the core required-fields and supports-bounds checks; use it only when the adapter already validated its own format and the mapped values may legitimately fall outside the section form rules (e.g. `rte_custom`).

### Errors

`import()` must reject with an `ImportError`-shaped object: `{ code, message, stage }`. Build the code with `adapterErrorCode('MY_ADAPTER_REASON')` and localize the message yourself. The core passes such errors through unchanged; any other thrown value is wrapped into a generic `MAPPING_ERROR`.

---

## Enabling and disabling adapters

- `stellar_json` is the default adapter and is **always** registered by the core. It cannot be removed through the configuration.
- Optional adapters are listed in `src/adapters/section-import/section-import-adapters.config.ts`:

```typescript
export const OPTIONAL_SECTION_IMPORT_ADAPTER_PROVIDERS: Provider[] = [
  ...provideSectionImportAdapter(RteCustomAdapter)
];
```

Order matters: the first adapter that recognizes the content wins. An adapter that is not imported in this file is not bundled.

A lint rule forbids importing `@adapters/*` from `src/app/**` (except the composition file) and importing `@features/*` from `src/adapters/**`.

---

## Writing an adapter

1. Create `src/adapters/section-import/<name>/` with one `*.adapter.ts` class (`@Injectable()`, no `providedIn`) implementing `SectionImportAdapter`.
2. Keep interfaces, constants and pure helpers in co-located `*.interfaces.ts`, `*.constantes.ts` and `*.helpers.ts` files, with their specs and fixtures.
3. Ship adapter-only texts as a Transloco scope inside the folder (`i18n/en.json`, `i18n/fr.json`) and resolve them with `selectTranslate(key, params, scope)`, so they leave with the adapter when it is removed.
4. Register it in `section-import-adapters.config.ts`.

`stellar-json/` is the reference implementation.

---

## Default format: `.stsec`

The section export writes `<section name>.stsec`, a JSON envelope read back by the `stellar_json` adapter:

```json
{
  "format": "stellar-section",
  "version": 1,
  "section": { "uuid": "...", "name": "...", "supports": [] },
  "coordinates": { "crs": "WGS84", "x": [], "y": [] }
}
```

- `coordinates` is optional (same meaning as in the payload).
- A `version` higher than the supported one is rejected with a dedicated error.
- For backward compatibility, a raw serialized `Section` in a `.json` file is still accepted.
- Export is available from the sections table and from the studio top toolbar.
