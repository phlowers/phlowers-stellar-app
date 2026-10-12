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
  /** Measured downlink in Mbit/s, or null when unknown. */
  downlinkMbps: number | null;
}
