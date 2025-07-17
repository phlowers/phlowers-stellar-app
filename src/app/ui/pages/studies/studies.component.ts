/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OnInit, Component } from '@angular/core';
import { NewStudyModalComponent } from './components/new-study-modal/new-study-modal.component';
import { ButtonModule } from 'primeng/button';
import { ButtonComponent } from 'src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from 'src/app/ui/shared/components/atoms/icon/icon.component';
import { TableModule } from 'primeng/table';

import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { CommonModule } from '@angular/common';
import { StudiesTableComponent } from './components/studies-table/studies-table.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  standalone: true,
  imports: [
    NewStudyModalComponent,
    ButtonModule,
    ButtonComponent,
    IconComponent,
    TabsModule,
    TableModule,
    CheckboxModule,
    PopoverModule,
    CommonModule,
    StudiesTableComponent,
    ConfirmDialogModule
  ],
  templateUrl: './studies.component.html',
  providers: [MessageService, ConfirmationService]
})
export class StudiesComponent implements OnInit {
  isNewStudyModalOpen = false;
  studies: Study[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly studiesService: StudiesService,
    private readonly confirmationService: ConfirmationService
  ) {
    this.studiesService.studies.subscribe((studies) => {
      this.studies = studies;
    });
  }

  ngOnInit(): void {
    this.isNewStudyModalOpen =
      this.route.snapshot.queryParams['create'] === 'true';
    this.studiesService.ready.subscribe((ready) => {
      if (ready) {
        this.studiesService.getStudies().then((studies) => {
          this.studies = studies;
        });
      }
    });
  }

  duplicateStudy(uuid: string) {
    this.studiesService.duplicateStudy(uuid);
  }

  deleteStudy(uuid: string) {
    console.log('deleteStudy', uuid, this.confirmationService);
    this.confirmationService.confirm({
      key: 'positionDialog',
      message: 'Are you sure you want to delete this study?',
      accept: () => {
        this.studiesService.deleteStudy(uuid);
      }
    });
  }
}
