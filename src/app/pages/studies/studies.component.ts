/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { isEqual } from 'lodash';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';

import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { RouterModule } from '@angular/router';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { v4 as uuid } from 'uuid';
import { StorageService } from '../../core/store/storage.service';
import { StudyService } from '../../core/api/services/study.service';
import { Study } from '../../core/store/database/interfaces/study';
import { ImportStudyModalComponent } from './components/import-study-modal.component';
import { Subscription } from 'rxjs';
import { CheckboxModule } from 'primeng/checkbox';

import {
  OnlineService,
  ServerStatus
} from '../../core/api/services/online.service';
import { NewStudyDialogComponent } from '../../core/components/new-study-dialog/new-study-dialog.component';
interface Column {
  title: string;
  dataKey: string;
}

const newStudy = (): Study => {
  return {
    title: '',
    description: '',
    shareable: false,
    uuid: '',
    author_email: '',
    created_at_offline: '',
    updated_at_offline: '',
    saved: false,
    section_uuid: ''
  };
};

const columns = [
  { dataKey: 'uuid', title: $localize`Uuid` },
  { dataKey: 'title', title: $localize`Name` },
  { dataKey: 'description', title: $localize`Description` },
  { dataKey: 'author_email', title: $localize`Author` },
  { dataKey: 'saved', title: $localize`Saved remotely` }
];

