/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OnlineService } from '@core/services/online/online.service';
import { StorageService } from '@core/services/storage/storage.service';
import { IconComponent } from './shared/components/atoms/icon/icon.component';
import { ButtonComponent } from './shared/components/atoms/button/button.component';
import { UserService } from '@core/services/user/user.service';
import { StudiesService } from '../core/services/studies/studies.service';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { InitialConditionService } from '../core/services/initial-conditions/initial-condition.service';
import { UpdateService } from '../core/services/worker_update/worker_update.service';
import { Subscription } from 'rxjs';
import { MaintenanceService } from '../core/services/maintenance/maintenance.service';
import { LinesService } from '../core/services/lines/lines.service';
import { CablesService } from '../core/services/cables/cables.service';
import { ChainsService } from '../core/services/chains/chains.service';

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
  ReactiveFormsModule
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  providers: [
    MessageService,
    StorageService,
    WorkerPythonService,
    OnlineService,
    UserService,
    MaintenanceService,
    LinesService,
    ChainsService,
    StudiesService,
    SectionService,
    InitialConditionService,
    ConfirmationService,
    UpdateService,
    CablesService
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'phlowers-stellar-app';
  userDialog = false;
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
    private readonly updateService: UpdateService,
    private readonly maintenanceService: MaintenanceService,
    private readonly linesService: LinesService,
    private readonly cablesService: CablesService,
    private readonly chainsService: ChainsService
  ) {
    this.form = new FormGroup({
      email: new FormControl<string>('', [
        Validators.required,
        Validators.pattern(emailRegex)
      ])
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
          this.userService.getUser().then((user) => {
            if (!user) {
              this.userDialog = true;
            } else {
              this.userDialog = false;
            }
          });
          this.setupData();
        }
      })
    );
  }

  async setupData() {
    const maintenance = await this.maintenanceService.getMaintenance();
    if (!maintenance || maintenance.length === 0) {
      await this.maintenanceService.importFromFile();
    }
    const lines = await this.linesService.getLinesCount();
    if (!lines) {
      await this.linesService.importFromFile();
    }
    const cables = await this.cablesService.getCables();
    if (!cables || cables.length === 0) {
      await this.cablesService.importFromFile();
    }
    const chains = await this.chainsService.getChains();
    if (!chains || chains.length === 0) {
      await this.chainsService.importFromFile();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async saveUser() {
    this.submitted = true;
    if (this.form.valid) {
      await this.userService
        .createUser({ email: this.form.value.email! })
        .catch((err) => {
          console.error('Error creating user', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'error creating user',
            life: 3000
          });
        });
      this.messageService.add({
        severity: 'success',
        summary: 'Successful',
        detail: 'User info set',
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
}
