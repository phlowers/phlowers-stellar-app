/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';
import { UpdateService } from '@core/services/worker_update/worker_update.service';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { StorageService } from '@src/app/core/services/storage/storage.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonComponent } from '../../shared/components/atoms/button/button.component';
import { OnlineService } from '@src/app/core/services/online/online.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

const CACHE_NAME = 'app-assets';

@Component({
  selector: 'app-admin',
  standalone: true,
  styleUrls: ['./admin.scss'],
  templateUrl: './admin.html',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    ButtonComponent,
    ProgressSpinnerModule,
    DatePipe
  ]
})
export class AdminComponent {
  constructor(
    public updateService: UpdateService,
    public onlineService: OnlineService,
    private readonly messageService: MessageService,
    private readonly studyService: StudiesService,
    private readonly storageService: StorageService,
    private readonly confirmationService: ConfirmationService
  ) {}
  updateAvailable = false;
  newVersion = '';

  deleteAllStudies() {
    this.confirmationService.confirm({
      message: $localize`Are you sure you want to delete all studies?`,
      accept: () => {
        this.studyService.deleteAllStudies();
        this.messageService.add({
          severity: 'success',
          summary: $localize`Studies deleted`,
          detail: $localize`All studies have been deleted`
        });
      }
    });
  }

  resetDatabase() {
    this.confirmationService.confirm({
      message: $localize`Are you sure you want to reset the database?`,
      accept: () => {
        this.storageService.resetDatabase();
        this.messageService.add({
          severity: 'success',
          summary: $localize`Database reset`,
          detail: $localize`The database has been reset`
        });
      }
    });
  }

  resetApp() {
    this.confirmationService.confirm({
      message: $localize`Are you sure you want to reset the app?`,
      accept: async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('registration is', registration);
          await registration.unregister();
        }
        await caches.delete(CACHE_NAME);
        this.messageService.add({
          severity: 'success',
          summary: $localize`App reset`,
          detail: $localize`The app has been reset`
        });
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    });
  }
}
