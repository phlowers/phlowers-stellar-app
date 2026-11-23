/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { BOTTOM_RIGHT_TOAST_KEY, DEFAULT_LIFE, LIFE_ERROR, LIFE_WARNING } from './notification.constantes';

/**
 * Global notification service for displaying toast messages.
 *
 * Wraps PrimeNG's MessageService to provide a typed, consistent API
 * for success, error, info, warning and warning-list toasts. Requires the
 * `<p-toast>` elements of the root component template (default key for
 * success and error, `BOTTOM_RIGHT_TOAST_KEY` for info, warning and warning-list).
 * Success and error toasts are shown top-center; info, warning and warning-list
 * toasts are shown bottom-right and are never duplicated while an identical one
 * is still displayed. The root component must call {@link NotificationService.release}
 * when such a toast closes.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);
  private readonly activeBottomRightToasts = new Set<string>();

  /**
   * Displays a success toast (green).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Successful"
   * @param life - Display duration in ms, defaults to 5000
   */
  success(
    detail: string,
    summary: string = this.translocoService.translate('common.notification.successful'),
    life: number = DEFAULT_LIFE
  ): void {
    this.messageService.add({ severity: 'success', summary, detail, life });
  }

  /**
   * Displays an error toast (red).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Error"
   * @param life - Display duration in ms, defaults to 10000
   */
  error(
    detail: string,
    summary: string = this.translocoService.translate('common.error'),
    life: number = LIFE_ERROR
  ): void {
    this.messageService.add({ severity: 'error', summary, detail, life });
  }

  /**
   * Displays an info toast (blue).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Info"
   * @param life - Display duration in ms, defaults to 5000
   */
  info(
    detail: string,
    summary: string = this.translocoService.translate('common.notification.info'),
    life: number = DEFAULT_LIFE
  ): void {
    this.addDeduplicated({ key: BOTTOM_RIGHT_TOAST_KEY, severity: 'info', summary, detail, life });
  }

  /**
   * Displays a warning toast (orange).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Warning"
   * @param life - Display duration in ms, defaults to 7000
   */
  warning(
    detail: string,
    summary: string = this.translocoService.translate('common.notification.warning'),
    life: number = LIFE_WARNING
  ): void {
    this.addDeduplicated({ key: BOTTOM_RIGHT_TOAST_KEY, severity: 'warn', summary, detail, life });
  }

  warningList(
    warnings: string[],
    summary: string = this.translocoService.translate('common.notification.warning'),
    life: number = LIFE_WARNING
  ): void {
    this.addDeduplicated({ key: BOTTOM_RIGHT_TOAST_KEY, severity: 'warn', summary, data: { warnings }, life });
  }

  /** Allows an identical toast to be displayed again once the given one has closed. */
  release(message: ToastMessageOptions): void {
    this.activeBottomRightToasts.delete(this.signatureOf(message));
  }

  private addDeduplicated(message: ToastMessageOptions): void {
    const signature = this.signatureOf(message);
    if (this.activeBottomRightToasts.has(signature)) return;
    this.activeBottomRightToasts.add(signature);
    this.messageService.add(message);
  }

  private signatureOf(message: ToastMessageOptions): string {
    return JSON.stringify([message.key, message.severity, message.summary, message.detail, message.data]);
  }
}
