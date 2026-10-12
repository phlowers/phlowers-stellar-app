/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { AuthService } from '@services/auth/auth.service';
import { StorageService } from '@services/storage/storage.service';
import { CatalogUpdateService } from '@shared/catalog/services/catalog-update.service';
import { LoggerService } from '@core/services/logger/logger.service';

const modules = [RouterModule, CommonModule, ToastModule, IconComponent];

/**
 * Root application component.
 *
 * Handles catalog CSV setup and the deferred Pyodide worker boot. Application updates run in the background
 * through `AppUpdateService` (started by the app initializer), without any dialog.
 * User authentication is handled by AuthService (OIDC via Apache) and APP_INITIALIZER.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: modules,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'phlowers-stellar-app';

  private readonly storageService = inject(StorageService);
  private readonly workerService = inject(WorkerPythonService);
  private readonly authService = inject(AuthService);
  private readonly catalogUpdateService = inject(CatalogUpdateService);
  private readonly logger = inject(LoggerService);

  /** Guard against repeatedly triggering the catalog orchestrator on every re-render. */
  private readonly catalogUpdateTriggered = signal(false);

  constructor() {
    effect(() => {
      // Catalogs only ever start once the user is authenticated.
      if (!this.authService.currentUser() || untracked(this.catalogUpdateTriggered)) {
        return;
      }
      this.catalogUpdateTriggered.set(true);
      this.catalogUpdateService.updateCatalogsIfNeeded().catch((err) => {
        // Reset the guard so a later effect run (e.g. next auth change) can retry.
        this.catalogUpdateTriggered.set(false);
        this.logger.error('Catalog update failed', err);
      });
    });
  }

  async setupWorker() {
    try {
      this.workerService.setup();
      await this.storageService.setPersistentStorage();
      await this.storageService.createDatabase();
    } catch (err) {
      this.logger.error('Error creating database', err);
    }
  }

  ngOnInit() {
    this.deferHeavyStartupWork();
  }

  /**
   * Defers Pyodide worker boot (numpy/pandas/pydantic wasm wheels) until the
   * browser is idle, so it never competes with the critical rendering path
   * (shell JS/CSS) right after bootstrap. Falls back to a macrotask when
   * `requestIdleCallback` is unavailable (Safari). Catalog updates are
   * handled separately by `CatalogUpdateService`, triggered reactively once
   * the user is authenticated (see constructor).
   */
  private deferHeavyStartupWork(): void {
    const runHeavyStartup = () => {
      this.workerService.setup();
    };

    const idleGlobal = globalThis as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };

    if (typeof idleGlobal.requestIdleCallback === 'function') {
      idleGlobal.requestIdleCallback(runHeavyStartup, { timeout: 2000 });
    } else {
      setTimeout(runHeavyStartup, 0);
    }
  }
}
