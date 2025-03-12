import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
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
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { RouterModule } from '@angular/router';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { StudyService } from '../service/study.service';
import { v4 as uuid } from 'uuid';
import { StorageService } from '../service/storage.service';
import { Study } from '../database/db';

interface Column {
  title: string;
  dataKey: string;
}

const newStudy = () => {
  return {
    name: '',
    description: '',
    uuid: ''
  };
};

const columns = [
  { dataKey: 'uuid', title: 'Uuid' },
  { dataKey: 'name', title: 'Name' },
  { dataKey: 'description', title: 'Description' },
  { dataKey: 'saved', title: 'Saved remotely' }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
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
    ConfirmDialogModule
  ],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-toolbar styleClass="mb-6">
      <ng-template #start>
        <p-button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
        <p-button severity="secondary" label="Delete" icon="pi pi-trash" outlined (onClick)="deleteSelectedStudies()" [disabled]="!selectedStudies || !selectedStudies.length" />
      </ng-template>

      <ng-template #end>
        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
      </ng-template>
    </p-toolbar>

    <p-table
      #dt
      [value]="studies()"
      [rows]="10"
      [columns]="columns"
      [paginator]="true"
      [globalFilterFields]="['name']"
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
          <th style="width: 12rem; max-width: 12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Uuid</th>
          <th pSortableColumn="name" style="min-width:16rem">
            Name
            <p-sortIcon field="name" />
          </th>
          <th pSortableColumn="description" style="min-width:16rem">
            Description
            <p-sortIcon field="description" />
          </th>
          <th pSortableColumn="saved" style="min-width:16rem">
            Saved remotely
            <p-sortIcon field="saved" />
          </th>
          <th style="min-width: 12rem"></th>
          <th style="min-width: 2rem"></th>
        </tr>
      </ng-template>
      <ng-template #body let-study>
        <tr>
          <td style="width: 3rem">
            <p-tableCheckbox [value]="study" />
          </td>
          <td style="width: 12rem; max-width: 12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ study.uuid }}</td>
          <td style="min-width: 16rem">{{ study.name }}</td>
          <td style="min-width: 16rem">{{ study.description }}</td>
          <td style="min-width: 12rem">{{ study.saved }}</td>
          <td style="text-align: end;">
            <p-button icon="pi pi-upload" severity="help" class="mr-2" [rounded]="true" [outlined]="false" (click)="deleteStudy(study)" />
            <p-button icon="pi pi-copy" severity="warn" class="mr-2" [rounded]="true" [outlined]="false" (click)="duplicateStudy(study)" />
            <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="false" (click)="editStudy(study)" />
            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="false" (click)="deleteStudy(study)" />
          </td>
          <td>
            <!-- <a href="/study/{{study.uuid}}"></a>   -->
            <p-button label="OPEN" [routerLink]="['/study', study.uuid]" severity="contrast" [rounded]="false" [outlined]="false" />
          </td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog dismissableMask="true" [(visible)]="studyDialog" [style]="{ width: '450px' }" header="New study" [modal]="true">
      <ng-template #content>
        <div class="flex flex-col gap-6">
          <div>
            <label for="name" class="block font-bold mb-3">Name</label>
            <input type="text" pInputText id="name" [(ngModel)]="study.name" required autofocus fluid />
            <small class="text-red-500" *ngIf="submitted && !study!.name">Name is required.</small>
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

    <p-confirmdialog [style]="{ width: '450px' }" />
  `,
  providers: [MessageService, StudyService, ConfirmationService]
})
export class Dashboard implements OnInit {
  studyDialog: boolean = false;
  studies = signal<Study[]>([]);
  study: Study = newStudy();
  selectedStudies!: Study[] | null;
  submitted: boolean = false;
  @ViewChild('dt') dt!: Table;
  columns: Column[] = columns;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private storageService: StorageService
  ) {}

  exportCSV() {
    this.dt.exportCSV();
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

  editStudy(study: Study) {
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
          detail: studies.length === 1 ? 'Study Deleted' : 'Studies Deleted',
          life: 3000
        });
      }
    });
  }

  hideDialog() {
    this.studyDialog = false;
    this.submitted = false;
  }

  saveStudyRemotely() {}

  deleteStudy(study: Study) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + study.name + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.storageService.db?.studies.delete(study.uuid);
        this.studies.set((await this.storageService.db?.studies.toArray()) || []);
        this.study = newStudy();
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Study Deleted',
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

  async duplicateStudy(study: Study) {
    const newStudy = { ...study };
    const uuid = this.createUuid();
    await this.storageService.db?.studies.add({ ...newStudy, uuid });
    this.studies.set((await this.storageService.db?.studies.toArray()) || []);
    this.messageService.add({
      severity: 'success',
      summary: 'Successful',
      detail: 'Study Duplicated',
      life: 3000
    });
  }

  async saveStudy() {
    this.submitted = true;
    if (!this.study?.name) {
      return;
    }
    if (this.study?.uuid) {
      await this.storageService.db?.studies.put({ ...this.study });
      this.studies.set((await this.storageService.db?.studies.toArray()) || []);
      this.messageService.add({
        severity: 'success',
        summary: 'Successful',
        detail: 'Study Updated',
        life: 3000
      });
    } else {
      const uuid = this.createUuid();
      await this.storageService.db?.studies.add({ ...this.study, uuid });
      this.studies.set((await this.storageService.db?.studies.toArray()) || []);
      this.messageService.add({
        severity: 'success',
        summary: 'Successful',
        detail: 'Study Created',
        life: 3000
      });
    }

    this.studyDialog = false;
    this.study = newStudy();
  }
}
