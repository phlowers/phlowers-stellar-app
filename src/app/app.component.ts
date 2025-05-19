/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnlineService } from './core/api/services/online.service';
import { WorkerService } from './core/engine/worker/worker.service';
import { StorageService } from './core/store/storage.service';
import { PrimeNgModules } from './primeng.module';
import { MessageService } from 'primeng/api';

const validateEmail = (email: string): boolean => {
  return !!String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    ); //NOSONAR
};

const modules = [RouterModule, CommonModule, FormsModule, PrimeNgModules];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  providers: [MessageService, StorageService, WorkerService, OnlineService],
  templateUrl: './app.component.html'
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
