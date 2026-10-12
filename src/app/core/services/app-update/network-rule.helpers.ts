import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from './network-rule.constantes';
import { BackgroundDownloadDecision, NetworkConnectionLike } from './network-rule.interfaces';

/**
 * Decides whether a background download may start, from the estimated downlink.
 *
 * @remarks
 * Shared by the service worker and the page: no Angular import allowed here.
 * Unknown downlink, missing API or an explicit `saveData` preference all refuse.
 */
export function evaluateBackgroundDownload(
  connection: NetworkConnectionLike | undefined | null,
  thresholdMbps: number = BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS
): BackgroundDownloadDecision {
  if (!connection) {
    return { allowed: false, reason: 'api-unavailable', downlinkMbps: null };
  }
  const downlink =
    typeof connection.downlink === 'number' && Number.isFinite(connection.downlink) ? connection.downlink : null;
  if (connection.saveData === true) {
    return { allowed: false, reason: 'save-data', downlinkMbps: downlink };
  }
  if (downlink === null) {
    return { allowed: false, reason: 'downlink-unknown', downlinkMbps: null };
  }
  if (downlink < thresholdMbps) {
    return { allowed: false, reason: 'downlink-below-threshold', downlinkMbps: downlink };
  }
  return { allowed: true, reason: 'allowed', downlinkMbps: downlink };
}
