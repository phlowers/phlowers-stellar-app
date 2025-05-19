/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { v4 as uuidV4 } from 'uuid';

import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SearchSectionModalComponent } from './components/search-section-modal.component';
import { TableModule } from 'primeng/table';
import { Section } from '../../core/store/database/interfaces/section';
import { ToolbarModule } from 'primeng/toolbar';
import { StorageService } from '../../core/store/storage.service';
import { PopoverModule } from 'primeng/popover';
import { CreateSectionComponent } from './components/create-section.component';
import { SelectModule } from 'primeng/select';
import { Section3dComponent } from '../../core/components/3d/section-3d.component';
import { Study } from '../../core/store/database/interfaces/study';
import { NewStudyDialogComponent } from '../../core/components/new-study-dialog/new-study-dialog.component';
import { Router } from '@angular/router';

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

@Component({
  standalone: true,
  imports: [
    Section3dComponent,
    CreateSectionComponent,
    SearchSectionModalComponent,
    PopoverModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    DialogModule,
    TableModule,
    ToolbarModule,
    SelectModule,
    NewStudyDialogComponent
  ],
  template: `
    <app-create-section
      (save)="onSaveSection($event)"
      (cancel)="onCancelSection()"
    ></app-create-section>

    <app-new-study-dialog
      [(open)]="studyDialogOpen"
      [study]="study"
      [saveStudy]="saveStudy.bind(this)"
      [submitted]="submitted"
    />

    <p-dialog
      dismissableMask="true"
      [style]="{ width: '80vw', height: '90vh' }"
      header="3D View"
      [(visible)]="threeDModalOpen"
      (onHide)="closeThreeDModal()"
      [keepInViewport]="false"
      [modal]="true"
    >
      <!-- @defer (on viewport) { -->
      <app-section-3d *ngIf="threeDModalOpen()" />
      <!-- } @placeholder {
        <div></div>
      } -->
    </p-dialog>
    <app-search-section-modal
      [isOpen]="isSearchSectionModalOpen"
      (isOpenChange)="setIsSearchSectionModalOpen($event)"
    />
    <p-toolbar styleClass="mb-6">
      <ng-template #start>
        <div class="flex flex-row gap-2">
          <p-button
            label="Search"
            icon="pi pi-search"
            severity="secondary"
            (onClick)="search()"
          />
          <p-button
            label="Create"
            icon="pi pi-plus"
            severity="secondary"
            (onClick)="openCreateSectionDialog()"
          />
        </div>
      </ng-template>
      <ng-template #end>
        <div class="flex flex-row gap-2">
          <p-button
            label="Load dummy data"
            icon="pi pi-upload"
            severity="secondary"
            (onClick)="loadDummyData()"
          />
          <p-button
            label="Load from file"
            icon="pi pi-upload"
            severity="secondary"
            (onClick)="loadFromFile()"
          />
        </div>
      </ng-template>
    </p-toolbar>
    <p-table
      #dt
      [value]="sections()"
      [rows]="10"
      [paginator]="true"
      [globalFilterFields]="['title']"
      [tableStyle]="{ 'min-width': '75rem' }"
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
          <h5 i18n class="m-0">Sections</h5>
        </div>
      </ng-template>
      <ng-template #header>
        <tr>
          <th style="width: 3rem"></th>
          <th i18n style="width: 10rem; max-width: 10rem;"></th>
          <th i18n style="width: 10rem; max-width: 10rem;"></th>
          <th
            i18n
            pSortableColumn="regional_maintenance_center_names"
            style="min-width:16rem"
          >
            Regional Maintenance Center
          </th>
          <th
            i18n
            pSortableColumn="maintenance_center_names"
            style="min-width:16rem"
          >
            Maintenance Center
          </th>
          <th i18n pSortableColumn="uuid" style="width: 6rem; max-width: 6rem;">
            Uuid
            <p-sortIcon field="uuid" />
          </th>
          <th i18n pSortableColumn="name" style="min-width:16rem">
            Name
            <p-sortIcon field="name" />
          </th>
          <th i18n pSortableColumn="internal_id" style="min-width:16rem">
            Internal ID
            <p-sortIcon field="internal_id" />
          </th>
          <th i18n pSortableColumn="short_name" style="min-width:16rem">
            Short Name
            <p-sortIcon field="short_name" />
          </th>
          <th
            i18n
            pSortableColumn="internal_catalog_id"
            style="min-width:16rem"
          >
            Internal Catalog ID
            <p-sortIcon field="internal_catalog_id" />
          </th>
          <th i18n pSortableColumn="type" style="min-width:16rem">
            Type
            <p-sortIcon field="type" />
          </th>
          <th i18n pSortableColumn="cable_name" style="min-width:16rem">
            Cable Name
            <p-sortIcon field="cable_name" />
          </th>
          <th i18n pSortableColumn="cable_short_name" style="min-width:16rem">
            Cable Short Name
            <p-sortIcon field="cable_short_name" />
          </th>
          <th i18n pSortableColumn="cables_amount" style="min-width:16rem">
            Cables Amount
            <p-sortIcon field="cables_amount" />
          </th>
          <th
            i18n
            pSortableColumn="optical_fibers_amount"
            style="min-width:16rem"
          >
            Optical Fibers Amount
            <p-sortIcon field="optical_fibers_amount" />
          </th>
          <th i18n pSortableColumn="spans_amount" style="min-width:16rem">
            Spans Amount
            <p-sortIcon field="spans_amount" />
          </th>
          <th i18n pSortableColumn="begin_span_name" style="min-width:16rem">
            Begin Span
            <p-sortIcon field="begin_span_name" />
          </th>
          <th i18n pSortableColumn="last_span_name" style="min-width:16rem">
            End Span
            <p-sortIcon field="last_span_name" />
          </th>
          <th
            i18n
            pSortableColumn="first_support_number"
            style="min-width:16rem"
          >
            First Support Number
            <p-sortIcon field="first_support_number" />
          </th>
          <th
            i18n
            pSortableColumn="last_support_number"
            style="min-width:16rem"
          >
            Last Support Number
            <p-sortIcon field="last_support_number" />
          </th>
          <th
            i18n
            pSortableColumn="first_attachment_set"
            style="min-width:16rem"
          >
            First Attachment Set
            <p-sortIcon field="first_attachment_set" />
          </th>
          <th
            i18n
            pSortableColumn="last_attachment_set"
            style="min-width:16rem"
          >
            Last Attachment Set
            <p-sortIcon field="last_attachment_set" />
          </th>
          <th i18n pSortableColumn="created_at" style="min-width:16rem">
            Created At
            <p-sortIcon field="created_at" />
          </th>
        </tr>
      </ng-template>
      <ng-template #body let-section>
        <!-- trick to get type safety -->
        @if (identity(section); as typedSection) {
          <tr>
            <td>
              <p-button
                severity="secondary"
                icon="pi pi-ellipsis-v"
                (onClick)="op.toggle($event)"
              />
            </td>
            <td style="min-width: 10rem;">
              <p-button
                i18n-label
                label="Create study"
                severity="secondary"
                (onClick)="createStudy()"
                class="mr-2"
              />
            </td>
            <td style="min-width: 10rem;">
              <p-button
                i18n-label
                label="View 3d"
                severity="secondary"
                (onClick)="openThreeDModal()"
                class="mr-2"
              />
            </td>
            <td>
              <p-select
                [options]="typedSection.regional_maintenance_center_names"
                placeholder="View"
                [ngModel]="typedSection.regional_maintenance_center_names[0]"
                class="w-full md:w-56"
              />
            </td>
            <td>
              <p-select
                [options]="typedSection.maintenance_center_names"
                [ngModel]="typedSection.maintenance_center_names[0]"
                placeholder="View"
                class="w-full md:w-56"
              />
            </td>
            <td
              style="width: 6rem; max-width: 6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >
              {{ typedSection.uuid }}
            </td>
            <td style="min-width: 16rem">{{ typedSection.name }}</td>
            <td>{{ typedSection.internal_id }}</td>
            <td>{{ typedSection.short_name }}</td>
            <td>{{ typedSection.internal_catalog_id }}</td>
            <td>{{ typedSection.type }}</td>
            <td>{{ typedSection.cable_name }}</td>
            <td>{{ typedSection.cable_short_name }}</td>
            <td>{{ typedSection.cables_amount }}</td>
            <td>{{ typedSection.optical_fibers_amount }}</td>
            <td>{{ typedSection.spans_amount }}</td>
            <td>{{ typedSection.begin_span_name }}</td>
            <td>{{ typedSection.last_span_name }}</td>
            <td>{{ typedSection.first_support_number }}</td>
            <td>{{ typedSection.last_support_number }}</td>
            <td>{{ typedSection.first_attachment_set }}</td>
            <td>{{ typedSection.last_attachment_set }}</td>
            <td>{{ typedSection.created_at }}</td>
          </tr>
          <p-popover #op>
            <div class="flex flex-col gap-4">
              <p-button severity="secondary" label="Duplicate" />
            </div>
          </p-popover>
        }
      </ng-template>
    </p-table>
  `,
  providers: [MessageService, ConfirmationService]
})
export class SectionsComponent implements OnInit {
  @ViewChild(CreateSectionComponent)
  createSectionDialog!: CreateSectionComponent;
  study: Study = newStudy();
  submitted = false;
  isSearchSectionModalOpen = false;
  sections = signal<Section[]>([]);
  threeDModalOpen = signal(false);
  studyDialogOpen = signal(false);
  test = ['1', '2', '3', '4', '5', '6', '7'];

