/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { OnlineService } from '@services/online/online.service';
import { StorageService } from '@services/storage/storage.service';
import { IconComponent } from './shared/components/atoms/icon/icon.component';
import { ButtonComponent } from './shared/components/atoms/button/button.component';
import { UserService } from '@services/user/user.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { Subscription } from 'rxjs';
import { MaintenanceService } from '@services/maintenance/maintenance.service';
import { LinesService } from '@services/lines/lines.service';
import { CablesService } from '@services/cables/cables.service';
import { ChainsService } from '@services/chains/chains.service';
import { AttachmentService } from '@services/attachment/attachment.service';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

/** Regex pattern for validating email addresses. */
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const modules = [
  RouterModule,
  CommonModule,
  FormsModule,
  ToastModule,
  InputTextModule,
  DialogModule,
  ButtonComponent,
  IconComponent,
  ReactiveFormsModule,
  DividerModule,
  ProgressBarModule
];

/**
 * Root application component.
 *
 * Handles user registration, service worker setup, database initialization,
 * online/offline status monitoring, and application update prompts.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'phlowers-stellar-app';
  userDialog = false;
  isUpdateDialogOpen = false;
  form: FormGroup<{
    email: FormControl<string | null>;
  }>;

  submitted = false;
  private readonly subscriptions = new Subscription();
  constructor(
    private readonly messageService: MessageService,
    private readonly storageService: StorageService,
    private readonly workerService: WorkerPythonService,
    private readonly userService: UserService,
    private readonly onlineService: OnlineService,
    public readonly updateService: UpdateService,
    private readonly maintenanceService: MaintenanceService,
    private readonly linesService: LinesService,
    private readonly cablesService: CablesService,
    private readonly chainsService: ChainsService,
    private readonly attachmentService: AttachmentService
  ) {
    this.form = new FormGroup({
      email: new FormControl<string>('', [Validators.required, Validators.pattern(emailRegex)])
    });
    this.subscriptions.add(
      this.onlineService.online$.subscribe((online) => {
        if (online) {
          this.updateService.checkAppVersion();
        }
      })
    );
    this.subscriptions.add(
      storageService.ready$.subscribe(async (ready) => {
        if (ready) {
          const user = await this.userService.getUser();
          this.userDialog = !user;
          this.setupData();
        }
      })
    );
    this.subscriptions.add(
      this.updateService.needUpdate$.subscribe((needUpdate) => {
        this.isUpdateDialogOpen = needUpdate;
      })
    );
  }

  async setupData() {
    await this.maintenanceService.importFromFile();
    await this.linesService.importFromFile();
    await this.cablesService.importFromFile();
    await this.chainsService.importFromFile();
    await this.attachmentService.importFromFile();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async saveUser() {
    this.submitted = true;
    if (this.form.valid) {
      await this.userService.createUser({ email: this.form.value.email! }).catch((err) => {
        console.error('Error creating user', err);
        this.messageService.add({
          severity: 'error',
          summary: $localize`Error`,
          detail: $localize`Error creating user`,
          life: 3000
        });
      });
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`User info set`,
        life: 3000
      });
      this.userDialog = false;
    }
  }

  async setupWorker() {
    try {
      this.workerService.setup();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      console.error('Error creating database', err);
    }
  }

  ngOnInit() {
    this.setupWorker();
  }

  isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control?.invalid && control.touched;
  }

  onUpdateClick() {
    this.updateService.update();
  }
}
