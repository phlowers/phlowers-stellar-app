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
  ViewChild
} from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { DialogModule } from 'primeng/dialog';
import { v4 as uuid } from 'uuid';
import { StorageService } from '../../store/storage.service';
import { Study } from '../../store/database/interfaces/study';
import { CheckboxModule } from 'primeng/checkbox';

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
  selector: 'app-new-study-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    CheckboxModule,
    ToastModule,
    FormsModule,
    InputTextModule
  ],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-dialog
      dismissableMask="true"
      [(visible)]="open"
      [style]="{ width: '450px' }"
      i18n-header
      header="New study"
      [modal]="true"
      (onHide)="hideDialog()"
    >
      <ng-template #content>
        <div class="flex flex-col gap-6">
          <div>
            <label i18n for="title" class="block font-bold mb-3">Title:</label>
            <input
              type="text"
              pInputText
              id="title"
              [(ngModel)]="study.title"
              required
              fluid
            />
            <small i18n class="text-red-500" *ngIf="submitted && !study!.title"
              >Title is required.</small
            >
          </div>
          <div>
            <label i18n for="description" class="block font-bold mb-3"
              >Description:</label
            >
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="study.description"
              required
              rows="3"
              cols="20"
              fluid
            ></textarea>
          </div>
          <div>
            <label i18n for="shareable" class="block font-bold mb-3"
              >Shareable to other users:</label
            >
            <p-checkbox
              id="shareable"
              [binary]="true"
              [(ngModel)]="study.shareable"
              required
              rows="3"
              cols="20"
              fluid
            ></p-checkbox>
          </div>
        </div>
      </ng-template>

      <ng-template #footer>
        <p-button
          i18n-label
          label="Cancel"
          icon="pi pi-times"
          text
          (click)="hideDialog()"
        />
        <p-button
          i18n-label
          label="Save"
          icon="pi pi-check"
          (click)="saveStudy()"
        />
      </ng-template>
    </p-dialog>
  `,
  providers: [MessageService, ConfirmationService]
})
export class NewStudyDialogComponent {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Input() study: Study = newStudy();
  @Input() public saveStudy!: () => void;
  @Input() submitted = false;
  @ViewChild('dt') dt!: Table;

  constructor(
    private readonly messageService: MessageService,
    private readonly storageService: StorageService
  ) {}

  openNew() {
    this.study = newStudy();
    this.submitted = false;
    this.open = true;
    this.openChange.emit(true);
  }

  hideDialog() {
    console.log('hideDialog');
    this.open = false;
    this.submitted = false;
    this.openChange.emit(false);
  }

  createUuid(): string {
    return uuid();
  }
}
