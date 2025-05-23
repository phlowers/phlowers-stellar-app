/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  OnInit
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { SectionService } from '../../../core/api/services/section.service';
import { Section } from '../../../core/store/database/interfaces/section';
import { StorageService } from '../../../core/store/storage.service';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { Section3dComponent } from '../../../core/components/3d/section-3d.component';
import { RegionalMaintenanceCenter } from '../../../core/store/database/interfaces/regionalMaintenanceCenter';
import { MaintenanceCenter } from '../../../core/store/database/interfaces/maintenanceCenter';
import { orderBy } from 'lodash';

const newSection = (): Partial<
  Section & {
    regional_maintenance_center_name: string;
    maintenance_center_name: string;
  }
> => {
  return {
    uuid: '',
    internal_id: '',
    name: '',
    short_name: '',
    created_at: '',
    updated_at: '',
    internal_catalog_id: '',
    type: '',
    cable_name: '',
    cable_short_name: '',
    cables_amount: undefined,
    optical_fibers_amount: undefined,
    spans_amount: undefined,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: undefined,
    last_support_number: undefined,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_name: '',
    maintenance_center_name: ''
  };
};

@Component({
  selector: 'app-search-section-modal',
  template: `
    <p-dialog
      dismissableMask="true"
      [style]="{ width: '80vw', height: '90vh' }"
      header="3D View"
      [(visible)]="threeDModalOpen"
      [keepInViewport]="false"
      (onHide)="closeThreeDModal()"
      [modal]="true"
    >
      <app-section-3d *ngIf="threeDModalOpen()" />
    </p-dialog>
    <p-dialog
      dismissableMask="true"
      [style]="{ width: '80vw', height: '90vh' }"
      header="Search Section"
      [(visible)]="isOpen"
      (onHide)="closeModal()"
      [modal]="true"
    >
      <ng-template #content>
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div>
            <div class="flex flex-wrap gap-3 w-full">
              <div>
                <label
                  i18n
                  for="regionalMaintenanceCenters"
                  class="block font-bold mb-3"
                  >Regional Maintenance Center:</label
                >
                <p-select
                  id="regionalMaintenanceCenters"
                  [options]="regionalMaintenanceCenters()"
                  [(ngModel)]="sectionToSearch.regional_maintenance_center_name"
                  placeholder="View"
                  class="w-full md:w-56"
                  (onChange)="onRegionalMaintenanceCenterChange($event)"
                />
              </div>
              <div>
                <label
                  i18n
                  for="maintenanceCenters"
                  class="block font-bold mb-3"
                  >Maintenance Center:</label
                >
                <p-select
                  id="maintenanceCenters"
                  [options]="maintenanceCenters()"
                  [(ngModel)]="sectionToSearch.maintenance_center_name"
                  placeholder="View"
                  class="w-full md:w-56"
                />
              </div>
              <div>
                <label i18n for="uuid" class="block font-bold mb-3"
                  >UUID:</label
                >
                <input
                  width="400px"
                  id="uuid"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.uuid"
                  required
                />
              </div>
              <div>
                <label i18n for="internalId" class="block font-bold mb-3"
                  >Internal ID:</label
                >
                <input
                  width="400px"
                  id="internalId"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.internal_id"
                  required
                />
              </div>
              <div>
                <label i18n for="name" class="block font-bold mb-3"
                  >Name:</label
                >
                <input
                  width="400px"
                  id="name"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.name"
                  required
                />
              </div>
              <div>
                <label i18n for="shortName" class="block font-bold mb-3"
                  >Short Name:</label
                >
                <input
                  width="400px"
                  id="shortName"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.short_name"
                  required
                />
              </div>
              <div>
                <label i18n for="internalCatalogId" class="block font-bold mb-3"
                  >Internal Catalog ID:</label
                >
                <input
                  width="400px"
                  id="internalCatalogId"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.internal_catalog_id"
                  required
                />
              </div>
              <div>
                <label i18n for="type" class="block font-bold mb-3"
                  >Type:</label
                >
                <input
                  width="400px"
                  id="type"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.type"
                  required
                />
              </div>
              <div>
                <label i18n for="cableName" class="block font-bold mb-3"
                  >Cable Name:</label
                >
                <input
                  width="400px"
                  id="cableName"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.cable_name"
                  required
                />
              </div>
              <div>
                <label i18n for="cableShortName" class="block font-bold mb-3"
                  >Cable Short Name:</label
                >
                <input
                  width="400px"
                  id="cableShortName"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.cable_short_name"
                  required
                />
              </div>
              <div>
                <label i18n for="cablesAmount" class="block font-bold mb-3"
                  >Cables Amount:</label
                >
                <input
                  width="400px"
                  id="cablesAmount"
                  type="number"
                  pInputText
                  [(ngModel)]="sectionToSearch.cables_amount"
                  required
                />
              </div>
              <div>
                <label
                  i18n
                  for="opticalFibersAmount"
                  class="block font-bold mb-3"
                  >Optical Fibers Amount:</label
                >
                <input
                  width="400px"
                  id="opticalFibersAmount"
                  type="number"
                  pInputText
                  [(ngModel)]="sectionToSearch.optical_fibers_amount"
                  required
                />
              </div>
              <div>
                <label i18n for="spansAmount" class="block font-bold mb-3"
                  >Spans Amount:</label
                >
                <input
                  width="400px"
                  id="spansAmount"
                  type="number"
                  pInputText
                  [(ngModel)]="sectionToSearch.spans_amount"
                  required
                />
              </div>
              <div>
                <label i18n for="beginSpanName" class="block font-bold mb-3"
                  >Begin Span Name:</label
                >
                <input
                  width="400px"
                  id="beginSpanName"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.begin_span_name"
                  required
                />
              </div>
              <div>
                <label i18n for="lastSpanName" class="block font-bold mb-3"
                  >Last Span Name:</label
                >
                <input
                  width="400px"
                  id="lastSpanName"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.last_span_name"
                  required
                />
              </div>
              <div>
                <label
                  i18n
                  for="firstSupportNumber"
                  class="block font-bold mb-3"
                  >First Support Number:</label
                >
                <input
                  width="400px"
                  id="firstSupportNumber"
                  type="number"
                  pInputText
                  [(ngModel)]="sectionToSearch.first_support_number"
                  required
                />
              </div>
              <div>
                <label i18n for="lastSupportNumber" class="block font-bold mb-3"
                  >Last Support Number:</label
                >
                <input
                  width="400px"
                  id="lastSupportNumber"
                  type="number"
                  pInputText
                  [(ngModel)]="sectionToSearch.last_support_number"
                  required
                />
              </div>
              <div>
                <label
                  i18n
                  for="firstAttachmentSet"
                  class="block font-bold mb-3"
                  >First Attachment Set:</label
                >
                <input
                  width="400px"
                  id="firstAttachmentSet"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.first_attachment_set"
                  required
                />
              </div>
              <div>
                <label i18n for="lastAttachmentSet" class="block font-bold mb-3"
                  >Last Attachment Set:</label
                >
                <input
                  width="400px"
                  id="lastAttachmentSet"
                  type="text"
                  pInputText
                  [(ngModel)]="sectionToSearch.last_attachment_set"
                  required
                />
              </div>
            </div>
            <div class="flex flex-row gap-6 mt-3">
              <p-button i18n-label label="Search" (click)="searchSections()" />
              <p-button
                i18n-label
                label="Reset fields"
                severity="secondary"
                (click)="resetFields()"
              />
            </div>
          </div>
          <div
            style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin-top: 10px; height: 100%;"
          >
            <p-table
              #dt
              [value]="sections"
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
                    Regional Maintenance Centers
                  </th>
                  <th
                    i18n
                    pSortableColumn="maintenance_center_names"
                    style="min-width:16rem"
                  >
                    Maintenance Centers
                  </th>
                  <th
                    i18n
                    pSortableColumn="uuid"
                    style="width: 6rem; max-width: 6rem;"
                  >
                    Uuid
                    <p-sortIcon field="uuid" />
                  </th>
                  <th i18n pSortableColumn="name" style="min-width:16rem">
                    Name
                    <p-sortIcon field="name" />
                  </th>
                  <th
                    i18n
                    pSortableColumn="internal_id"
                    style="min-width:16rem"
                  >
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
                  <th
                    i18n
                    pSortableColumn="cable_short_name"
                    style="min-width:16rem"
                  >
                    Cable Short Name
                    <p-sortIcon field="cable_short_name" />
                  </th>
                  <th
                    i18n
                    pSortableColumn="cables_amount"
                    style="min-width:16rem"
                  >
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
                  <th
                    i18n
                    pSortableColumn="spans_amount"
                    style="min-width:16rem"
                  >
                    Spans Amount
                    <p-sortIcon field="spans_amount" />
                  </th>
                  <th
                    i18n
                    pSortableColumn="begin_span_name"
                    style="min-width:16rem"
                  >
                    Begin Span
                    <p-sortIcon field="begin_span_name" />
                  </th>
                  <th
                    i18n
                    pSortableColumn="last_span_name"
                    style="min-width:16rem"
                  >
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
                        (onClick)="createStudy(typedSection)"
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
                        [options]="
                          typedSection.regional_maintenance_center_names
                        "
                        [ngModel]="
                          typedSection.regional_maintenance_center_names[0]
                        "
                        appendTo="body"
                        placeholder="View"
                        class="w-full md:w-56"
                      />
                    </td>
                    <td>
                      <p-select
                        [options]="typedSection.maintenance_center_names"
                        [ngModel]="typedSection.maintenance_center_names[0]"
                        appendTo="body"
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
                  </tr>
                  <p-popover #op>
                    <div class="flex flex-col gap-4">
                      <p-button severity="secondary" label="Duplicate" />
                    </div>
                  </p-popover>
                }
              </ng-template>
            </p-table>
          </div>
        </div>
      </ng-template>
      <!-- <ng-template #footer>
        <p-button
          type="button"
          i18n-label
          label="Cancel"
          (click)="closeModal()"
        ></p-button>
      </ng-template> -->
      <!-- </div> -->
    </p-dialog>
  `,
  standalone: true,
  imports: [
    DialogModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    CommonModule,
    PopoverModule,
    Section3dComponent,
    SelectModule
  ]
})
export class SearchSectionModalComponent implements OnInit {
  sectionToSearch: Partial<
    Section & {
      regional_maintenance_center_name: string;
      maintenance_center_name: string;
    }
  > = newSection();
  @Input() isOpen!: boolean;
  @Output() isOpenChange = new EventEmitter<boolean>();
  isLoading = false;
  sections: Section[] = [];
  selectedSections: Section[] = [];
  searchedSections: Section[] = [];
  threeDModalOpen = signal(false);
  regionalMaintenanceCenters = signal<string[]>([]);
  maintenanceCenters = signal<string[]>([]);
  constructor(
    private readonly sectionService: SectionService,
    private readonly storageService: StorageService
  ) {
    this.sectionToSearch = newSection();
  }

