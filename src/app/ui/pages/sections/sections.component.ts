/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SearchSectionModalComponent } from './components/search-section-modal.component';

@Component({
  standalone: true,
  imports: [
    // RouterModule,
    // AvatarModule,
    CommonModule,
    // TableModule,
    FormsModule,
    ButtonModule,
    // RippleModule,
    // ToastModule,
    // ToolbarModule,
    // RatingModule,
    InputTextModule,
    TextareaModule,
    // SelectModule,
    // RadioButtonModule,
    InputNumberModule,
    DialogModule,
    // TagModule,
    // InputIconModule,
    // IconFieldModule,
    // ConfirmDialogModule
    SearchSectionModalComponent
  ],
  template: `
    <div>
      <h1 i18n>Sections</h1>
      <p-button i18n-label label="Search" (click)="search()"></p-button>
    </div>
    <app-search-section-modal
      [(isOpen)]="isSearchSectionModalOpen"
      (isOpenChange)="setIsSearchSectionModalOpen($event)"
    />
  `,
  providers: [MessageService, ConfirmationService]
})
export class SectionsComponent {
  submitted = false;
  isSearchSectionModalOpen = false;

  section = {
    title: '',
    description: ''
  };
  search() {
    this.isSearchSectionModalOpen = true;
  }

  setIsSearchSectionModalOpen(isOpen: boolean) {
    this.isSearchSectionModalOpen = isOpen;
  }
}
