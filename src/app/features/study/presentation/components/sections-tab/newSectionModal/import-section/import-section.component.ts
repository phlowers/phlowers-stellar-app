/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output } from '@angular/core';
import { Study } from '@shared/domain';
import { ImportComponent } from '@shared/components/import/import.component';
import { IMPORT_ADAPTER_TOKEN, ImportOutcome } from '@shared/import/domain/import-contracts';
import { ImportContextConfig } from '@shared/import/domain/import-contracts.interfaces';
import { SectionImportService } from '@features/study/application/services/section-import.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SECTION_IMPORT_CONFIG } from './import-section.constantes';

/**
 * Host wrapper that provides the `SectionImportService` adapter and
 * forwards the active study context before rendering the generic
 * `<app-import>` component in Section mode.
 *
 * ### Placement
 * Rendered inside `NewSectionModalComponent` when
 * `source() === 'extraction'` and `mode() === 'create'`.
 */
@Component({
  selector: 'app-import-section',
  standalone: true,
  imports: [ImportComponent, ConfirmDialogModule],
  providers: [
    SectionImportService,
    { provide: IMPORT_ADAPTER_TOKEN, useExisting: SectionImportService },
    ConfirmationService
  ],
  template: `
    <p-confirmdialog key="positionDialog" />
    <app-import
      [config]="config()"
      [resetToken]="importResetToken()"
      (importCompleted)="onImportCompleted($event)"
      (successActionTriggered)="onSuccessActionTriggered($event)"
      data-testid="section-import"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportSectionComponent implements OnInit {
  /** The active study — must be provided by the host modal. */
  readonly study = input.required<Study | null>();

  /**
   * When this token changes value, the inner import component resets its outcomes.
   * Increment from the host modal to trigger a reset.
   */
  readonly importResetToken = input<number>(0);

  /** Emitted after each batch of files is processed. */
  readonly importCompleted = output<ImportOutcome[]>();

  /**
   * Emitted when the user clicks the Edit button on a successfully imported section.
   * Carries the UUID of the imported section.
   */
  readonly editRequested = output<string>();

  /** Full config including successAction, built as a computed signal. */
  readonly config = computed<ImportContextConfig>(() => ({
    ...SECTION_IMPORT_CONFIG,
    successAction: {
      label: $localize`Edit`,
      action: (outcome) => this.editRequested.emit(outcome.entityId!)
    }
  }));

  private readonly sectionImportService = inject(SectionImportService);

  ngOnInit(): void {
    this.syncStudyContext();
  }

  /**
   * Propagates the current study into the adapter so it can check collisions
   * and persist the imported section.
   */
  syncStudyContext(): void {
    const study = this.study();
    if (study) {
      this.sectionImportService.setStudyContext(study);
    }
  }

  onImportCompleted(outcomes: ImportOutcome[]): void {
    this.importCompleted.emit(outcomes);
  }

  onSuccessActionTriggered(outcome: ImportOutcome): void {
    this.editRequested.emit(outcome.entityId!);
  }
}
