import type { PrecacheEntry } from 'workbox-precaching';
import type { RouteHandler, RouteHandlerCallback, WorkboxPlugin } from 'workbox-core/types';
import { NavigationRoute } from 'workbox-routing';
import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from '@services/app-update/network-rule.constantes';
import { evaluateBackgroundDownload } from '@services/app-update/network-rule.helpers';
import { USER_DATA_STORAGE_RESERVE_BYTES } from '@services/app-update/storage-rule.constantes';
import { computeMissingBytes, evaluateStorageForInstall } from '@services/app-update/storage-rule.helpers';
import type { SizedManifestEntry } from '@services/app-update/storage-rule.interfaces';
import {
  AUTH_ERROR_STATUSES,
  LEGACY_CACHE_PREFIX,
  NAVIGATION_DENYLIST,
  RELOGIN_URL,
  SW_INSTALL_REFUSED_MESSAGE_TYPE,
  SW_LOG_MESSAGE_TYPE
} from './service-worker.constantes';
import type {
  ActivationDeps,
  GuardedInstallDeps,
  InstallRefusalReason,
  ShellNavigationDeps,
  SwClients,
  SwInstallRefusedMessage,
  SwLogger,
  SwLogLevel,
  SwOutgoingMessage
} from './service-worker.interfaces';

/** Raised to fail the `install` event on purpose: the previous version stays active and the browser retries later. */
export class InstallRefusedError extends Error {
  constructor(readonly reason: InstallRefusalReason) {
    super(`Service worker installation refused: ${reason}`);
    this.name = 'InstallRefusedError';
  }
}

/** Sends a message to every window client, controlled or not (a waiting worker controls none). */
export async function postToClients(clients: SwClients, message: SwOutgoingMessage): Promise<void> {
  const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
}

/** Logger relaying technical messages to the pages (no `console.*` in the service worker). */
export function createSwLogger(clients: SwClients): SwLogger {
  const send = (level: SwLogLevel, message: string): void => {
    void postToClients(clients, { type: SW_LOG_MESSAGE_TYPE, level, message }).catch(() => undefined);
  };
  return {
    info: (message) => send('info', message),
    warn: (message) => send('warn', message),
    error: (message) => send('error', message)
  };
}

/** Logs each file fetched by the precache (install download, or a runtime miss); never alters the request. */
export function createDownloadLogPlugin(logger: SwLogger): WorkboxPlugin {
  return {
    requestWillFetch: ({ request }) => {
      logger.info(`Downloading ${request.url}`);
      return Promise.resolve(request);
    },
    fetchDidFail: ({ request, error }) => {
      logger.error(`Download failed for ${request.url}: ${error.message}`);
      return Promise.resolve();
    }
  };
}

/** Drops the build-only `sizeBytes` field: Workbox only needs url, revision and integrity. */
export function toPrecacheEntry(entry: SizedManifestEntry): PrecacheEntry {
  const precacheEntry: PrecacheEntry = { url: entry.url, revision: entry.revision };
  if (entry.integrity) {
    precacheEntry.integrity = entry.integrity;
  }
  return precacheEntry;
}

/** Refuses redirected (e.g. OIDC login page) or non-OK responses: the installation then fails atomically. */
export function createSafeResponsePlugin(): WorkboxPlugin {
  return {
    cacheWillUpdate: ({ response }) => Promise.resolve(response.ok && !response.redirected ? response : null)
  };
}

/** Serves the cached shell for navigations, except the paths the browser must handle natively. */
export function createShellNavigationRoute(shellHandler: RouteHandler): NavigationRoute {
  return new NavigationRoute(shellHandler, { denylist: [...NAVIGATION_DENYLIST] });
}

/**
 * Navigation handler: the cached shell without any network wait. Without a cached shell (e.g. caches cleared), the
 * navigation goes to the network and a raw `401`/`403` from Apache is turned into a redirect to `/auth/relogin`
 * instead of showing its error body.
 */
export function createShellNavigationHandler(deps: ShellNavigationDeps): RouteHandlerCallback {
  return async ({ request }) => {
    const cachedShell = await deps.matchShell();
    if (cachedShell) {
      return cachedShell;
    }
    const response = await deps.fetch(request);
    if (AUTH_ERROR_STATUSES.includes(response.status)) {
      return Response.redirect(new URL(RELOGIN_URL, deps.origin).href, 302);
    }
    return response;
  };
}

