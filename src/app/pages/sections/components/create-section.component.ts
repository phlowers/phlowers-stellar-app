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

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { StorageService } from '../../../core/store/storage.service';

interface Section {
  uuid: string;
  internal_id: string;
  name: string;
  short_name: string;
  created_at: Date;
  updated_at: Date;
  internal_catalog_id: string;
  type: string;
  cable_name: string;
  cable_short_name: string;
  cables_amount: number;
  optical_fibers_amount: number;
  spans_amount: number;
  begin_span_name: string;
  last_span_name: string;
  first_support_number: string;
  last_support_number: string;
  first_attachment_set: string;
  last_attachment_set: string;
}

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
              class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
            >
              General Information
            </h3>
          </div>

          <div class="flex flex-wrap">
            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="internal_id" class="block mb-1">Internal ID*</label>
                <input
                  id="internal_id"
                  type="text"
                  pInputText
                  formControlName="internal_id"
                  class="w-full"
                />
                <small
                  *ngIf="
                    formControls.internal_id.invalid &&
                    formControls.internal_id.touched
                  "
                  class="text-red-500"
                >
                  Internal ID is required
                </small>
              </div>
            </div>

            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="type" class="block mb-1">Type*</label>
                <p-dropdown
                  id="type"
                  [options]="sectionTypes"
                  formControlName="type"
                  placeholder="Select a type"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
                <small
                  *ngIf="formControls.type.invalid && formControls.type.touched"
                  class="text-red-500"
                >
                  Type is required
                </small>
              </div>
            </div>

            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="name" class="block mb-1">Name*</label>
                <input
                  id="name"
                  type="text"
                  pInputText
                  formControlName="name"
                  class="w-full"
                />
                <small
                  *ngIf="formControls.name.invalid && formControls.name.touched"
                  class="text-red-500"
                >
                  Name is required
                </small>
              </div>
            </div>

            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="short_name" class="block mb-1">Short Name*</label>
                <input
                  id="short_name"
                  type="text"
                  pInputText
                  formControlName="short_name"
                  class="w-full"
                />
                <small
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

            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="internal_catalog_id" class="block mb-1"
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
            </div>
            <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="regional_maintenance_center_name" class="block mb-1"
                  >Regional Maintenance Center Name</label
                >
                <p-dropdown
                  id="regional_maintenance_center_name"
                  [options]="regionalMaintenanceCenters()"
                  formControlName="regional_maintenance_center_name"
                  (onChange)="onRegionalMaintenanceCenterChange($event)"
                  placeholder="Select a regional maintenance center name"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
              </div>
            </div>
            <!-- <div class="w-full md:w-1/2 px-2">
              <div class="mb-4">
                <label for="maintenance_center_name" class="block mb-1"
                  >Maintenance Center Name</label
                >
                <p-dropdown
                  id="maintenance_center_name"
                  [options]="maintenanceCenters()"
                  formControlName="maintenance_center_name"
                  placeholder="Select a maintenance center name"
                  [showClear]="true"
                  class="w-full"
                ></p-dropdown>
              </div>
            </div> -->

            <!-- Cable Information -->
            <div class="w-full">
              <h3
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Cable Information
              </h3>
            </div>

            <div class="flex flex-wrap -mx-2">
              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="cable_name" class="block mb-1">Cable Name</label>
                  <input
                    id="cable_name"
                    type="text"
                    pInputText
                    formControlName="cable_name"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="cable_short_name" class="block mb-1"
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

              <div class="w-full md:w-1/3 px-2">
                <div class="mb-4">
                  <label for="cables_amount" class="block mb-1"
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

              <div class="w-full md:w-1/3 px-2">
                <div class="mb-4">
                  <label for="optical_fibers_amount" class="block mb-1"
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

              <div class="w-full md:w-1/3 px-2">
                <div class="mb-4">
                  <label for="spans_amount" class="block mb-1"
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
            </div>

            <!-- Span Information -->
            <div class="w-full">
              <h3
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Span Information
              </h3>
            </div>

            <div class="flex flex-wrap -mx-2">
              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="begin_span_name" class="block mb-1"
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

              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="last_span_name" class="block mb-1"
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
            </div>

            <!-- Support Information -->
            <div class="w-full">
              <h3
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Support Information
              </h3>
            </div>

            <div class="flex flex-wrap -mx-2">
              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="first_support_number" class="block mb-1"
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

              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="last_support_number" class="block mb-1"
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
            </div>

            <!-- Attachment Information -->
            <div class="w-full">
              <h3
                class="mt-4 mb-2 text-small font-medium border-b border-gray-200 pb-2"
              >
                Attachment Information
              </h3>
            </div>

            <div class="flex flex-wrap -mx-2">
              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="first_attachment_set" class="block mb-1"
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

              <div class="w-full md:w-1/2 px-2">
                <div class="mb-4">
                  <label for="last_attachment_set" class="block mb-1"
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
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button
            pButton
            pRipple
            label="Cancel"
            icon="pi pi-times"
            class="p-button-text"
            (click)="onCancel()"
          ></button>
          <button
            pButton
            pRipple
            label="Save"
            icon="pi pi-check"
            class="p-button-primary"
            (click)="onSubmit()"
          ></button>
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
  @Output() cancel = new EventEmitter<void>();

  sectionForm!: FormGroup;
  visible = false;
  sectionTypes = ['guard', 'phase'];
  regionalMaintenanceCenters = signal<string[]>([]);
  maintenanceCenters = signal<string[]>([]);
  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private storageService: StorageService
  ) {}

  async onRegionalMaintenanceCenterChange(event: any) {
    console.log('onRegionalMaintenanceCenterChange', event);
    const regionalMaintenanceCenter = (
      await this.storageService.db.regional_maintenance_centers
        .where('name')
        .equals(event.value)
        .toArray()
    )[0];
    this.maintenanceCenters.set(
      regionalMaintenanceCenter.maintenance_center_names.sort((a, b) =>
        a.localeCompare(b)
      )
    );
    this.sectionForm.patchValue({
      maintenance_center_name: ''
    });
  }

  resetRegionalMaintenanceCenter() {
    this.storageService.db.regional_maintenance_centers
      .toArray()
      .then((regionalMaintenanceCenters) => {
        console.log('regionalMaintenanceCenters', regionalMaintenanceCenters);
        this.regionalMaintenanceCenters.set(
          regionalMaintenanceCenters
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((regionalMaintenanceCenter) => regionalMaintenanceCenter.name)
        );
      });
    this.storageService.db.maintenance_centers
      .toArray()
      .then((maintenanceCenters) => {
        this.maintenanceCenters.set(
          maintenanceCenters
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((maintenanceCenter) => maintenanceCenter.name)
        );
      });
  }

  async ngOnInit(): Promise<void> {
    this.initForm();
    this.storageService.ready$.subscribe(() => {
      this.resetRegionalMaintenanceCenter();
    });
  }

  initForm(): void {
    this.sectionForm = this.fb.group({
      internal_id: ['', Validators.required],
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
      last_attachment_set: ['']
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

  onSubmit(): void {
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
      uuid: uuidv4(),
      created_at: now,
      updated_at: now,
      ...this.sectionForm.value
    };

    this.save.emit(section);
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Section created successfully'
    });
    this.hide();
  }

  get formControls() {
    return this.sectionForm.controls;
  }
}
