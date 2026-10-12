import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@services/auth/auth.service';
import { LoggerService } from '@services/logger/logger.service';
import { NotificationService } from '@services/notification/notification.service';
import { environment } from '@src/environments/environment';
import { filter, firstValueFrom } from 'rxjs';
import { Workbox } from 'workbox-window';
import {
  APP_UPDATE_I18N,
  APP_UPDATE_LOG_PREFIX,
  SERVICE_WORKER_URL,
  UPDATE_CHECK_INTERVAL_MS,
  VERSION_FILE_TIMEOUT_MS,
  VERSION_FILE_URL
} from './app-update.constantes';
import {
  buildDateForRunningVersion,
  evaluateUpdateCheck,
  isSwInstallRefusedMessage,
  isSwLogMessage,
  stateAfterRefusal,
  stateFromRegistration
} from './app-update.helpers';
import {
  AppUpdateState,
  RunningVersion,
  UpdateCheckDecision,
  UpdateDiagnostics,
  VersionFile
} from './app-update.interfaces';
import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from './network-rule.constantes';
import { NetworkConnectionLike } from './network-rule.interfaces';
import { SwInstallRefusedMessage } from './sw-messages.interfaces';

/**
 * Registers the Workbox service worker and exposes the offline/update state.
 *
 * @remarks
 * Never activates a new version: a downloaded version waits until every window of the app is closed, and the user
 * is only told so (once per start). Update checks run only when the network and storage rules allow them.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authenticatedUser$ = toObservable(inject(AuthService).currentUser).pipe(
    filter((user) => user !== null)
  );

  readonly state = signal<AppUpdateState>('not-installed');
  /** Last installation refused by the service worker (network or storage), null when none since start. */
  readonly lastRefusal = signal<SwInstallRefusedMessage | null>(null);
  readonly runningVersion = signal<RunningVersion>({
    version: environment.version,
    gitHash: environment.gitHash,
    buildDateUtc: null
  });

  private workbox: Workbox | null = null;
  private started = false;
  private waitingNotified = false;
  private storageNotified = false;

  /** Starts the service worker lifecycle; safe to call once at startup without awaiting it. */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    if (!('serviceWorker' in navigator)) {
      this.state.set('unsupported');
      return;
    }
    const container = navigator.serviceWorker;
    const onMessage = (event: MessageEvent): void => this.handleServiceWorkerMessage(event.data);
    container.addEventListener('message', onMessage);
    this.destroyRef.onDestroy(() => container.removeEventListener('message', onMessage));
    container.startMessages();
    void this.loadBuildDate();

    try {
      const existing = await container.getRegistration();
      this.state.set(stateFromRegistration(existing));
      if (!existing) {
        // The very first download only starts for an authenticated user (files would be the login page otherwise).
        await firstValueFrom(this.authenticatedUser$);
      }
      await this.register();
      this.listenForCheckTriggers();
    } catch (error) {
      this.logger.error(`${APP_UPDATE_LOG_PREFIX} service worker registration failed`, error);
    }
  }

  /**
   * Asks the browser to look for a new version when the network and storage rules allow it.
   *
   * @returns the decision; the update itself is downloaded and verified in the background by the service worker.
   */
  async checkForUpdate(): Promise<UpdateCheckDecision> {
    const decision = evaluateUpdateCheck(this.connection(), await this.estimateStorage());
    if (!decision.allowed) {
      this.logger.info(`${APP_UPDATE_LOG_PREFIX} update check deferred (${decision.reason})`);
      return decision;
    }
    if (this.workbox) {
      await this.workbox.update().catch((error: unknown) => {
        this.logger.warn(`${APP_UPDATE_LOG_PREFIX} update check failed`, error);
      });
    }
    return decision;
  }

  /** Current network and storage measurements (admin page). */
  async readDiagnostics(): Promise<UpdateDiagnostics> {
    const downlink = this.connection()?.downlink;
    const estimate = await this.estimateStorage();
    return {
      downlinkMbps: typeof downlink === 'number' ? downlink : null,
      thresholdMbps: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS,
      usageBytes: estimate?.usage ?? null,
      quotaBytes: estimate?.quota ?? null
    };
  }

  private async register(): Promise<void> {
    const workbox = new Workbox(SERVICE_WORKER_URL);
    workbox.addEventListener('waiting', () => this.onUpdateWaiting());
    workbox.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        this.state.set('ready-offline');
      }
    });
    workbox.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        this.state.set('ready-offline');
      }
    });
    this.workbox = workbox;
    const registration = await workbox.register();
    if (this.state() !== 'update-waiting') {
      this.state.set(stateFromRegistration(registration));
    }
    registration?.addEventListener('updatefound', () => {
      if (this.state() === 'not-installed' || this.state() === 'deferred-network') {
        this.state.set('installing');
      }
    });
  }

  private listenForCheckTriggers(): void {
    const connection = this.connection() as (NetworkConnectionLike & EventTarget) | undefined;
    const check = (): void => void this.checkForUpdate();
    connection?.addEventListener?.('change', check);
    globalThis.addEventListener('online', check);
    const intervalId = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    this.destroyRef.onDestroy(() => {
      connection?.removeEventListener?.('change', check);
      globalThis.removeEventListener('online', check);
      clearInterval(intervalId);
    });
    check();
  }

  private onUpdateWaiting(): void {
    this.state.set('update-waiting');
    if (this.waitingNotified) {
      return;
    }
    this.waitingNotified = true;
    this.notificationService.info(
      this.translocoService.translate(APP_UPDATE_I18N.updateWaitingDetail),
      this.translocoService.translate(APP_UPDATE_I18N.updateWaitingSummary)
    );
  }

  private handleServiceWorkerMessage(data: unknown): void {
    if (isSwLogMessage(data)) {
      this.logger[data.level](`${APP_UPDATE_LOG_PREFIX}[sw] ${data.message}`);
      return;
    }
    if (!isSwInstallRefusedMessage(data)) {
      return;
    }
    this.lastRefusal.set(data);
    this.state.set(stateAfterRefusal(this.state(), data));
    if (data.reason === 'storage-insufficient' && !this.storageNotified) {
      this.storageNotified = true;
      this.notificationService.warning(
        this.translocoService.translate(APP_UPDATE_I18N.storageInsufficientDetail),
        this.translocoService.translate(APP_UPDATE_I18N.storageInsufficientSummary)
      );
    }
  }

  private async loadBuildDate(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERSION_FILE_TIMEOUT_MS);
    try {
      const response = await fetch(VERSION_FILE_URL, { cache: 'no-store', signal: controller.signal });
      const file = response.ok ? ((await response.json()) as VersionFile) : null;
      const buildDateUtc = buildDateForRunningVersion(file, this.runningVersion().gitHash);
      this.runningVersion.update((current) => ({ ...current, buildDateUtc }));
    } catch (error) {
      this.logger.info(`${APP_UPDATE_LOG_PREFIX} version.json unavailable`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private connection(): NetworkConnectionLike | undefined {
    return (navigator as Navigator & { connection?: NetworkConnectionLike }).connection;
  }

  private async estimateStorage(): Promise<{ usage?: number; quota?: number } | undefined> {
    return navigator.storage?.estimate ? navigator.storage.estimate().catch(() => undefined) : undefined;
  }
}
