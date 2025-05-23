/**
 * Copyright (c) 2025,
 * RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { orderBy } from 'lodash';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { StorageService } from '../../../core/store/storage.service';
import { Section } from '../../../core/store/database/interfaces/section';

@Component({
  selector: 'app-create-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    ToastModule,
    RippleModule
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-center"></p-toast>

    <p-dialog
      dismissableMask="true"
      header="New Section"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
    >
      <form
        [formGroup]="sectionForm"
        (ngSubmit)="onSubmit()"
        class="max-h-[70vh] overflow-y-auto"
      >
        <div class="w-full">
          <div class="w-full">
            <h3
              i18n
              class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
            >
              General Information
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- <div>
              <div class="mb-4">
                <label i18n for="internal_id" class="block mb-1"
                  >Internal ID*</label
                >
                <input
                  id="internal_id"
                  type="text"
                  pInputText
                  formControlName="internal_id"
                  class="w-full"
                />
                <small
                  i18n
                  *ngIf="
                    formControls.internal_id.invalid &&
                    formControls.internal_id.touched
                  "
                  class="text-red-500"
                >
                  Internal ID is required
                </small>
              </div>
            </div> -->

            <div>
              <div class="mb-4">
                <label i18n for="type" class="block mb-1">Type*</label>
                <p-dropdown
                  id="type"
                  [options]="sectionTypes"
                  formControlName="type"
                  placeholder="Select a type"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
                <small
                  i18n
                  *ngIf="formControls.type.invalid && formControls.type.touched"
                  class="text-red-500"
                >
                  Type is required
                </small>
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="name" class="block mb-1">Name*</label>
                <input
                  id="name"
                  type="text"
                  pInputText
                  formControlName="name"
                  class="w-full"
                />
                <small
                  i18n
                  *ngIf="formControls.name.invalid && formControls.name.touched"
                  class="text-red-500"
                >
                  Name is required
                </small>
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="short_name" class="block mb-1"
                  >Short Name*</label
                >
                <input
                  id="short_name"
                  type="text"
                  pInputText
                  formControlName="short_name"
                  class="w-full"
                />
                <small
                  i18n
                  *ngIf="
                    formControls.short_name.invalid &&
                    formControls.short_name.touched
                  "
                  class="text-red-500"
                >
                  Short name is required
                </small>
              </div>
            </div>

            <!-- <div>
              <div class="mb-4">
                <label i18n for="internal_catalog_id" class="block mb-1"
                  >Internal Catalog ID</label
                >
                <input
                  id="internal_catalog_id"
                  type="text"
                  pInputText
                  formControlName="internal_catalog_id"
                  class="w-full"
                />
              </div>
            </div> -->

            <div>
              <div class="mb-4">
                <label
                  i18n
                  for="regional_maintenance_center_names"
                  class="block mb-1"
                  >Regional Maintenance Center Name</label
                >
                <p-dropdown
                  id="regional_maintenance_center_names"
                  [options]="regionalMaintenanceCenters()"
                  (onChange)="onRegionalMaintenanceCenterChange($event)"
                  formControlName="regional_maintenance_center_names"
                  placeholder="Select a regional maintenance center name"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
              </div>
            </div>
            <div>
              <div class="mb-4">
                <label for="maintenance_center_names" class="block mb-1"
                  >Maintenance Center Name</label
                >
                <p-dropdown
                  id="maintenance_center_names"
                  [options]="maintenanceCenters()"
                  formControlName="maintenance_center_names"
                  placeholder="Select a maintenance center name"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
              </div>
            </div>

            <!-- Cable Information -->
            <div class="col-span-1 md:col-span-2">
              <h3
                i18n
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Cable Information
              </h3>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="cable_name" class="block mb-1"
                  >Cable Name</label
                >
                <input
                  id="cable_name"
                  type="text"
                  pInputText
                  formControlName="cable_name"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="cable_short_name" class="block mb-1"
                  >Cable Short Name</label
                >
                <input
                  id="cable_short_name"
                  type="text"
                  pInputText
                  formControlName="cable_short_name"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="cables_amount" class="block"
                  >Cables Amount</label
                >
                <p-inputNumber
                  id="cables_amount"
                  formControlName="cables_amount"
                  [showButtons]="true"
                  [min]="0"
                  class="w-full"
                ></p-inputNumber>
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="optical_fibers_amount" class="block mb-1"
                  >Optical Fibers Amount</label
                >
                <p-inputNumber
                  id="optical_fibers_amount"
                  formControlName="optical_fibers_amount"
                  [showButtons]="true"
                  [min]="0"
                  class="w-full"
                ></p-inputNumber>
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="spans_amount" class="block mb-1"
                  >Spans Amount</label
                >
                <p-inputNumber
                  id="spans_amount"
                  formControlName="spans_amount"
                  [showButtons]="true"
                  [min]="0"
                  class="w-full"
                ></p-inputNumber>
              </div>
            </div>

            <!-- Span Information -->
            <div class="col-span-1 md:col-span-2">
              <h3
                i18n
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Span Information
              </h3>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="begin_span_name" class="block mb-1"
                  >Begin Span Name</label
                >
                <input
                  id="begin_span_name"
                  type="text"
                  pInputText
                  formControlName="begin_span_name"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="last_span_name" class="block mb-1"
                  >Last Span Name</label
                >
                <input
                  id="last_span_name"
                  type="text"
                  pInputText
                  formControlName="last_span_name"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Support Information -->
            <div class="col-span-1 md:col-span-2">
              <h3
                i18n
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Support Information
              </h3>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="first_support_number" class="block mb-1"
                  >First Support Number</label
                >
                <input
                  id="first_support_number"
                  type="text"
                  pInputText
                  formControlName="first_support_number"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="last_support_number" class="block mb-1"
                  >Last Support Number</label
                >
                <input
                  id="last_support_number"
                  type="text"
                  pInputText
                  formControlName="last_support_number"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Attachment Information -->
            <div class="col-span-1 md:col-span-2">
              <h3
                i18n
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Attachment Information
              </h3>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="first_attachment_set" class="block mb-1"
                  >First Attachment Set</label
                >
                <input
                  id="first_attachment_set"
                  type="text"
                  pInputText
                  formControlName="first_attachment_set"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <div class="mb-4">
                <label i18n for="last_attachment_set" class="block mb-1"
                  >Last Attachment Set</label
                >
                <input
                  id="last_attachment_set"
                  type="text"
                  pInputText
                  formControlName="last_attachment_set"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            pButton
            pRipple
            label="Cancel"
            icon="pi pi-times"
            class="p-button-text"
            (click)="onCancel()"
          ></p-button>
          <p-button
            pButton
            pRipple
            label="Save"
            icon="pi pi-check"
            class="p-button-text"
            (click)="onSubmit()"
          ></p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-inputnumber {
          width: 100%;
        }

        .p-dropdown {
          width: 100%;
        }
      }
    `
  ]
})
export class CreateSectionComponent implements OnInit {
  @Output() save = new EventEmitter<Section>();
  @Output() cancel = new EventEmitter<void>(); //eslint-disable-line

  sectionForm!: FormGroup;
  visible = false;
  sectionTypes = ['guard', 'phase'];
  regionalMaintenanceCenters = signal<string[]>([]);
  maintenanceCenters = signal<string[]>([]);
  constructor(
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
    private readonly storageService: StorageService
  ) {}

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
    this.sectionForm.patchValue({
      maintenance_center_name: ''
    });
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
    this.initForm();
    this.storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.resetRegionalMaintenanceCenter();
      }
    });
  }

  initForm(): void {
    this.sectionForm = this.fb.group({
      internal_id: [''],
      name: ['', Validators.required],
      short_name: ['', Validators.required],
      internal_catalog_id: [''],
      type: ['', Validators.required],
      cable_name: [''],
      cable_short_name: [''],
      cables_amount: [0, [Validators.min(0), Validators.pattern('^[0-9]*$')]],
      optical_fibers_amount: [
        0,
        [Validators.min(0), Validators.pattern('^[0-9]*$')]
      ],
      spans_amount: [0, [Validators.min(0), Validators.pattern('^[0-9]*$')]],
      begin_span_name: [''],
      last_span_name: [''],
      first_support_number: [''],
      last_support_number: [''],
      first_attachment_set: [''],
      last_attachment_set: [''],
      regional_maintenance_center_names: [''],
      maintenance_center_names: ['']
    });
  }

  show(): void {
    this.visible = true;
    this.sectionForm.reset();
    // Set default values if needed
    this.sectionForm.patchValue({
      cables_amount: 0,
      optical_fibers_amount: 0,
      spans_amount: 0
    });
  }

  hide(): void {
    this.visible = false;
  }

  onCancel(): void {
    this.hide();
    this.cancel.emit();
  }

  async onSubmit(): Promise<void> {
    console.log('this.sectionForm', this.sectionForm);
    if (this.sectionForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please correct all errors before submitting.'
      });

      // Mark all fields as touched to trigger validation messages
      Object.keys(this.sectionForm.controls).forEach((key) => {
        this.sectionForm.get(key)?.markAsTouched();
      });

      return;
    }

    const now = new Date();
    const section: Section = {
      ...this.sectionForm.value,
      uuid: uuidv4(),
      internal_id: 'SEC-' + uuidv4(),
      regional_maintenance_center_names: [
        this.sectionForm.value.regional_maintenance_center_names
      ],
      maintenance_center_names: [
        this.sectionForm.value.maintenance_center_names
      ],
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    this.save.emit(section);
    this.sectionForm.reset();
    this.hide();
  }

  get formControls() {
    return this.sectionForm.controls;
  }
}
