import {
  buildDateForRunningVersion,
  evaluateUpdateCheck,
  isAppCacheName,
  isSwInstallRefusedMessage,
  isSwLogMessage,
  offlineStatusKind,
  stateAfterRefusal,
  stateFromRegistration
} from './app-update.helpers';
import { SwInstallRefusedMessage } from './sw-messages.interfaces';

const GB = 1024 * 1024 * 1024;
const worker = {} as ServiceWorker;

function refusal(reason: SwInstallRefusedMessage['reason']): SwInstallRefusedMessage {
  return { type: 'SW_INSTALL_REFUSED', reason, downlinkMbps: null, requiredBytes: null, freeBytes: null };
}

describe('app-update helpers', () => {
  describe('evaluateUpdateCheck', () => {
    it('allows when the downlink reaches the threshold and the reserve is free', () => {
      expect(evaluateUpdateCheck({ downlink: 8 }, { usage: 0, quota: GB })).toEqual({ allowed: true, reason: null });
    });

    it('defers on a slow, unknown or save-data connection', () => {
      expect(evaluateUpdateCheck({ downlink: 1 }, undefined).reason).toBe('deferred-network');
      expect(evaluateUpdateCheck(undefined, undefined).reason).toBe('deferred-network');
      expect(evaluateUpdateCheck({ downlink: 10, saveData: true }, undefined).reason).toBe('deferred-network');
    });

    it('allows a low downlink estimate when the measured throughput reaches the threshold', () => {
      expect(evaluateUpdateCheck({ downlink: 1 }, { usage: 0, quota: GB }, 20)).toEqual({
        allowed: true,
        reason: null
      });
      expect(evaluateUpdateCheck({ downlink: 10, saveData: true }, undefined, 20).reason).toBe('deferred-network');
    });

    it('refuses when the user data reserve is not free', () => {
      expect(evaluateUpdateCheck({ downlink: 8 }, { usage: 0, quota: 1024 })).toEqual({
        allowed: false,
        reason: 'storage-insufficient'
      });
    });

    it('allows when the storage estimate is unavailable', () => {
      expect(evaluateUpdateCheck({ downlink: 8 }, undefined).allowed).toBe(true);
    });
  });

  describe('stateFromRegistration', () => {
    it.each([
      [undefined, 'not-installed'],
      [{ active: null, waiting: null, installing: null }, 'not-installed'],
      [{ active: null, waiting: null, installing: worker }, 'installing'],
      [{ active: worker, waiting: null, installing: null }, 'ready-offline'],
      [{ active: worker, waiting: worker, installing: null }, 'update-waiting']
    ])('%o -> %s', (registration, expected) => {
      expect(stateFromRegistration(registration as ServiceWorkerRegistration | undefined)).toBe(expected);
    });
  });

  describe('stateAfterRefusal', () => {
    it('keeps a ready or waiting app as is', () => {
      expect(stateAfterRefusal('ready-offline', refusal('storage-insufficient'))).toBe('ready-offline');
      expect(stateAfterRefusal('update-waiting', refusal('downlink-below-threshold'))).toBe('update-waiting');
    });

    it('reports why a first installation did not start', () => {
      expect(stateAfterRefusal('not-installed', refusal('storage-insufficient'))).toBe('storage-insufficient');
      expect(stateAfterRefusal('installing', refusal('api-unavailable'))).toBe('deferred-network');
    });
  });

  describe('message guards', () => {
    it('recognizes service worker messages by type', () => {
      expect(isSwLogMessage({ type: 'SW_LOG', level: 'info', message: 'x' })).toBe(true);
      expect(isSwLogMessage({ type: 'OTHER' })).toBe(false);
      expect(isSwLogMessage(null)).toBe(false);
      expect(isSwInstallRefusedMessage(refusal('save-data'))).toBe(true);
      expect(isSwInstallRefusedMessage('SW_INSTALL_REFUSED')).toBe(false);
    });
  });

  describe('buildDateForRunningVersion', () => {
    it('returns the build date only for the running build', () => {
      const file = { git_hash: 'abc1234', build_datetime_utc: '2026-10-12T08:00:00+00:00' };

      expect(buildDateForRunningVersion(file, 'abc1234')).toBe('2026-10-12T08:00:00+00:00');
      expect(buildDateForRunningVersion(file, 'def5678')).toBeNull();
      expect(buildDateForRunningVersion(null, 'abc1234')).toBeNull();
      expect(buildDateForRunningVersion({ git_hash: 'abc1234' }, 'abc1234')).toBeNull();
    });
  });

  describe('offlineStatusKind', () => {
    it.each([
      ['ready-offline', 'ready'],
      ['update-waiting', 'ready'],
      ['installing', 'preparing'],
      ['deferred-network', 'waiting-network'],
      ['storage-insufficient', 'storage-insufficient'],
      ['not-installed', 'not-prepared'],
      ['unsupported', 'not-prepared']
    ] as const)('%s -> %s', (state, kind) => {
      expect(offlineStatusKind(state)).toBe(kind);
    });
  });

  describe('isAppCacheName', () => {
    it('recognizes the Workbox, catalog and previous-system caches only', () => {
      expect(isAppCacheName('workbox-precache-v2-https://stellar.test/')).toBe(true);
      expect(isAppCacheName('stellar-catalogs-v1')).toBe(true);
      expect(isAppCacheName('app-assets-v-abc1234')).toBe(true);
      expect(isAppCacheName('third-party-cache')).toBe(false);
    });
  });
});
