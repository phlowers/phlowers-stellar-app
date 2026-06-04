# Catalog CSV import pipeline

Generic streaming CSV → IndexedDB pipeline shared by all 6 catalog datasets
(`attachments`, `cables`, `chains`, `lines`, `maintenance`, `obstacles`).

## Architecture

```
┌──────────────────────┐   importCsv(key)   ┌────────────────────────────┐
│ Catalog Service      │ ─────────────────▶ │ CsvImportClientService     │
│ (e.g. CablesService) │                    │ (main thread, @Injectable) │
└──────────────────────┘ ◀───── done ────── └────────────┬───────────────┘
                                                          │ postMessage
                                                          ▼
                                          ┌────────────────────────────┐
                                          │ csv-import.worker (module) │
                                          │  ▸ opens its own Dexie     │
                                          │  ▸ resolveCsvImportConfig  │
                                          │  ▸ runs runCsvImport()     │
                                          └────────────┬───────────────┘
                                                       │ Papa.parse(download)
                                                       ▼
                                          ┌────────────────────────────┐
                                          │ <chunk>  →  processChunk() │
                                          │ <end>    →  finalize?()    │
                                          └────────────────────────────┘
```

- **`csv-import.engine.ts`** — Pure function `runCsvImport(url, config, deps,
  post)` driving PapaParse, pausing per chunk for back-pressure, posting
  `progress` and `done` messages. No globals, fully unit-testable.
- **`csv-import.worker.ts`** — Worker entrypoint. Opens its own Dexie instance
  (`csv-import.worker-db.ts`), looks up a config via
  `resolveCsvImportConfig(csvKey)`, runs the engine, closes the DB.
- **`csv-import.client.ts`** — `CsvImportClientService.importCsv(csvKey,
  options?)`. Spawns the worker, listens for messages, returns a Promise.
- **`configs/`** — One `*.config.ts` per CSV plus a `index.ts` registry. Each
  config is a *factory* (not a singleton) so configs with per-import state
  (e.g. `lines` accumulator) stay isolated.

## Adding a new CSV (3 steps)

1. **Create `configs/<name>.config.ts`** exporting `create<Name>Config():
   CsvImportConfig<DtoType>`. Implement `processChunk(rows, ctx)` and
   optionally `finalize(ctx)`.
2. **Register it** in `configs/index.ts`:
   - add the key to the `CsvKey` union in `csv-import.engine.interfaces.ts`,
   - add the entry in `CSV_IMPORT_REGISTRY`.
3. **Declare the Dexie table** for the worker DB in `csv-import.worker-db.ts`
   (use a new schema version if you need a migration).

The catalog service then becomes a thin wrapper:

```ts
async importFromFile(): Promise<void> {
  try { await this.csvImportClient.importCsv('<name>'); }
  catch (err) { this.logger.error('Error importing <name>', err); }
}
```

## Testing

- `csv-import.engine.spec.ts` — drives the engine with fixture rows and a
  fake Dexie table (no real worker, no real network).
- `csv-import.client.spec.ts` — fakes the global `Worker` and asserts the
  message protocol.
- `csv-import.worker.spec.ts` — drives `runWorkerImport` with a mocked Dexie
  module and verifies dispatch + cleanup.
- `configs/*.config.spec.ts` — pure tests of each `mapRow` + `processChunk`.
- Fixtures live in `e2e/fixtures/csv/` (anonymized — never use real RTE data).
