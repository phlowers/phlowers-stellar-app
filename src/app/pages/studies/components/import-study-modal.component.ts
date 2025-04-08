/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { StudyModelLocal } from '../../../core/store/models/study.model';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { StudyService } from '../../../core/api/services/study.service';
import { SearchStudyModel, StudyModel } from '../../../core/api/models/study.model';
import { CommonModule } from '@angular/common';

const newStudy = (): StudyModelLocal => {
  return {
    title: '',
    description: '',
    uuid: '',
    author_email: '',
    created_at_offline: '',
    updated_at_offline: '',
    saved: false
  };
};

@Component({
  selector: 'app-import-study-modal',
  template: `
    <p-dialog dismissableMask="true" [style]="{ width: '80vw', height: '90vh' }" header="Import Study" [(visible)]="isOpen" (onHide)="closeModal()" [modal]="true">
      <!-- <div> -->
      <ng-template #content>
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div>
            <div class="flex flex-row gap-6">
              <span>
                <label for="studyName" class="block font-bold mb-3">UUID contains:</label>
                <input width="300px" id="studyName" type="text" pInputText [(ngModel)]="studyToSearch.uuid" required />
              </span>
              <span>
                <label for="studyName" class="block font-bold mb-3">Title contains:</label>
                <input width="300px" id="studyName" type="text" pInputText [(ngModel)]="studyToSearch.title" required />
              </span>
              <span>
                <label for="studyName" class="block font-bold mb-3">Author email contains:</label>
                <input id="studyName" type="text" pInputText [(ngModel)]="studyToSearch.author_email" required />
              </span>
            </div>
            <div class="flex flex-row gap-6 mt-3">
              <p-button label="Search" (click)="searchStudies()" />
              <p-button label="Reset fields" severity="secondary" (click)="resetFields()" />
            </div>
          </div>
          <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin-top: 10px; height: 100%;">
            <p-table [loading]="isLoading" [value]="studies" [(selection)]="selectedStudies" dataKey="uuid" [tableStyle]="{ 'min-width': '50rem', height: '100%' }">
              <ng-template #header>
                <tr>
                  <td style="width: 3rem">
                    <p-tableHeaderCheckbox />
                  </td>
                  <th>UUID</th>
                  <th>Title</th>
                  <th>Author email</th>
                  <th>Created at</th>
                  <th>Updated at</th>
                </tr>
              </ng-template>
              <ng-template #body let-study>
                <tr>
                  <td style="width: 3rem">
                    <p-tableCheckbox [value]="study" />
                  </td>
                  <td>{{ study.uuid }}</td>
                  <td>{{ study.title }}</td>
                  <td>{{ study.author_email }}</td>
                  <td>{{ study.created_at_offline | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ study.updated_at_offline | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </ng-template>
      <ng-template #footer>
        <p-button type="button" label="Cancel" (click)="closeModal()"></p-button>
        <!-- <p-button type="button" label="Import" (click)="closeModal()"></p-button> -->
      </ng-template>
      <!-- </div> -->
    </p-dialog>
  `,
  standalone: true,
  imports: [DialogModule, FormsModule, InputTextModule, ButtonModule, TableModule, CommonModule]
})
export class ImportStudyModalComponent {
  studyToSearch: SearchStudyModel = newStudy();
  @Input() isOpen!: boolean;
  @Output() isOpenChange = new EventEmitter<boolean>();
  isLoading = false;
  studies: StudyModel[] = [];
  selectedStudies!: StudyModel;
  constructor(private studyService: StudyService) {
    this.studyToSearch = newStudy();
  }

  resetFields() {
    this.studyToSearch = newStudy();
  }

  searchStudies() {
    this.isLoading = true;
    console.log('searchStudies');
    this.studyService.searchStudies(this.studyToSearch).subscribe((studies) => {
      this.studies = studies;
      this.isLoading = false;
    });
  }

  closeModal() {
    console.log('closeModal');
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }
}
