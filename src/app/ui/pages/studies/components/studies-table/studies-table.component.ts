/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, input, output, signal } from '@angular/core';
import { SortEvent } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ButtonComponent } from 'src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from 'src/app/ui/shared/components/atoms/icon/icon.component';
import { TableModule } from 'primeng/table';

import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { Study } from '@core/domain';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudiesService } from '@services/studies/studies.service';
import { DEFAULT_TABLE_ROWS_PER_PAGE, TABLE_ROWS_PER_PAGE_OPTIONS } from '@ui/shared/constants/tablePagination';

@Component({
  standalone: true,
  selector: 'app-studies-table',
  imports: [
    ButtonModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    TableModule,
    CheckboxModule,
    PopoverModule,
    DatePipe,
    CommonModule,
    RouterLink
  ],
  templateUrl: './studies-table.component.html',
  providers: []
})
/**
 * Reusable table component for displaying, sorting, and paginating a list of studies.
 * Provides actions for exporting, duplicating, and deleting individual studies.
 */
export class StudiesTableComponent {
  /** Default number of rows displayed per page. */
  defaultRowsPerPage = DEFAULT_TABLE_ROWS_PER_PAGE;
  /** Available options for rows-per-page selection. */
  rowsPerPageOptions = TABLE_ROWS_PER_PAGE_OPTIONS;
  /** Required input providing the list of studies to display. */
  studies = input.required<Study[]>();
  /** Signal holding the current sort field name. */
  sortField = signal<string>('');
  /** Signal holding the current sort order (1 for ascending, -1 for descending). */
  sortOrder = signal<number>(1);
  /** Output emitted when a study deletion is requested, carrying the study UUID. */
  deleteStudy = output<string>();
  /** Output emitted when a study duplication is requested, carrying the study UUID. */
  duplicateStudy = output<string>();
  /** Localized template string for the paginator's current page report. */
  currentPageReportTemplate = $localize`Study ${'{'}first} to ${'{'}last} of ${'{'}totalRecords}`;

  constructor(public readonly studiesService: StudiesService) {}

  /**
   * Opens the export dialog for the study with the given UUID.
   * @param uuid - The UUID of the study to export.
   */
  openExportDialog = (uuid: string) => {
    this.studiesService.exportDialogData.set({
      uuid,
      title: this.studies().find((study) => study.uuid === uuid)?.title ?? '',
      isOpen: true
    });
  };

  /**
   * Handles table sort events by updating the sort field and order signals.
   * @param event - The PrimeNG sort event.
   */
  onSort(event: SortEvent) {
    this.sortField.set(event.field as string);
    this.sortOrder.set(event.order as number);
  }
}
