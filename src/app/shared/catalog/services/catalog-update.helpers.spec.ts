import { fetchCatalogHashes, fetchCatalogManifest, planStaleCatalog } from './catalog-update.helpers';

describe('fetchCatalogHashes', () => {
  it('returns the data_hashes map, fetched without cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data_hashes: { 'cables.csv': 'h' } })));

    expect(await fetchCatalogHashes('/catalog-manifest.json', 1000, fetcher)).toEqual({ 'cables.csv': 'h' });
    expect(fetcher).toHaveBeenCalledWith('/catalog-manifest.json', expect.objectContaining({ cache: 'no-store' }));
  });

  it('returns null on a non-OK answer, a malformed manifest or a network error', async () => {
    expect(
      await fetchCatalogHashes('/m', 1000, vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    ).toBeNull();
    expect(await fetchCatalogHashes('/m', 1000, vi.fn().mockResolvedValue(new Response('{}')))).toBeNull();
    expect(await fetchCatalogHashes('/m', 1000, vi.fn().mockResolvedValue(new Response('null')))).toBeNull();
    expect(await fetchCatalogHashes('/m', 1000, vi.fn().mockRejectedValue(new TypeError('offline')))).toBeNull();
  });

  it('aborts after the timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        )
    );

    const result = fetchCatalogHashes('/m', 1000, fetcher as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(1000);

    expect(await result).toBeNull();
    vi.useRealTimers();
  });
});

describe('fetchCatalogManifest', () => {
  it('returns the hashes and the valid sizes', async () => {
    const body = { data_hashes: { 'a.csv': 'h' }, data_sizes: { 'a.csv': 10, 'b.csv': -1 } };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));

    expect(await fetchCatalogManifest('/m', 1000, fetcher)).toEqual({
      hashes: { 'a.csv': 'h' },
      sizes: { 'a.csv': 10 }
    });
  });

  it('returns no sizes for a manifest built before they existed', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data_hashes: { 'a.csv': 'h' } })));

    expect((await fetchCatalogManifest('/m', 1000, fetcher))?.sizes).toEqual({});
  });
});

describe('planStaleCatalog', () => {
  const imported = { storedHash: 'old' };
  const neverImported = { storedHash: undefined };
  const free = { cached: false, mayReplaceLive: true, prefetchAvailable: true };

  it('imports a cached new version when no other window works', () => {
    expect(planStaleCatalog(imported, { ...free, cached: true })).toEqual({
      deferred: false,
      importNow: true,
      prefetch: false
    });
  });

  it('prefetches a new version that is not cached yet instead of importing it', () => {
    expect(planStaleCatalog(imported, free)).toEqual({ deferred: false, importNow: false, prefetch: true });
  });

  it('imports an uncached new version when no service worker could prefetch it', () => {
    expect(planStaleCatalog(imported, { ...free, prefetchAvailable: false })).toEqual({
      deferred: false,
      importNow: true,
      prefetch: false
    });
  });

  it('defers an imported catalog while another window works, prefetching it only when it is not cached', () => {
    const busy = { ...free, mayReplaceLive: false };

    expect(planStaleCatalog(imported, busy)).toEqual({ deferred: true, importNow: false, prefetch: true });
    expect(planStaleCatalog(imported, { ...busy, cached: true })).toEqual({
      deferred: true,
      importNow: false,
      prefetch: false
    });
    expect(planStaleCatalog(imported, { ...busy, prefetchAvailable: false })).toEqual({
      deferred: true,
      importNow: false,
      prefetch: false
    });
  });

  it('imports a never imported catalog right away, whatever the other windows, the cache or the network', () => {
    for (const cached of [true, false]) {
      for (const mayReplaceLive of [true, false]) {
        for (const prefetchAvailable of [true, false]) {
          expect(planStaleCatalog(neverImported, { cached, mayReplaceLive, prefetchAvailable })).toEqual({
            deferred: false,
            importNow: true,
            prefetch: false
          });
        }
      }
    }
  });
});
