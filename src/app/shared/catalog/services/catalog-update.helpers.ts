import { CatalogManifest } from './catalog-update.interfaces';

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const manifest = (await response.json()) as Partial<CatalogManifest> | null;
    const hashes = manifest?.data_hashes;
    return hashes && typeof hashes === 'object' ? hashes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
