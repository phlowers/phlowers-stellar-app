/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Default toast duration in milliseconds. */
const DEFAULT_LIFE = 10000;

/**
 * Global notification service for displaying toast messages.
 *
 * Wraps PrimeNG's MessageService to provide a typed, consistent API
 * for success, error, info, and warning toasts. Requires a single
 * `<p-toast>` element in the root component template.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messageService = inject(MessageService);

  /**
   * Displays a success toast (green).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Successful"
   * @param life - Display duration in ms, defaults to 10000
   */
  success(detail: string, summary: string = $localize`Successful`, life: number = DEFAULT_LIFE): void {
    this.messageService.add({ severity: 'success', summary, detail, life });
  }

  /**
   * Displays an error toast (red).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Error"
   * @param life - Display duration in ms, defaults to 10000
   */
  error(detail: string, summary: string = $localize`Error`, life: number = DEFAULT_LIFE): void {
    this.messageService.add({ severity: 'error', summary, detail, life });
  }

  /**
   * Displays an info toast (blue).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Info"
   * @param life - Display duration in ms, defaults to 10000
   */
  info(detail: string, summary: string = $localize`Info`, life: number = DEFAULT_LIFE): void {
    this.messageService.add({ severity: 'info', summary, detail, life });
  }

  /**
   * Displays a warning toast (orange).
   * @param detail - Main message body
   * @param summary - Toast title, defaults to "Warning"
   * @param life - Display duration in ms, defaults to 10000
   */
  warning(detail: string, summary: string = $localize`Warning`, life: number = DEFAULT_LIFE): void {
    this.messageService.add({ severity: 'warn', summary, detail, life });
  }

  warningList(warnings: string[], summary: string = $localize`Warning`, life: number = DEFAULT_LIFE): void {
    this.messageService.add({ key: 'warning-list', severity: 'warn', summary, data: { warnings }, life });
  }
}
