import { AppUpdateState, OfflineStatusKind, UpdateCheckDecision, VersionFile } from './app-update.interfaces';
import { APP_CACHE_NAME_PREFIXES } from './app-update.constantes';
import { evaluateBackgroundDownload } from './network-rule.helpers';
import { NetworkConnectionLike } from './network-rule.interfaces';
import { USER_DATA_STORAGE_RESERVE_BYTES } from './storage-rule.constantes';
import { evaluateStorageForInstall } from './storage-rule.helpers';
import { SW_INSTALL_REFUSED_MESSAGE_TYPE, SW_LOG_MESSAGE_TYPE } from './sw-messages.constantes';
import { SwInstallRefusedMessage, SwLogMessage } from './sw-messages.interfaces';

/**
 * Decides whether the page may ask the browser to check for an update.
 *
 * @remarks
 * The page does not know the update size: the storage rule only requires the user data reserve to be free;
 * the service worker re-checks with the exact delta before downloading anything.
 */
export function evaluateUpdateCheck(
  connection: NetworkConnectionLike | undefined,
  estimate: { usage?: number; quota?: number } | undefined
): UpdateCheckDecision {
  if (!evaluateBackgroundDownload(connection).allowed) {
    return { allowed: false, reason: 'deferred-network' };
  }
  const storage = evaluateStorageForInstall({
    missingBytes: 0,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
    reserveBytes: USER_DATA_STORAGE_RESERVE_BYTES
  });
  return storage.allowed ? { allowed: true, reason: null } : { allowed: false, reason: 'storage-insufficient' };
}

/** State of an existing registration, before any lifecycle event. */
export function stateFromRegistration(
  registration: Pick<ServiceWorkerRegistration, 'active' | 'waiting' | 'installing'> | undefined
): AppUpdateState {
  if (registration?.waiting) {
    return 'update-waiting';
  }
  if (registration?.active) {
    return 'ready-offline';
  }
  if (registration?.installing) {
    return 'installing';
  }
  return 'not-installed';
}

/** State after an installation refusal: a ready app stays ready (the refusal only concerns the update). */
export function stateAfterRefusal(current: AppUpdateState, message: SwInstallRefusedMessage): AppUpdateState {
  if (current === 'ready-offline' || current === 'update-waiting') {
    return current;
  }
  return message.reason === 'storage-insufficient' ? 'storage-insufficient' : 'deferred-network';
}

export function isSwLogMessage(data: unknown): data is SwLogMessage {
  const message = data as Partial<SwLogMessage> | null;
  return typeof message === 'object' && message !== null && message.type === SW_LOG_MESSAGE_TYPE;
}

export function isSwInstallRefusedMessage(data: unknown): data is SwInstallRefusedMessage {
  const message = data as Partial<SwInstallRefusedMessage> | null;
  return typeof message === 'object' && message !== null && message.type === SW_INSTALL_REFUSED_MESSAGE_TYPE;
}

/** The server `/version.json` may describe a newer deployment: its date only applies to the same build. */
export function buildDateForRunningVersion(file: VersionFile | null, runningGitHash: string): string | null {
  if (!file?.build_datetime_utc || file.git_hash !== runningGitHash) {
    return null;
  }
  return file.build_datetime_utc;
}

/** A waiting update does not change offline readiness: the active version still works offline. */
export function offlineStatusKind(state: AppUpdateState): OfflineStatusKind {
  switch (state) {
    case 'ready-offline':
    case 'update-waiting':
      return 'ready';
    case 'installing':
      return 'preparing';
    case 'deferred-network':
      return 'waiting-network';
    case 'storage-insufficient':
      return 'storage-insufficient';
    default:
      return 'not-prepared';
  }
}

/** Cache Storage entries owned by the application (precache, catalogs, previous update system). */
export function isAppCacheName(name: string): boolean {
  return APP_CACHE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}
