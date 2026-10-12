import type { PrecacheController } from 'workbox-precaching';
import type { NetworkConnectionLike } from '@services/app-update/network-rule.interfaces';
import type { SizedManifestEntry } from '@services/app-update/storage-rule.interfaces';
import type { PrefetchCatalogsMessage } from '@services/app-update/sw-messages.interfaces';

export type {
  InstallRefusalReason,
  PrefetchCatalogsMessage,
  PrefetchCatalogsResult,
  SwInstallRefusedMessage,
  SwLogLevel,
  SwLogMessage,
  SwOutgoingMessage
} from '@services/app-update/sw-messages.interfaces';

export interface SwLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** Minimal `Clients` surface used by the service worker. */
export interface SwClients {
  matchAll(options?: ClientQueryOptions): Promise<readonly { postMessage(message: unknown): void }[]>;
  claim(): Promise<void>;
}

export interface StorageEstimator {
  estimate(): Promise<{ usage?: number; quota?: number }>;
}

/** `PrecacheController` subset used by the install/activate helpers. */
export type PrecacheControllerLike = Pick<
  PrecacheController,
  'install' | 'activate' | 'getCacheKeyForURL' | 'strategy'
>;

export interface GuardedInstallDeps {
  event: ExtendableEvent;
  controller: PrecacheControllerLike;
  entries: readonly SizedManifestEntry[];
  connection: NetworkConnectionLike | undefined;
  storage: StorageEstimator | undefined;
  caches: CacheStorage;
  clients: SwClients;
  logger: SwLogger;
}

export interface ActivationDeps {
  event: ExtendableEvent;
  controller: PrecacheControllerLike;
  caches: CacheStorage;
  clients: SwClients;
  logger: SwLogger;
}

/** Workbox strategy subset used to prefetch through the same cache and plugins as the catalog route. */
export interface CatalogStrategyLike {
  handle(options: { request: Request; event: ExtendableEvent }): Promise<Response>;
}

export interface PrefetchCatalogsDeps {
  message: PrefetchCatalogsMessage;
  event: ExtendableEvent;
  origin: string;
  strategy: CatalogStrategyLike;
  connection: NetworkConnectionLike | undefined;
  storage: StorageEstimator | undefined;
  logger: SwLogger;
}