/** Deletes the caches of the previous update system; returns the deleted names. */
export async function deleteLegacyCaches(cacheStorage: CacheStorage): Promise<string[]> {
  const legacyNames = (await cacheStorage.keys()).filter((name) => name.startsWith(LEGACY_CACHE_PREFIX));
  await Promise.all(legacyNames.map((name) => cacheStorage.delete(name)));
  return legacyNames;
}

export function isQuotaExceededError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'QuotaExceededError';
}

/** Deletes the cache entries whose URL was not present in `urlsBefore`. */
export async function removeEntriesAddedSince(cache: Cache, urlsBefore: ReadonlySet<string>): Promise<number> {
  const added = (await cache.keys()).filter((request) => !urlsBefore.has(request.url));
  await Promise.all(added.map((request) => cache.delete(request)));
  return added.length;
}

async function refuse(deps: GuardedInstallDeps, message: Omit<SwInstallRefusedMessage, 'type'>): Promise<never> {
  deps.logger.warn(`Installation refused (${message.reason})`);
  await postToClients(deps.clients, { type: SW_INSTALL_REFUSED_MESSAGE_TYPE, ...message }).catch(() => undefined);
  throw new InstallRefusedError(message.reason);
}

/**
 * Runs the precache installation only when the network and storage rules allow it, before any download.
 *
 * @remarks
 * On a quota error despite the check, the entries written by this attempt are removed to give the space back.
 */
export async function runGuardedInstall(deps: GuardedInstallDeps): Promise<void> {
  deps.logger.info('New version detected: installation started');
  const network = evaluateBackgroundDownload(deps.connection);
  deps.logger.info(
    `Network downlink is ${network.downlinkMbps ?? 'unknown'} Mbps (minimum ${BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS} Mbps): ` +
      (network.allowed ? 'download allowed' : `download blocked (${network.reason})`)
  );
  if (!network.allowed) {
    await refuse(deps, {
      reason: network.reason as InstallRefusalReason,
      downlinkMbps: network.downlinkMbps,
      requiredBytes: null,
      freeBytes: null
    });
  }

  const cache = await deps.caches.open(deps.controller.strategy.cacheName);
  const missingUrls: string[] = [];
  const missingBytes = await computeMissingBytes(deps.entries, async (entry) => {
    const cacheKey = deps.controller.getCacheKeyForURL(entry.url);
    const cached = cacheKey !== undefined && (await cache.match(cacheKey)) !== undefined;
    if (!cached) {
      missingUrls.push(entry.url);
    }
    return cached;
  });
  deps.logger.info(
    `Packages to download: ${missingUrls.length} files, ${missingBytes} bytes [${[...missingUrls].sort().join(', ')}]`
  );
  const estimate = await deps.storage?.estimate().catch(() => undefined);
  const storage = evaluateStorageForInstall({
    missingBytes,
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
    reserveBytes: USER_DATA_STORAGE_RESERVE_BYTES
  });
  deps.logger.info(
    `Storage check: ${storage.freeBytes ?? 'unknown'} bytes free, ${storage.requiredBytes} required: ` +
      (storage.allowed ? 'download allowed' : 'download blocked')
  );
  if (!storage.allowed) {
    await refuse(deps, {
      reason: 'storage-insufficient',
      downlinkMbps: network.downlinkMbps,
      requiredBytes: storage.requiredBytes,
      freeBytes: storage.freeBytes
    });
  }

  const urlsBefore = new Set((await cache.keys()).map((request) => request.url));
  deps.logger.info('Download started');
  try {
    await deps.controller.install(deps.event);
    deps.logger.info(`Installation complete (${missingBytes} bytes downloaded)`);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      const removed = await removeEntriesAddedSince(cache, urlsBefore);
      deps.logger.error(`Storage quota exceeded during installation, ${removed} entries removed`);
      await refuse(deps, {
        reason: 'storage-insufficient',
        downlinkMbps: network.downlinkMbps,
        requiredBytes: storage.requiredBytes,
        freeBytes: storage.freeBytes
      });
    }
    deps.logger.error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/** Activates the new version: drops outdated precache entries and legacy caches, then controls open pages. */
export async function runActivation(deps: ActivationDeps): Promise<void> {
  deps.logger.info('Activation started: update in progress');
  try {
    await deps.controller.activate(deps.event);
    const deleted = await deleteLegacyCaches(deps.caches);
    if (deleted.length > 0) {
      deps.logger.info(`Legacy caches deleted: ${deleted.join(', ')}`);
    }
    // Only effective on the first installation: an update activates once no page is left open.
    await deps.clients.claim();
  } catch (error) {
    deps.logger.error(`Activation failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
  deps.logger.info('Activation succeeded');
}