@Component({
  standalone: true,
  imports: [
    RouterModule,
    AvatarModule,
    CommonModule,
    TableModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    CheckboxModule,
    ToolbarModule,
    RatingModule,
    InputTextModule,
    TooltipModule,
    TextareaModule,
    SelectModule,
    RadioButtonModule,
    InputNumberModule,
    DialogModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    ImportStudyModalComponent,
    NewStudyDialogComponent
  ],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-toolbar styleClass="mb-6">
      <ng-template #start>
        <p-button
          i18n-label
          label="New study"
          icon="pi pi-plus"
          severity="secondary"
          class="mr-2"
          (onClick)="openNew()"
        />
        <p-button
          i18n-label
          disabled="{{ !serverOnline }}"
          i18n-label
          label="Import from database"
          icon="pi pi-plus"
          severity="secondary"
          class="mr-2"
          (onClick)="openImportStudyModal()"
        />
        <p-button
          i18n-label
          severity="secondary"
          label="Delete"
          icon="pi pi-trash"
          outlined
          (onClick)="deleteSelectedStudies()"
          [disabled]="!selectedStudies || !selectedStudies.length"
        />
      </ng-template>
    </p-toolbar>

    <p-table
      #dt
      [value]="studies()"
      [rows]="10"
      [columns]="columns"
      [paginator]="true"
      [globalFilterFields]="['title']"
      [tableStyle]="{ 'min-width': '75rem' }"
      [(selection)]="selectedStudies"
      [rowHover]="true"
      dataKey="uuid"
      metaKeySelection="true"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} studies"
      i18n-currentPageReportTemplate
      [showCurrentPageReport]="true"
      [rowsPerPageOptions]="[10, 20, 30]"
    >
      <ng-template #caption>
        <div class="flex items-center justify-between">
          <h5 i18n class="m-0">Studies</h5>
          <p-iconfield>
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              i18n-placeholder
              placeholder="Search..."
              type="text"
              (input)="onGlobalFilter(dt, $event)"
            />
          </p-iconfield>
        </div>
      </ng-template>
      <ng-template #header>
        <tr>
          <th style="width: 3rem">
            <p-tableHeaderCheckbox />
          </th>
          <th i18n style="width: 6rem; max-width: 6rem;">Uuid</th>
          <th i18n pSortableColumn="title" style="min-width:16rem">
            Name
            <p-sortIcon field="title" />
          </th>
          <th i18n pSortableColumn="description" style="min-width:16rem">
            Description
            <p-sortIcon field="description" />
          </th>
          <th
            i18n
            pSortableColumn="author_email"
            style="display: flex; justify-content: center; min-width:16rem"
          >
            Author
            <p-sortIcon field="author_email" />
          </th>
          <th style="min-width: 12rem"></th>
          <th style="min-width: 2rem"></th>
          <th style="min-width: 6rem"></th>
        </tr>
      </ng-template>
      <ng-template #body let-study>
        <!-- trick to get type safety -->
        @if (identity(study); as typedStudy) {
          <tr>
            <td style="width: 3rem">
              <p-tableCheckbox [value]="typedStudy" />
            </td>
            <td
              style="width: 6rem; max-width: 6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >
              {{ typedStudy.uuid }}
            </td>
            <td style="min-width: 16rem">{{ typedStudy.title }}</td>
            <td style="min-width: 16rem">{{ typedStudy.description }}</td>
            <td style="min-width: 16rem">{{ typedStudy.author_email }}</td>
            <td style="min-width: 12rem" style="position: relative;">
              @if (typedStudy.saved) {
                <p-button
                  icon="pi pi-check"
                  [style]="{
                    'background-color': 'transparent',
                    color: 'green'
                  }"
                  [style]="{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }"
                  disabled="true"
                  severity="secondary"
                  class="mr-2"
                  [rounded]="true"
                  [outlined]="false"
                />
              } @else {
                <p-button
                  icon="pi pi-upload"
                  disabled="{{ !serverOnline }}"
                  pTooltip="{{
                    serverOnline ? saveOnlineText : saveOfflineText
                  }}"
                  [style]="{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }"
                  tooltipPosition="top"
                  severity="help"
                  class="mr-2"
                  [rounded]="true"
                  [outlined]="true"
                  (click)="saveStudyRemotely(typedStudy)"
                />
              }
            </td>
            <td style="text-align: end;">
              <p-button
                i18n-pTooltip
                icon="pi pi-copy"
                pTooltip="Duplicate"
                tooltipPosition="top"
                severity="warn"
                class="mr-2"
                [rounded]="true"
                [outlined]="true"
                (click)="duplicateStudy(typedStudy)"
              />
              <p-button
                i18n-pTooltip
                icon="pi pi-pencil"
                pTooltip="Edit"
                tooltipPosition="top"
                class="mr-2"
                [rounded]="true"
                [outlined]="true"
                (click)="editStudy(typedStudy)"
              />
              <p-button
                i18n-pTooltip
                icon="pi pi-trash"
                pTooltip="Delete"
                tooltipPosition="top"
                severity="danger"
                [rounded]="true"
                [outlined]="true"
                (click)="deleteStudy(typedStudy)"
              />
            </td>
            <td>
              <!-- <a href="/study/{{study.uuid}}"></a>   -->
              <p-button
                i18n-label
                label="OPEN"
                [routerLink]="['/study', typedStudy.uuid]"
                severity="contrast"
                [rounded]="false"
                [outlined]="false"
              />
            </td>
          </tr>
        }
      </ng-template>
    </p-table>

    <app-new-study-dialog
      [(open)]="studyDialogOpen"
      [study]="study"
      [saveStudy]="saveStudy.bind(this)"
      [submitted]="submitted"
    />

    <app-import-study-modal
      [(isOpen)]="isImportStudyModalOpen"
      (isOpenChange)="setIsImportStudyModalOpen($event)"
    />

    <p-confirmdialog [style]="{ width: '450px' }" />
  `,
  providers: [MessageService, ConfirmationService]
})
export class StudiesComponent implements OnInit {
  studyDialogOpen = false;
  isImportStudyModalOpen = false;
  studies = signal<Study[]>([]);
  study: Study = newStudy();
  selectedStudies!: Study[] | null;
  submitted = false;
  @ViewChild('dt') dt!: Table;
  columns: Column[] = columns;
  subscriptions = new Subscription();
  serverOnline = false;
  saveOnlineText = $localize`Save in distant database`;
  saveOfflineText = $localize`Cannot save. Server is offline`;

  constructor(
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly onlineService: OnlineService,
    private readonly storageService: StorageService,
    private readonly studyService: StudyService
  ) {}

  setIsImportStudyModalOpen(isOpen: boolean) {
    this.isImportStudyModalOpen = isOpen;
  }

  exportCSV() {
    this.dt.exportCSV();
  }

  identity(study: Study): Study {
    return study;
  }

  ngOnInit() {
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.loadStudies();
      }
    });

    this.subscriptions.add(
      this.onlineService.serverOnline$.subscribe((serverOnline) => {
        this.serverOnline = serverOnline === ServerStatus.ONLINE;
      })
    );
  }

  loadStudies() {
    this.storageService.db?.studies.toArray().then((studies) => {
      this.studies.set(studies);
    });
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  openNew() {
    this.study = newStudy();
    this.submitted = false;
    this.studyDialogOpen = true;
  }

  openImportStudyModal() {
    this.isImportStudyModalOpen = true;
  }

  importFromDatabase() {
    this.isImportStudyModalOpen = true;
  }

  editStudy(study: Study) {
    this.study = { ...study };
    this.studyDialogOpen = true;
  }

  deleteSelectedStudies() {
    this.confirmationService.confirm({
      message: $localize`Are you sure you want to delete the selected studies?`,
      header: $localize`Confirm`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        const studies = this.selectedStudies?.map((val) => val.uuid) || [];
        await this.storageService.db?.studies.bulkDelete(studies);
        this.studies.set(
          (await this.storageService.db?.studies.toArray()) || []
        );
        this.selectedStudies = null;
        this.messageService.add({
          severity: 'success',
          summary: $localize`Successful`,
          detail:
            studies.length === 1
              ? $localize`Study Deleted`
              : $localize`Studies Deleted`,
          life: 3000
        });
      }
    });
  }

  hideDialog() {
    this.studyDialogOpen = false;
    this.submitted = false;
  }

  hideImportStudyModal() {
    this.isImportStudyModalOpen = false;
  }

  saveStudyRemotely(study: Study) {
    this.studyService.createStudy(study).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: $localize`Successful`,
          detail: $localize`Study successfully saved!`,
          life: 3000
        });

        this.storageService.db?.studies
          .update(study.uuid, {
            ...study,
            updated_at_offline: new Date().toISOString(),
            saved: true
          })
          .then(async () => {
            this.studies.set(
              (await this.storageService.db?.studies.toArray()) || []
            );
          });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: $localize`Error`,
          life: 3000
        });
      }
    });
  }

  async deleteStudyAccepted(study: Study) {
    await this.storageService.db?.studies.delete(study.uuid);
    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.study = newStudy();
    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Study Deleted`,
      life: 3000
    });
  }

  deleteStudy(study: Study) {
    this.confirmationService.confirm({
      message: $localize`Are you sure you want to delete: ${study.title}?`,
      header: $localize`Confirm`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: $localize`Delete`,
      rejectLabel: $localize`Cancel`,
      accept: async () => {
        await this.deleteStudyAccepted(study);
      }
    });
  }

  createUuid(): string {
    return uuid();
  }

  async duplicateStudy(study: Study) {
    const newStudy = { ...study };
    const uuid = this.createUuid();
    await this.storageService.db?.studies.add({
      ...newStudy,
      uuid,
      saved: false
    });
    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`Study successfully duplicated!`,
      life: 3000
    });
  }

  async saveStudy() {
    this.submitted = true;
    if (!this.study?.title) {
      return;
    }
    if (this.study?.uuid) {
      const study = await this.storageService.db?.studies.get(this.study.uuid);
      if (study) {
        const isThereDifference = !isEqual(study, this.study);
        if (isThereDifference) {
          await this.storageService.db?.studies.update(study.uuid, {
            ...this.study,
            updated_at_offline: new Date().toISOString(),
            saved: false
          });
          this.messageService.add({
            severity: 'success',
            summary: $localize`Successful`,
            detail: $localize`Study updated!`,
            life: 3000
          });
        }
      }
    } else {
      const uuid = this.createUuid();
      const user = (await this.storageService.db?.users.toArray())?.[0];
      await this.storageService.db?.studies.add({
        ...this.study,
        uuid,
        author_email: user!.email,
        created_at_offline: new Date().toISOString(),
        updated_at_offline: new Date().toISOString(),
        saved: false
      });
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`Study Created`,
        life: 3000
      });
    }

    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.studyDialogOpen = false;
    this.study = newStudy();
  }
}
