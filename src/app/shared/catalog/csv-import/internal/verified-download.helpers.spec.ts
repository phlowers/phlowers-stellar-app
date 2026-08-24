/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createSHA256 } from 'hash-wasm';
import { downloadAndHash } from './verified-download.helpers';

async function sha256Hex(text: string): Promise<string> {
  const hasher = await createSHA256();
  hasher.init();
  hasher.update(new TextEncoder().encode(text));
  return hasher.digest('hex');
}

describe('downloadAndHash', () => {
  it('downloads the content once and returns its SHA-256 hex digest alongside the raw bytes', async () => {
    const content = 'name,value\nfoo,1\n';
    const fetcher = vi.fn().mockResolvedValue(new Response(content, { status: 200 }));

    const result = await downloadAndHash('http://x/catalog.csv', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('http://x/catalog.csv');
    expect(await result.blob.text()).toBe(content);
    expect(result.hash).toBe(await sha256Hex(content));
  });

  it('rejects with a descriptive error when the HTTP response is not OK', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('boom', { status: 404 }));

    await expect(downloadAndHash('http://x/missing.csv', fetcher)).rejects.toThrow(
      'Failed to fetch http://x/missing.csv: HTTP 404'
    );
  });

  it('falls back to buffering the whole response when no streamable body is exposed', async () => {
    const content = 'a,b\n1,2\n';
    const fakeResponse = {
      ok: true,
      body: undefined,
      arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode(content).buffer)
    } as unknown as Response;
    const fetcher = vi.fn().mockResolvedValue(fakeResponse);

    const result = await downloadAndHash('http://x/catalog.csv', fetcher);

    expect(await result.blob.text()).toBe(content);
    expect(result.hash).toBe(await sha256Hex(content));
  });

  it('defaults to globalThis.fetch when no fetcher is injected', async () => {
    const content = 'x,y\n1,2\n';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(content, { status: 200 }));

    const result = await downloadAndHash('http://x/default.csv');

    expect(fetchSpy).toHaveBeenCalledWith('http://x/default.csv');
    expect(result.hash).toBe(await sha256Hex(content));

    fetchSpy.mockRestore();
  });
});
