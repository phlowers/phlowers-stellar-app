import { SizedManifestEntry, StorageDecision, StorageForInstallInput } from './storage-rule.interfaces';

/**
 * Decides whether downloading `missingBytes` keeps at least `reserveBytes` free.
 *
 * @remarks
 * Shared by the service worker and the page: no Angular import allowed here.
 * An unavailable estimate allows the download (the quota error is handled afterwards).
 */
export function evaluateStorageForInstall(input: StorageForInstallInput): StorageDecision {
  const requiredBytes = Math.max(0, input.missingBytes) + Math.max(0, input.reserveBytes);
  if (typeof input.usageBytes !== 'number' || typeof input.quotaBytes !== 'number') {
    return { allowed: true, reason: 'api-unavailable', requiredBytes, freeBytes: null };
  }
  const freeBytes = Math.max(0, input.quotaBytes - input.usageBytes);
  if (freeBytes < requiredBytes) {
    return { allowed: false, reason: 'storage-insufficient', requiredBytes, freeBytes };
  }
  return { allowed: true, reason: 'allowed', requiredBytes, freeBytes };
}

/** Sums the sizes of the manifest entries for which `isCached` returns false. */
export async function computeMissingBytes(
  entries: readonly SizedManifestEntry[],
  isCached: (entry: SizedManifestEntry) => Promise<boolean>
): Promise<number> {
  const cachedFlags = await Promise.all(entries.map((entry) => isCached(entry)));
  return entries.reduce(
    (missingBytes, entry, index) => missingBytes + (cachedFlags[index] ? 0 : (entry.sizeBytes ?? 0)),
    0
  );
}