  closeThreeDModal() {
    this.threeDModalOpen.set(false);
  }

  resetFields() {
    this.sectionToSearch = newSection();
    this.resetRegionalMaintenanceCenter();
  }

  identity(section: Section): Section {
    return section;
  }

  createStudy(section: Section) {
    console.log('createStudy', section);
  }

  async onRegionalMaintenanceCenterChange(event: any) {
    const regionalMaintenanceCenter = (
      await this.storageService.db.regional_maintenance_centers
        .where('name')
        .equals(event.value)
        .toArray()
    )[0];
    this.maintenanceCenters.set(
      orderBy(regionalMaintenanceCenter.maintenance_center_names, [
        (name) => name.toLowerCase()
      ])
    );
    this.sectionToSearch.maintenance_center_name = '';
  }

  resetRegionalMaintenanceCenter() {
    this.storageService.db.regional_maintenance_centers
      .toArray()
      .then((regionalMaintenanceCenters) => {
        this.regionalMaintenanceCenters.set(
          orderBy(regionalMaintenanceCenters, [
            (center) => center.name.toLowerCase()
          ]).map((regionalMaintenanceCenter) => regionalMaintenanceCenter.name)
        );
      });
    this.storageService.db.maintenance_centers
      .toArray()
      .then((maintenanceCenters) => {
        this.maintenanceCenters.set(
          orderBy(maintenanceCenters, [
            (center) => center.name.toLowerCase()
          ]).map((maintenanceCenter) => maintenanceCenter.name)
        );
      });
  }

