/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { OnlineService } from './core/api/services/online.service';
import { WorkerService } from './core/engine/worker/worker.service';
import { StorageService } from './core/store/storage.service';

const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

const modules = [
  MessageModule,
  RouterModule,
  RippleModule,
  CommonModule,
  FormsModule,
  ButtonModule,
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
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  providers: [MessageService, StorageService, WorkerService, OnlineService],
  template: `<router-outlet></router-outlet>
    <p-toast position="top-center"></p-toast>
    <p-dialog [(visible)]="userDialog" [style]="{ width: '450px' }" header="Set your user info" [closable]="false" [modal]="true">
      <ng-template #content>
        <label for="description" class="block font-bold mb-3">Email</label>
        <input type="text" pInputText type="email" #email="ngModel" email name="email" ngModel id="email" [(ngModel)]="user.email" required fluid />
        <!-- <div *ngIf="email.invalid && email.errors" class="alert">{{ console.log(email) }}</div> -->
        <small class="text-red-500" *ngIf="submitted && !email.valid">Email is not valid.</small>
      </ng-template>
      <ng-template #footer>
        <p-button label="Save" icon="pi pi-check" type="submit" (click)="saveUser()" />
      </ng-template>
    </p-dialog>`
})
export class AppComponent implements OnInit {
  title = 'phlowers-stellar-app';
  userDialog = false;
  user: {
    email: string;
  } = {
    email: ''
  };
  submitted = false;
  // pythonWorker: Worker | null = null;

  constructor(
    private messageService: MessageService,
    private storageService: StorageService,
    private workerService: WorkerService
  ) {
    storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.storageService.db?.users.toArray().then(async (users) => {
          if (users.length !== 1) {
            await this.storageService.db?.users.clear();
            this.userDialog = true;
          }
        });
      }
    });
    workerService.ready$.subscribe((ready) => {
      console.log('Worker ready', ready);
    });
    // storageService.createDatabase();
  }

  async saveUser() {
    this.submitted = true;
    if (this.user.email) {
      if (validateEmail(this.user.email)) {
        await this.storageService.db?.users.add({ ...this.user });
        this.userDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'User info set',
          life: 3000
        });
        this.userDialog = false;
      }
    }
  }

  async ngOnInit() {
    try {
      this.workerService.setupWorker();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      console.error('Error creating database', err);
    }
  }
}
