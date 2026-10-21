import { InstallRefusalReason } from '@services/app-update/sw-messages.interfaces';

/** i18n key of each refusal reason; the network and storage reasons reuse the shared `common.*` texts. */
export const REFUSAL_REASON_I18N_KEYS: Record<InstallRefusalReason, string> = {
  'api-unavailable': 'common.network-speed-unknown-label',
  'downlink-unknown': 'common.network-speed-unknown-label',
  'downlink-below-threshold': 'common.network-too-slow-label',
  'save-data': 'admin.refusal.save-data',
  'storage-insufficient': 'common.storage-insufficient-label'
};
