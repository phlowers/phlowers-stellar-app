import { CatalogManifest } from './catalog-update.interfaces';

/**
 * Fetches the catalog manifest from the network only (never cached), bounded by a timeout.
 *
 * @returns the hashes and, when the manifest provides them, the file sizes; null when the manifest is
 * unreachable or malformed.
 */
export async function fetchCatalogManifest(
  url: string,
  timeoutMs: number,
  fetcher: typeof fetch = (input, init) => fetch(input, init)
): Promise<{ hashes: Record<string, string>; sizes: Record<string, number> } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const manifest = (await response.json()) as Partial<CatalogManifest> | null;
    const hashes = manifest?.data_hashes;
    if (!hashes || typeof hashes !== 'object') {
      return null;
    }
    const sizes = Object.fromEntries(
      Object.entries(manifest?.data_sizes ?? {}).filter(([, size]) => Number.isFinite(size) && size >= 0)
    );
    return { hashes, sizes };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches the catalog hashes from the network only (never cached), bounded by a timeout.
 *
 * @returns the `data_hashes` map, or null when the manifest is unreachable or malformed.
 */
export async function fetchCatalogHashes(
  url: string,
  timeoutMs: number,
  fetcher: typeof fetch = (input, init) => fetch(input, init)
): Promise<Record<string, string> | null> {
  return (await fetchCatalogManifest(url, timeoutMs, fetcher))?.hashes ?? null;
}
