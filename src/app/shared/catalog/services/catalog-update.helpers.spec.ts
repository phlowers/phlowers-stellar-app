import { fetchCatalogHashes } from './catalog-update.helpers';

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
