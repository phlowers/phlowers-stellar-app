/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';
import { UpdateService } from '../../core/update/update.service';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, TableModule, CardModule, ToastModule],
  template: `
    <p-toast position="top-center"></p-toast>
    <p-card header="App version">
      <table class="my-2" style="width: 100%; border: 1px solid #ccc">
        <thead>
          <tr>
            <th></th>
            <th>Current version</th>
            <th>Latest version</th>
          </tr>
        </thead>
        <tr>
          <td>Build Hash</td>
          <td>{{ updateService.currentVersion?.git_hash }}</td>
          <td>{{ updateService.latestVersion?.git_hash }}</td>
        </tr>
        <tr>
          <td>Build datetime</td>
          <td>{{ updateService.currentVersion?.build_datetime_utc }}</td>
          <td>{{ updateService.latestVersion?.build_datetime_utc }}</td>
        </tr>
      </table>
      <p-button [loading]="updateService.updateLoading" *ngIf="updateService.needUpdate" (click)="updateService.update()">Update to latest version</p-button>
    </p-card>
  `
})
export class AdminComponent implements OnInit {
  constructor(
    public updateService: UpdateService,
    private messageService: MessageService
  ) {}
  updateAvailable = false;
  newVersion = '';

  ngOnInit() {
    this.updateService.sucessFullUpdate.subscribe(() => {
      this.messageService.add({ severity: 'success', summary: 'Update successful', detail: 'The application has been updated to the latest version' });
    });
  }
}
