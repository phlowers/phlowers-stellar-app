/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { SectionService } from '../../../core/api/services/section.service';
import { SectionModel } from '../../../core/api/models/section.model';

const newSection = (): SectionModel => {
  return {
    title: '',
    description: '',
    uuid: '',
    author_email: '',
    created_at_offline: '',
    updated_at_offline: ''
  };
};

@Component({
  selector: 'app-search-section-modal',
  template: `
    <p-dialog dismissableMask="true" [style]="{ width: '80vw', height: '90vh' }" header="Search Section" [(visible)]="isOpen" (onHide)="closeModal()" [modal]="true">
      <!-- <div> -->
      <ng-template #content>
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div>
            <div class="flex flex-row gap-6">
              <div class="grid grid-cols-6 gap-4">
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Section CUR:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Section Short name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Section name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Cable short name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Cable name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Section type:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Link name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Branch name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Transit link name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
                <div>
                  <label i18n for="sectionName" class="block font-bold mb-3">Voltage name:</label>
                  <input width="300px" id="sectionName" type="text" pInputText [(ngModel)]="sectionToSearch.title" required />
                </div>
              </div>
            </div>
            <div class="flex flex-row gap-6 mt-3">
              <p-button i18n-label label="Search" (click)="searchStudies()" />
              <p-button i18n-label label="Reset fields" severity="secondary" (click)="resetFields()" />
            </div>
          </div>
          <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin-top: 10px; height: 100%;">
            <p-table [loading]="isLoading" [value]="sections" [tableStyle]="{ 'min-width': '50rem', height: '100%' }">
              <ng-template #header>
                <tr>
                  <td style="width: 3rem">
                    <p-tableCheckbox [value]="selectedSections" />
                  </td>
                  <th i18n>UUID</th>
                  <th i18n>Title</th>
                  <th i18n>Author email</th>
                  <th i18n>Created at</th>
                  <th i18n>Updated at</th>
                </tr>
              </ng-template>
              <ng-template #body let-section>
                <tr>
                  <td style="width: 3rem">
                    <p-tableCheckbox [value]="selectedSections" />
                  </td>
                  <td>{{ section.uuid }}</td>
                  <td>{{ section.title }}</td>
                  <td>{{ section.author_email }}</td>
                  <td>{{ section.created_at_offline | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ section.updated_at_offline | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </ng-template>
      <ng-template #footer>
        <p-button type="button" i18n-label label="Cancel" (click)="closeModal()"></p-button>
        <p-button type="button" i18n-label label="Import" (click)="closeModal()"></p-button>
      </ng-template>
      <!-- </div> -->
    </p-dialog>
  `,
  standalone: true,
  imports: [DialogModule, FormsModule, InputTextModule, ButtonModule, TableModule, CommonModule]
})
export class SearchSectionModalComponent {
  sectionToSearch: any = newSection();
  @Input() isOpen!: boolean;
  @Output() isOpenChange = new EventEmitter<boolean>();
  isLoading = false;
  sections: any[] = [];
  selectedSections: any[] = [];
  constructor(private readonly sectionService: SectionService) {
    this.sectionToSearch = newSection();
  }

  resetFields() {
    this.sectionToSearch = newSection();
  }

  searchStudies() {
    this.isLoading = true;
    this.sectionService.searchSections(this.sectionToSearch).subscribe((sections) => {
      this.sections = sections;
      this.isLoading = false;
    });
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }
}
