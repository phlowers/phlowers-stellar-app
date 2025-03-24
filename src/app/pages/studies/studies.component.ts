import { Component, inject, input, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { isEqual } from 'lodash';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { StudyModelLocal } from '../../core/store/models/study.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ImportStudyModalComponent } from './component/import-study-modal.component';

interface Column {
  title: string;
  dataKey: string;
}

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

const columns = [
  { dataKey: 'uuid', title: 'Uuid' },
  { dataKey: 'title', title: 'Name' },
  { dataKey: 'description', title: 'Description' },
  { dataKey: 'author_email', title: 'Author' },
  { dataKey: 'saved', title: 'Saved remotely' }
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
    ToolbarModule,
    RatingModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    RadioButtonModule,
    InputNumberModule,
    DialogModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    ImportStudyModalComponent
  ],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-toolbar styleClass="mb-6">
      <ng-template #start>
        <p-button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
        <p-button label="Import from database" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openImportStudyModal()" />
        <p-button severity="secondary" label="Delete" icon="pi pi-trash" outlined (onClick)="deleteSelectedStudies()" [disabled]="!selectedStudies || !selectedStudies.length" />
      </ng-template>

      <!-- <ng-template #end>
        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
      </ng-template> -->
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
      [showCurrentPageReport]="true"
      [rowsPerPageOptions]="[10, 20, 30]"
    >
      <ng-template #caption>
        <div class="flex items-center justify-between">
          <h5 class="m-0">Studies</h5>
          <p-iconfield>
            <p-inputicon styleClass="pi pi-search" />
            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
          </p-iconfield>
        </div>
      </ng-template>
      <ng-template #header>
        <tr>
          <th style="width: 3rem">
            <p-tableHeaderCheckbox />
          </th>
          <th style="width: 6rem; max-width: 6rem;">Uuid</th>
          <th pSortableColumn="title" style="min-width:16rem">
            Name
            <p-sortIcon field="title" />
          </th>
          <th pSortableColumn="description" style="min-width:16rem">
            Description
            <p-sortIcon field="description" />
          </th>
          <th pSortableColumn="author_email" style="display: flex; justify-content: center; min-width:16rem">
            Author
            <p-sortIcon field="author_email" />
          </th>
          <th style="min-width: 12rem"></th>
          <th style="min-width: 2rem"></th>
        </tr>
      </ng-template>
      <ng-template #body let-study>
        <!-- trick to get type safety -->
        @if (identity(study); as typedStudy) {
          <tr>
            <td style="width: 3rem">
              <p-tableCheckbox [value]="typedStudy" />
            </td>
            <td style="width: 6rem; max-width: 6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ typedStudy.uuid }}</td>
            <td style="min-width: 16rem">{{ typedStudy.title }}</td>
            <td style="min-width: 16rem">{{ typedStudy.description }}</td>
            <td style="min-width: 16rem">{{ typedStudy.author_email }}</td>
            <td style="min-width: 12rem" style="display:flex; justify-content:center;">
              @if (typedStudy.saved) {
                <!-- <p-avatar icon="pi pi-check" [style]="{ 'background-color': 'transparent', color: 'green' }" class="mr-2" size="normal" shape="circle" /> -->

                <p-button icon="pi pi-check" [style]="{ 'background-color': 'transparent', color: 'green' }" disabled="true" severity="secondary" class="mr-2" [rounded]="true" [outlined]="false" />
              } @else {
                <p-button icon="pi pi-upload" severity="help" class="mr-2" [rounded]="true" [outlined]="false" (click)="saveStudyRemotely(typedStudy)" />
              }
            </td>
            <td style="text-align: end;">
              <p-button icon="pi pi-copy" severity="warn" class="mr-2" [rounded]="true" [outlined]="false" (click)="duplicateStudy(typedStudy)" />
              <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="false" (click)="editStudy(typedStudy)" />
              <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="false" (click)="deleteStudy(typedStudy)" />
            </td>
            <td>
              <!-- <a href="/study/{{study.uuid}}"></a>   -->
              <p-button label="OPEN" [routerLink]="['/study', typedStudy.uuid]" severity="contrast" [rounded]="false" [outlined]="false" />
            </td>
          </tr>
        }
      </ng-template>
    </p-table>

    <p-dialog dismissableMask="true" [(visible)]="studyDialog" [style]="{ width: '450px' }" header="New study" [modal]="true">
      <ng-template #content>
        <div class="flex flex-col gap-6">
          <div>
            <label for="title" class="block font-bold mb-3">Title</label>
            <input type="text" pInputText id="title" [(ngModel)]="study.title" required autofocus fluid />
            <small class="text-red-500" *ngIf="submitted && !study!.title">Title is required.</small>
          </div>
          <div>
            <label for="description" class="block font-bold mb-3">Description</label>
            <textarea id="description" pTextarea [(ngModel)]="study.description" required rows="3" cols="20" fluid></textarea>
          </div>
        </div>
      </ng-template>

      <ng-template #footer>
        <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
        <p-button label="Save" icon="pi pi-check" (click)="saveStudy()" />
      </ng-template>
    </p-dialog>

    <app-import-study-modal [(isOpen)]="isImportStudyModalOpen" (isOpenChange)="setIsImportStudyModalOpen($event)" />

    <p-confirmdialog [style]="{ width: '450px' }" />
  `,
  providers: [MessageService, ConfirmationService]
})
export class Studies implements OnInit {
  studyDialog: boolean = false;
  isImportStudyModalOpen = false;
  studies = signal<StudyModelLocal[]>([]);
  study: StudyModelLocal = newStudy();
  selectedStudies!: StudyModelLocal[] | null;
  submitted: boolean = false;
  @ViewChild('dt') dt!: Table;
  columns: Column[] = columns;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private storageService: StorageService,
    private studyService: StudyService
  ) { }

  setIsImportStudyModalOpen(isOpen: boolean) {
    console.log("isOpen", isOpen);
    this.isImportStudyModalOpen = isOpen;
  }

  exportCSV() {
    this.dt.exportCSV();
  }

  identity(study: StudyModelLocal): StudyModelLocal {
    return study;
  }

  ngOnInit() {
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.loadStudies();
      }
    });
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
    this.studyDialog = true;
  }

  openImportStudyModal() {
    this.isImportStudyModalOpen = true;
  }

  importFromDatabase() {
    this.isImportStudyModalOpen = true;
  }

  editStudy(study: StudyModelLocal) {
    this.study = { ...study };
    this.studyDialog = true;
  }

  deleteSelectedStudies() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected studies?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        const studies = this.selectedStudies?.map((val) => val.uuid) || [];
        await this.storageService.db?.studies.bulkDelete(studies);
        this.studies.set((await this.storageService.db?.studies.toArray()) || []);
        this.selectedStudies = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: studies.length === 1 ? 'StudyModelLocal Deleted' : 'Studies Deleted',
          life: 3000
        });
      }
    });
  }

  hideDialog() {
    this.studyDialog = false;
    this.submitted = false;
  }

  hideImportStudyModal() {
    this.isImportStudyModalOpen = false;
  }

  saveStudyRemotely(study: StudyModelLocal) {
    this.studyService.createStudy(study).subscribe({
      next: async () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Study successfully saved!',
          life: 3000
        });

        await this.storageService.db?.studies.update(study.uuid, { ...study, updated_at_offline: new Date().toISOString(), saved: true });
        this.studies.set((await this.storageService.db?.studies.toArray()) || []);
      },
      error: (error: HttpErrorResponse) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          life: 3000
        });
      }
    });
  }

  deleteStudy(study: StudyModelLocal) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + study.title + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.storageService.db?.studies.delete(study.uuid);
        this.studies.set((await this.storageService.db?.studies.toArray()) || []);
        this.study = newStudy();
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'StudyModelLocal Deleted',
          life: 3000
        });
      }
    });
  }

  findIndexById(uuid: string): number {
    let index = -1;
    for (let i = 0; i < this.studies().length; i++) {
      if (this.studies()[i].uuid === uuid) {
        index = i;
        break;
      }
    }

    return index;
  }

  createUuid(): string {
    return uuid();
  }

  async duplicateStudy(study: StudyModelLocal) {
    const newStudy = { ...study };
    const uuid = this.createUuid();
    await this.storageService.db?.studies.add({ ...newStudy, uuid, saved: false });
    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.messageService.add({
      severity: 'success',
      summary: 'Successful',
      detail: 'Study successfully duplicated!',
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
          await this.storageService.db?.studies.update(study.uuid, { ...this.study, updated_at_offline: new Date().toISOString(), saved: false });
          this.messageService.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Study updated!',
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
        summary: 'Successful',
        detail: 'StudyModelLocal Created',
        life: 3000
      });
    }

    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.studyDialog = false;
    this.study = newStudy();
  }
}
