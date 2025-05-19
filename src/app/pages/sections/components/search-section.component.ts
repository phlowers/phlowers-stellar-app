/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { Section } from '../../../core/store/database/interfaces/section';
import { StorageService } from '../../../core/store/storage.service';

const newSection = (): Partial<Section> => {
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
    last_attachment_set: ''
  };
};

@Component({
  selector: 'app-search-section',
  template: `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div>
        <div class="flex flex-wrap gap-3 w-full">
          <div>
            <label i18n for="uuid" class="block font-bold mb-3">UUID:</label>
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
            <label i18n for="name" class="block font-bold mb-3">Name:</label>
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
            <label i18n for="createdAt" class="block font-bold mb-3"
              >Created At:</label
            >
            <input
              width="400px"
              id="createdAt"
              type="text"
              pInputText
              [(ngModel)]="sectionToSearch.created_at"
              required
            />
          </div>
          <div>
            <label i18n for="updatedAt" class="block font-bold mb-3"
              >Updated At:</label
            >
            <input
              width="400px"
              id="updatedAt"
              type="text"
              pInputText
              [(ngModel)]="sectionToSearch.updated_at"
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
            <label i18n for="type" class="block font-bold mb-3">Type:</label>
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
            <label i18n for="opticalFibersAmount" class="block font-bold mb-3"
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
            <label i18n for="firstSupportNumber" class="block font-bold mb-3"
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
            <label i18n for="firstAttachmentSet" class="block font-bold mb-3"
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
          <p-button
            i18n-label
            label="Search"
            icon="pi pi-search"
            severity="secondary"
            (onClick)="searchStudies()"
          />
          <p-button
            i18n-label
            label="Reset fields"
            severity="secondary"
            (click)="resetFields()"
          />
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    CommonModule
  ]
})
export class SearchSectionComponent {
  sectionToSearch: Partial<Section> = newSection();
  sections: Section[] = [];
  constructor(private readonly storageService: StorageService) {
    this.sectionToSearch = newSection();
  }

  resetFields() {
    this.sectionToSearch = newSection();
  }

  searchStudies() {
    this.storageService.db.sections.toArray().then((sections) => {
      this.sections = sections.filter((section) => {
        return Object.keys(this.sectionToSearch).every((key) => {
          if (
            this.sectionToSearch[key as keyof Section] === undefined ||
            this.sectionToSearch[key as keyof Section] === ''
          ) {
            return true;
          }
          return (
            section[key as keyof Section] ===
            this.sectionToSearch[key as keyof Section]
          );
        });
      });
    });
  }
}
