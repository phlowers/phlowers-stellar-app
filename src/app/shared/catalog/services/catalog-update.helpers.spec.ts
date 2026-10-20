import { fetchCatalogHashes, fetchCatalogManifest } from './catalog-update.helpers';

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
