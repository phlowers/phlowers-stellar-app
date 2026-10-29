import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from './network-rule.constantes';
import {
  computeThroughputMbps,
  evaluateBackgroundDownload,
  measureIfNeeded,
  measureThroughputMbps
} from './network-rule.helpers';

describe('evaluateBackgroundDownload', () => {
  it.each([
    [{ downlink: 10 }, true, 'allowed'],
    [{ downlink: 5 }, true, 'allowed'],
    [{ downlink: 4.9 }, false, 'downlink-below-threshold'],
    [undefined, false, 'api-unavailable'],
    [null, false, 'api-unavailable'],
    [{ downlink: undefined }, false, 'downlink-unknown'],
    [{ downlink: Number.NaN }, false, 'downlink-unknown'],
    [{ downlink: 50, saveData: true }, false, 'save-data']
  ])('with threshold 5, %o gives allowed=%s (%s)', (connection, allowed, reason) => {
    const decision = evaluateBackgroundDownload(connection, 5);

    expect(decision.allowed).toBe(allowed);
    expect(decision.reason).toBe(reason);
  });

  it('reports the measured downlink', () => {
    expect(evaluateBackgroundDownload({ downlink: 3 }, 5).downlinkMbps).toBe(3);
    expect(evaluateBackgroundDownload({ downlink: 50, saveData: true }, 5).downlinkMbps).toBe(50);
    expect(evaluateBackgroundDownload({}, 5).downlinkMbps).toBeNull();
  });

  it('uses the shared threshold by default', () => {
    expect(evaluateBackgroundDownload({ downlink: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS }).allowed).toBe(true);
    expect(evaluateBackgroundDownload({ downlink: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS - 0.025 }).allowed).toBe(false);
  });

  it('keeps the threshold within the browser downlink cap', () => {
    expect(BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS).toBeGreaterThan(0);
    expect(BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS).toBeLessThanOrEqual(10);
  });
});

describe('evaluateBackgroundDownload with a measured throughput', () => {
  it('allows a download when the measurement reaches the threshold despite a low estimate', () => {
    const decision = evaluateBackgroundDownload({ downlink: 1 }, 5, 20);

    expect(decision).toEqual({ allowed: true, reason: 'allowed', downlinkMbps: 20 });
  });

  it('keeps the best of the estimate and the measurement', () => {
    expect(evaluateBackgroundDownload({ downlink: 8 }, 5, 2).downlinkMbps).toBe(8);
    expect(evaluateBackgroundDownload({ downlink: 2 }, 5, 3).downlinkMbps).toBe(3);
  });

  it('refuses when both values are below the threshold', () => {
    expect(evaluateBackgroundDownload({ downlink: 1 }, 5, 3).reason).toBe('downlink-below-threshold');
  });

  it('uses the measurement when the Network Information API is unavailable', () => {
    expect(evaluateBackgroundDownload(undefined, 5, 12)).toEqual({
      allowed: true,
      reason: 'allowed',
      downlinkMbps: 12
    });
  });

  it('still refuses with saveData, whatever the measurement', () => {
    expect(evaluateBackgroundDownload({ downlink: 1, saveData: true }, 5, 50).reason).toBe('save-data');
  });

  it('ignores a non-finite measurement', () => {
    expect(evaluateBackgroundDownload({ downlink: 1 }, 5, Number.NaN).reason).toBe('downlink-below-threshold');
    expect(evaluateBackgroundDownload({}, 5, Number.NaN).reason).toBe('downlink-unknown');
  });
});

describe('computeThroughputMbps', () => {
  it('converts bytes and milliseconds to Mbit/s', () => {
    expect(computeThroughputMbps(1_000_000, 1000)).toBe(8);
    expect(computeThroughputMbps(125_000, 100)).toBe(10);
  });

  it.each([
    [0, 100],
    [100, 0],
    [100, -1]
  ])('returns null for %d bytes in %d ms', (bytes, durationMs) => {
    expect(computeThroughputMbps(bytes, durationMs)).toBeNull();
  });
});

