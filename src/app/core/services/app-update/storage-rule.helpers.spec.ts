import { USER_DATA_STORAGE_RESERVE_BYTES } from './storage-rule.constantes';
import { computeMissingBytes, evaluateStorageForInstall } from './storage-rule.helpers';
import { SizedManifestEntry } from './storage-rule.interfaces';

describe('evaluateStorageForInstall', () => {
  it('allows when the free space covers missing files plus the reserve', () => {
    const decision = evaluateStorageForInstall({
      missingBytes: 800,
      usageBytes: 100,
      quotaBytes: 1000,
      reserveBytes: 100
    });

    expect(decision).toEqual({ allowed: true, reason: 'allowed', requiredBytes: 900, freeBytes: 900 });
  });

  it('refuses one byte over the free space', () => {
    const decision = evaluateStorageForInstall({
      missingBytes: 801,
      usageBytes: 100,
      quotaBytes: 1000,
      reserveBytes: 100
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('storage-insufficient');
  });

  it('allows when the estimate is unavailable', () => {
    const decision = evaluateStorageForInstall({
      missingBytes: 10_000,
      usageBytes: undefined,
      quotaBytes: undefined,
      reserveBytes: 100
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('api-unavailable');
    expect(decision.freeBytes).toBeNull();
  });

  it('treats a usage above the quota as no free space', () => {
    const decision = evaluateStorageForInstall({
      missingBytes: 0,
      usageBytes: 1200,
      quotaBytes: 1000,
      reserveBytes: 1
    });

    expect(decision.freeBytes).toBe(0);
    expect(decision.allowed).toBe(false);
  });

  it('reserves 100 MB for user data by default', () => {
    expect(USER_DATA_STORAGE_RESERVE_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe('computeMissingBytes', () => {
  it('sums only the entries absent from the cache', async () => {
    const entries: SizedManifestEntry[] = Array.from({ length: 10 }, (_, index) => ({
      url: `/file-${index}.js`,
      revision: 'r',
      sizeBytes: (index + 1) * 10
    }));
    const cached = new Set(entries.slice(0, 8).map((entry) => entry.url));

    const missing = await computeMissingBytes(entries, async (entry) => cached.has(entry.url));

    expect(missing).toBe(90 + 100);
  });

  it('counts an entry without size as zero', async () => {
    expect(await computeMissingBytes([{ url: '/a', revision: null }], async () => false)).toBe(0);
  });
});
