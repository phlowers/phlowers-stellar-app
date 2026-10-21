/** Subset of the Network Information API read by the background download rule. */
export interface NetworkConnectionLike {
  downlink?: number;
  saveData?: boolean;
}

export type BackgroundDownloadReason =
  'allowed' | 'api-unavailable' | 'downlink-unknown' | 'downlink-below-threshold' | 'save-data';

export interface BackgroundDownloadDecision {
  allowed: boolean;
  reason: BackgroundDownloadReason;
  /** Best known throughput in Mbit/s (measured by the probe or estimated by the browser), or null when unknown. */
  downlinkMbps: number | null;
}

export interface ThroughputProbeOptions {
  fetchFn: (url: string, init: RequestInit) => Promise<Response>;
  url: string;
  maxBytes?: number;
  timeoutMs?: number;
  /** Monotonic clock in milliseconds, injectable for tests. */
  now?: () => number;
}

/** Measures the throughput in Mbit/s, or null when it cannot be measured. */
export type ThroughputProbe = () => Promise<number | null>;
