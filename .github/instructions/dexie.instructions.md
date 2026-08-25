---
applyTo: "src/app/core/services/storage/**"
---

# Dexie — real pattern

`AppDatabase` is owned by `StorageService`. **Never instantiate it directly.**

```typescript
private readonly storageService = inject(StorageService);

readonly dbReady = toSignal(this.storageService.ready$, { initialValue: false });

await this.storageService.db.studies.toArray();

const db = this.storageService.db;
await db.transaction('rw', [db.studies, db.metadata], async () => { ... });
```

Schema migrations: `this.version(N).stores({...}).upgrade(...)` in `AppDatabase`. Version bumps are
**irreversible** for users' existing local data — never bump the version without explicit user
confirmation of the migration plan.
