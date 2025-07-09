/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { OnlineService } from '@core/services/online/online.service';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import { StorageService } from '@core/services/storage/storage.service';
import { IconComponent } from './shared/components/atoms/icon/icon.component';
import { ButtonComponent } from './shared/components/atoms/button/button.component';

const validateEmail = (email: string): boolean => {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; //NOSONAR

  return emailRegex.exec(String(email).toLowerCase()) !== null;
};

const modules = [
  RouterModule,
  CommonModule,
  FormsModule,
  ToastModule,
  InputTextModule,
  DialogModule,
  ButtonComponent,
  IconComponent
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  providers: [MessageService, StorageService, WorkerService, OnlineService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
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

  constructor(
    private readonly messageService: MessageService,
    private readonly storageService: StorageService,
    private readonly workerService: WorkerService
  ) {
    storageService.ready$.subscribe((ready) => {
      if (ready) {
        this.storageService.db?.users.toArray().then(async (users) => {
          if (users.length !== 1) {
            await this.storageService.db?.users.clear();
            this.userDialog = true;
          } else {
            this.userDialog = false;
          }
        });
      }
    });
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

  async setupWorker() {
    try {
      this.workerService.setupWorker();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      console.error('Error creating database', err);
    }
  }

  ngOnInit() {
    this.setupWorker();
  }
}
