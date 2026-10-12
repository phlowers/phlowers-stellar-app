import { OfflineStatusKind } from '@services/app-update/app-update.interfaces';
import { PossibleIconNames } from '@shared/model/icon.model';

/** Icon of each offline status shown in the top bar. */
export const OFFLINE_STATUS_ICONS: Readonly<Record<OfflineStatusKind, PossibleIconNames>> = {
  ready: 'cloud_done',
  preparing: 'cloud_sync',
  'waiting-network': 'network_check',
  'storage-insufficient': 'sd_card_alert',
  'not-prepared': 'cloud_off'
};

/** Statuses rendered in the warning (orange) tone; `ready` is green, `not-prepared` neutral. */
export const OFFLINE_STATUS_WARNING_KINDS: ReadonlySet<OfflineStatusKind> = new Set([
  'preparing',
  'waiting-network',
  'storage-insufficient'
]);
