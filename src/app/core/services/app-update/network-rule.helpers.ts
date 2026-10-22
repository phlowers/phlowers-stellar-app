import {
  BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS,
  THROUGHPUT_PROBE_HEADER,
  THROUGHPUT_PROBE_MAX_BYTES,
  THROUGHPUT_PROBE_TIMEOUT_MS
} from './network-rule.constantes';
import {
  BackgroundDownloadDecision,
  NetworkConnectionLike,
  ThroughputProbe,
  ThroughputProbeOptions
} from './network-rule.interfaces';

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Decides whether a background download may start, from the estimated downlink and an optional measured throughput.
 *
 * @remarks
 * Shared by the service worker and the page: no Angular import allowed here.
 * The browser estimate is passive and often too low: the best of the estimate and the measurement is used.
 * No usable value, missing API without measurement or an explicit `saveData` preference all refuse.
 */
export function evaluateBackgroundDownload(
  connection: NetworkConnectionLike | undefined | null,
  thresholdMbps: number = BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS,
  measuredMbps: number | null = null
): BackgroundDownloadDecision {
  const measured = finiteOrNull(measuredMbps);
  if (!connection && measured === null) {
    return { allowed: false, reason: 'api-unavailable', downlinkMbps: null };
  }
  const estimated = finiteOrNull(connection?.downlink);
  const best = estimated === null || measured === null ? (estimated ?? measured) : Math.max(estimated, measured);
  if (connection?.saveData === true) {
    return { allowed: false, reason: 'save-data', downlinkMbps: best };
  }
  if (best === null) {
    return { allowed: false, reason: 'downlink-unknown', downlinkMbps: null };
  }
  if (best < thresholdMbps) {
    return { allowed: false, reason: 'downlink-below-threshold', downlinkMbps: best };
  }
  return { allowed: true, reason: 'allowed', downlinkMbps: best };
}

/** Converts a transfer to Mbit/s; null when the duration is not positive. */
export function computeThroughputMbps(bytes: number, durationMs: number): number | null {
  return bytes > 0 && durationMs > 0 ? (bytes * 8) / 1000 / durationMs : null;
}

/**
 * Measures the download throughput by streaming a same-origin file (aborted after `maxBytes` or `timeoutMs`).
 *
 * @remarks
 * The clock starts at the first received chunk so the request latency does not skew the result; a response that
 * arrives in a single chunk falls back to the whole request duration (conservative). Never throws.
 */
export async function measureThroughputMbps(options: ThroughputProbeOptions): Promise<number | null> {
  const { fetchFn, url, maxBytes = THROUGHPUT_PROBE_MAX_BYTES, timeoutMs = THROUGHPUT_PROBE_TIMEOUT_MS } = options;
  const now = options.now ?? (() => performance.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const requestStart = now();
  try {
    const response = await fetchFn(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { [THROUGHPUT_PROBE_HEADER]: '1' },
      signal: controller.signal
    });
    const reader = response.ok ? response.body?.getReader() : undefined;
    if (!reader) {
      return null;
    }
    let firstChunkAt: number | null = null;
    let bytesAfterFirstChunk = 0;
    let totalBytes = 0;
    try {
      while (totalBytes < maxBytes) {
        const { done, value } = await reader.read(); //NOSONAR — sequential stream reads
        if (done) {
          break;
        }
        totalBytes += value.byteLength;
        if (firstChunkAt === null) {
          firstChunkAt = now();
        } else {
          bytesAfterFirstChunk += value.byteLength;
        }
      }
    } catch {
      // Timeout or network error mid-stream: use what was received so far.
    } finally {
      void reader.cancel().catch(() => undefined);
    }
    const end = now();
    const streamed = firstChunkAt === null ? null : computeThroughputMbps(bytesAfterFirstChunk, end - firstChunkAt);
    return streamed ?? computeThroughputMbps(totalBytes, end - requestStart);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs the probe only when the browser estimate alone would not allow the download (and `saveData` is not set),
 * so a fast, well-estimated connection never pays for a measurement. Each measurement is reported through `log`.
 */
export async function measureIfNeeded(
  connection: NetworkConnectionLike | undefined | null,
  probe: ThroughputProbe,
  thresholdMbps: number = BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS,
  log?: (message: string) => void
): Promise<number | null> {
  const estimated = evaluateBackgroundDownload(connection, thresholdMbps);
  if (estimated.allowed || estimated.reason === 'save-data') {
    return null;
  }
  const estimateText = typeof connection?.downlink === 'number' ? `${connection.downlink} Mbps` : 'unknown';
  log?.(`Throughput measurement started (browser downlink estimate: ${estimateText}, ${estimated.reason})`);
  const measured = await probe().catch(() => null);
  log?.(
    measured === null
      ? 'Throughput measurement failed: no usable result'
      : `Throughput measured: ${measured.toFixed(1)} Mbps (minimum ${thresholdMbps} Mbps)`
  );
  return measured;
}
