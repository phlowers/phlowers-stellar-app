/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OnInit } from '@angular/core';
import { NewStudyModalComponent } from './components/new-study-modal/new-study-modal.component';
import { ButtonModule } from 'primeng/button';
import { ButtonComponent } from 'src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from 'src/app/ui/shared/components/atoms/icon/icon.component';

@Component({
  standalone: true,
  imports: [
    NewStudyModalComponent,
    ButtonModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './studies.component.html',
  providers: [MessageService, ConfirmationService]
})
export class StudiesComponent implements OnInit {
  isNewStudyModalOpen = false;

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.isNewStudyModalOpen =
      this.route.snapshot.queryParams['create'] === 'true';
  }
}