  section = {
    title: '',
    description: ''
  };

  constructor(
    private readonly storageService: StorageService,
    private readonly messageService: MessageService,
    private readonly router: Router
  ) {}

  loadFromFile() {
    const file = document.createElement('input');
    file.type = 'file';
    file.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const jsonContent = e.target?.result as string;
          console.log('jsonContent', jsonContent);
          await this.storageService.db.loadMockDataFromJson(
            JSON.parse(jsonContent)
          );
          this.sections.set(await this.storageService.db.sections.toArray());
        };
        reader.readAsText(file);
      }
    };
    file.click();
  }

  async loadDummyData() {
    await this.storageService.db.fillDatabaseWithMockData();
    this.sections.set(await this.storageService.db.sections.toArray());
  }

  closeThreeDModal() {
    this.threeDModalOpen.set(false);
  }

  openThreeDModal() {
    this.threeDModalOpen.set(true);
  }

  search() {
    this.isSearchSectionModalOpen = true;
  }

  create() {
    console.log('create');
  }

  setIsSearchSectionModalOpen(isOpen: boolean) {
    this.isSearchSectionModalOpen = isOpen;
  }

  identity(section: Section): Section {
    return section;
  }

  duplicate(section: Section) {
    console.log('duplicate', section);
    this.storageService.db.sections.add(section);
  }

  createStudy() {
    this.studyDialogOpen.set(true);
  }

  async onSaveSection(section: Section): Promise<void> {
    await this.storageService.db.sections.add(section);
    this.sections.set(await this.storageService.db.sections.toArray());
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Section created successfully'
    });
  }

  onCancelSection(): void {
    console.log('Section creation cancelled');
  }

  openCreateSectionDialog(): void {
    this.createSectionDialog.show();
  }

  async saveStudy() {
    this.submitted = true;
    if (!this.study?.title) {
      return;
    }
    const uuid = uuidV4();
    const user = (await this.storageService.db?.users.toArray())?.[0];
    await this.storageService.db?.studies.add({
      ...this.study,
      uuid,
      author_email: user.email,
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

    this.studyDialogOpen.set(false);
    this.study = newStudy();
    this.router.navigate(['/study', uuid]);
  }

  ngOnInit() {
    this.storageService.ready$.subscribe(async (ready) => {
      if (ready) {
        const sections = await this.storageService.db.sections.toArray();
        this.sections.set(sections);
      }
    });
  }
}
