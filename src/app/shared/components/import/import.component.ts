/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { GenericImportEngineService } from '@shared/import/application/services/generic-import-engine.service';
import { ImportContextConfig, ImportOutcome, UUIDCollisionResolver } from '@shared/import/domain/import-contracts';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/**
 * Generic import UI component shared across all import contexts (Study, Section, …).
 *
 * Renders a file-picker upload zone, per-file success outcomes with an optional
 * navigation link, and per-file error outcomes.
 *
 * ### Setup
 * The host component **must** provide a context-specific `ImportAdapter` via
 * `IMPORT_ADAPTER_TOKEN`:
 * ```typescript
 * &#64;Component({
 *   providers: [
 *     { provide: IMPORT_ADAPTER_TOKEN, useExisting: StudyImportService }
 *   ]
 * })
 * ```
 * The `GenericImportEngineService` is provided internally (scoped to each instance).
 *
 * ### Inputs
 * - `config` — `ImportContextConfig` describing accepted files, labels, and texts.
 *
 * ### Outputs
 * - `importCompleted` — emitted after each batch of files is processed, carrying
 *   the full list of `ImportOutcome` results.
 */
@Component({
  selector: 'app-import',
  standalone: true,
  imports: [TranslocoPipe, IconComponent, ButtonComponent, RouterLink],
  providers: [GenericImportEngineService],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportComponent {
  /** Configuration driving the accepted file types, texts, and optional navigation. */
  readonly config = input.required<ImportContextConfig>();

  /**
   * When this token changes value, the component resets its accumulated outcomes.
   * Increment the value from the host to trigger a reset.
   */
  readonly resetToken = input<number>(0);

  /** Emitted after each file batch is processed with the full outcome list. */
  readonly importCompleted = output<ImportOutcome[]>();

  /**
   * Emitted when the user clicks the success action button (e.g. Edit).
   * Carries the full `ImportOutcome` of the clicked item.
   */
  readonly successActionTriggered = output<ImportOutcome>();

  /** True while the engine is processing files. */
  readonly isLoading = signal(false);

  /** Accumulated outcomes across all processed batches. */
  readonly outcomes = signal<ImportOutcome[]>([]);

  /** Successfully imported file outcomes. */
  readonly successOutcomes = computed(() => this.outcomes().filter((o) => o.status === 'success'));

  /** Failed file outcomes (excludes silently skipped collision-rejected files). */
  readonly errorOutcomes = computed(() => this.outcomes().filter((o) => o.status === 'error'));

  /** Computed `accept` attribute value built from the config's accepted file spec. */
  readonly acceptAttribute = computed(() => {
    const spec = this.config().acceptedFiles;
    return [...(spec.mimeTypes ?? []), ...spec.extensions].join(',');
  });

  private readonly engine = inject(GenericImportEngineService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    effect(() => {
      this.resetToken();
      this.outcomes.set([]);
    });
  }

  /** Clears the file input value so the same file can be selected again. */
  clearFileInput(event: Event): void {
    (event.target as HTMLInputElement).value = '';
  }

  /** Handles the success action button click: invokes the config callback and emits the output. */
  onSuccessAction(outcome: ImportOutcome): void {
    this.config().successAction!.action(outcome);
    this.successActionTriggered.emit(outcome);
  }

  /**
   * Triggered by the file `<input>` change event.
   * Delegates all file processing to the engine and accumulates outcomes.
   */
  async loadFiles(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (files.length === 0) return;

    this.isLoading.set(true);
    try {
      const results = await this.engine.processFiles(files, this.makeCollisionResolver());
      this.outcomes.update((prev) => [...prev, ...results]);
      this.importCompleted.emit(results);
      for (const outcome of results) {
        if (outcome.status === 'error') {
          const detail = `${outcome.fileName}: ${outcome.error?.message ?? ''}`;
          const summary = this.translocoService.translate('common.import.error.file-summary');
          this.notificationService.error(detail, summary);
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private makeCollisionResolver(): UUIDCollisionResolver {
    const entityLabel = this.config().entityLabel;
    return (uuid, label) => {
      const messageTemplate = this.translocoService.translate('common.import.collision.message');
      const message = `${entityLabel} ${label} ${messageTemplate}`;
      const acceptLabel = this.translocoService.translate('common.import.collision.yes');
      const rejectLabel = this.translocoService.translate('common.import.collision.no');

      return new Promise<boolean>((resolve) =>
        this.confirmationService.confirm({
          key: 'positionDialog',
          message,
          accept: () => resolve(true),
          reject: () => resolve(false),
          acceptLabel,
          rejectLabel
        })
      );
    };
  }
}