describe('measureThroughputMbps', () => {
  /** jsdom has no `ReadableStream`: a minimal body exposing the reader surface used by the probe. */
  const streamOf = (...chunks: number[]): Response => {
    const queue = chunks.map((size) => new Uint8Array(size));
    const reader = {
      read: vi.fn(async () =>
        queue.length > 0 ? { done: false, value: queue.shift()! } : { done: true, value: undefined }
      ),
      cancel: vi.fn(async () => undefined)
    };
    return { ok: true, body: { getReader: () => reader }, reader } as unknown as Response;
  };
  const clock = (...times: number[]): (() => number) => {
    let index = 0;
    return () => times[Math.min(index++, times.length - 1)];
  };

  it('times the stream from the first chunk so the latency is excluded', async () => {
    // start 0, first chunk at 500 (latency), end at 600: 100 kB after the first chunk in 100 ms = 8 Mbit/s.
    const fetchFn = vi.fn(async () => streamOf(10_000, 50_000, 50_000));

    const result = await measureThroughputMbps({ fetchFn, url: '/big.js', now: clock(0, 500, 600) });

    expect(result).toBe(8);
    expect(fetchFn).toHaveBeenCalledWith(
      '/big.js',
      expect.objectContaining({ cache: 'no-store', headers: { 'X-Throughput-Probe': '1' } })
    );
  });

  it('falls back to the whole request duration when everything arrives in one chunk', async () => {
    const fetchFn = vi.fn(async () => streamOf(125_000));

    const result = await measureThroughputMbps({ fetchFn, url: '/a', now: clock(0, 100, 100) });

    expect(result).toBe(10);
  });

  it('stops reading and cancels the stream once maxBytes is reached', async () => {
    const response = streamOf(1000, 1000, 1000, 1000);
    const { reader } = response as unknown as {
      reader: { read: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
    };

    await measureThroughputMbps({ fetchFn: async () => response, url: '/a', maxBytes: 2000, now: clock(0, 10, 20) });

    expect(reader.read).toHaveBeenCalledTimes(2);
    expect(reader.cancel).toHaveBeenCalled();
  });

  it.each([
    ['a non-OK response', async () => ({ ok: false, body: null }) as unknown as Response],
    ['a body-less response', async () => ({ ok: true, body: null }) as unknown as Response],
    ['a network error', async () => Promise.reject(new TypeError('offline'))]
  ])('returns null on %s', async (_label, fetchFn) => {
    expect(await measureThroughputMbps({ fetchFn, url: '/a' })).toBeNull();
  });

  it('keeps what was received when the stream fails midway', async () => {
    const chunks = [new Uint8Array(1000), new Uint8Array(125_000)];
    const reader = {
      read: vi.fn(async () => {
        const value = chunks.shift();
        if (value === undefined) {
          throw new Error('reset');
        }
        return { done: false, value };
      }),
      cancel: vi.fn(async () => undefined)
    };
    const response = { ok: true, body: { getReader: () => reader } } as unknown as Response;

    const result = await measureThroughputMbps({
      fetchFn: async () => response,
      url: '/a',
      now: clock(0, 10, 110, 110)
    });

    expect(result).toBe(10);
  });
});

describe('measureIfNeeded', () => {
  it('does not run the probe when the estimate already allows the download', async () => {
    const probe = vi.fn(async () => 20);

    expect(await measureIfNeeded({ downlink: 8 }, probe, 5)).toBeNull();
    expect(probe).not.toHaveBeenCalled();
  });

  it('does not run the probe when saveData is set', async () => {
    const probe = vi.fn(async () => 20);

    expect(await measureIfNeeded({ downlink: 1, saveData: true }, probe, 5)).toBeNull();
    expect(probe).not.toHaveBeenCalled();
  });

  it.each([[{ downlink: 1 }], [undefined], [{}]])('runs the probe when %o would refuse', async (connection) => {
    const probe = vi.fn(async () => 20);

    expect(await measureIfNeeded(connection, probe, 5)).toBe(20);
  });

  it('logs the start and the result of a measurement', async () => {
    const log = vi.fn();

    await measureIfNeeded({ downlink: 1 }, async () => 12.34, 5, log);

    expect(log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('measurement started (browser downlink estimate: 1 Mbps')
    );
    expect(log).toHaveBeenNthCalledWith(2, 'Throughput measured: 12.3 Mbps (minimum 5 Mbps)');
  });

  it('logs a failed measurement', async () => {
    const log = vi.fn();

    await measureIfNeeded(undefined, async () => null, 5, log);

    expect(log).toHaveBeenNthCalledWith(1, expect.stringContaining('estimate: unknown'));
    expect(log).toHaveBeenNthCalledWith(2, 'Throughput measurement failed: no usable result');
  });

  it('logs nothing when no measurement is needed', async () => {
    const log = vi.fn();

    await measureIfNeeded({ downlink: 8 }, async () => 20, 5, log);
    await measureIfNeeded({ downlink: 1, saveData: true }, async () => 20, 5, log);

    expect(log).not.toHaveBeenCalled();
  });

  it('returns null when the probe rejects', async () => {
    expect(await measureIfNeeded({ downlink: 1 }, () => Promise.reject(new Error('x')), 5)).toBeNull();
  });
});