  ngOnInit() {
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.resetRegionalMaintenanceCenter();
      }
    });
  }

  filterSections(
    section: Section,
    regionalMaintenanceCenters: RegionalMaintenanceCenter[],
    maintenanceCenters: MaintenanceCenter[]
  ) {
    return Object.keys(this.sectionToSearch).every((key) => {
      if (
        this.sectionToSearch[key as keyof Section] === undefined ||
        this.sectionToSearch[key as keyof Section] === ''
      ) {
        return true;
      }
      if (key === 'regional_maintenance_center_name') {
        return section.regional_maintenance_center_names.includes(
          regionalMaintenanceCenters.find(
            (regionalMaintenanceCenter) =>
              regionalMaintenanceCenter.name ===
              this.sectionToSearch[key as keyof Section]
          )?.name ?? ''
        );
      }
      if (key === 'maintenance_center_name') {
        return section.maintenance_center_names.includes(
          maintenanceCenters.find(
            (maintenanceCenter) =>
              maintenanceCenter.name ===
              this.sectionToSearch[key as keyof Section]
          )?.name ?? ''
        );
      }
      return section[key as keyof Section]
        .toString()
        .toLowerCase()
        .includes(
          this.sectionToSearch[key as keyof Section]
            ?.toString()
            .toLowerCase() ?? ''
        );
    });
  }

  searchSections() {
    this.isLoading = true;
    this.storageService.db.sections.toArray().then(async (sections) => {
      const regionalMaintenanceCenters =
        await this.storageService.db.regional_maintenance_centers.toArray();
      const maintenanceCenters =
        await this.storageService.db.maintenance_centers.toArray();
      console.log('sections to search', this.sectionToSearch);
      this.sections = sections.filter((section) =>
        this.filterSections(
          section,
          regionalMaintenanceCenters,
          maintenanceCenters
        )
      );
      this.isLoading = false;
    });
  }

  openThreeDModal() {
    this.threeDModalOpen.set(true);
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }
}
