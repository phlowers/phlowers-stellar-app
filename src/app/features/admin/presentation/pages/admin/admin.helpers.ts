import { APP_UPDATE_I18N } from '@services/app-update/app-update.constantes';
import { UpdateCheckDecision } from '@services/app-update/app-update.interfaces';
import { InstallRefusalReason } from '@services/app-update/sw-messages.interfaces';

/** i18n key of the feedback shown after the "check for updates" button. */
export function checkResultKey(decision: UpdateCheckDecision): string {
  if (decision.allowed) {
    return APP_UPDATE_I18N.checkStarted;
  }
  return decision.reason === 'storage-insufficient'
    ? APP_UPDATE_I18N.storageInsufficientDetail
    : APP_UPDATE_I18N.updateDeferredNetwork;
}

/** One decimal, in megabytes (1 MB = 1024 x 1024 bytes); null when unknown. */
export function toMegabytes(bytes: number | null): string | null {
  return bytes === null ? null : (bytes / 1024 / 1024).toFixed(1);
}

/** i18n key explaining why the last update download was postponed. */
export function refusalReasonKey(reason: InstallRefusalReason): string {
  return `admin.refusal.${reason}`;
}
