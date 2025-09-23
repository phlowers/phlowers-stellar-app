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
import { Study } from '@src/app/core/data/database/interfaces/study';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

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
export class StudiesTableComponent {
  studies = input.required<Study[]>();
  sortField = signal<string>('');
  sortOrder = signal<number>(1);
  deleteStudy = output<string>();
  duplicateStudy = output<string>();
  exportStudy = output<string>();

  onSort(event: SortEvent) {
    this.sortField.set(event.field as string);
    this.sortOrder.set(event.order as number);
  }
}
