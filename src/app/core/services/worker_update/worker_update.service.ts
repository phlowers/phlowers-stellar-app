import { Injectable, isDevMode, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@src/environments/environment';
import { isEqual } from 'lodash';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';

interface AppVersion {
  git_hash: string;
  build_datetime_utc: string;
  version: string;
}

export interface AssetList {
  app_version: AppVersion;
  files: string[];
}

const mockCurrentVersion: AppVersion = {
  git_hash: '0000000000000000000000000000000000000000',
  build_datetime_utc: environment.buildTime,
  version: environment.version
};

const mockLatestVersion: AppVersion = {
  git_hash: '1111111111111111111111111111111111111111',
  build_datetime_utc: '0000-00-00T00:00:00.000000',
  version: '0.0.0'
};

@Injectable({ providedIn: 'root' })
export class UpdateService {
  currentVersion = signal<AppVersion | null>(
    isDevMode() ? mockCurrentVersion : null
  );
  latestVersion = signal<AppVersion | null>(
    isDevMode() ? mockLatestVersion : null
  );
  updateLoading = signal(false);
  needUpdate$ = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly messageService: MessageService,
    private readonly router: Router
  ) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      console.log(`Message from service worker:`, event.data);
      if (event.data.message) {
        switch (event.data.message) {
          case 'worker_ready':
            await this.checkAppVersion();
            break;
          case 'update_complete':
            await this.checkAppVersion();
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Update successful`,
              detail: $localize`The application has been updated to the latest version`
            });
            window.location.href = '/';
            break;
          case 'install_complete':
            await this.checkAppVersion();
            this.updateLoading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: $localize`Install successful`,
              detail: $localize`The application has been installed`
            });
            break;
        }
      }
    });
  }

  async getCurrentVersion() {
    const cache = await caches.open('app-assets');
    const cachedResponse = await cache.match('/app_version');
    if (cachedResponse) {
      const version = await cachedResponse.json();
      console.log('current version is', version);
      return version;
    } else {
      return null;
    }
  }

  async getLatestVersion() {
    const response = await fetch('/assets_list.json');
    if (response) {
      const data: AssetList = await response.json();
      console.log('latest version is', data.app_version);
      return data.app_version;
    } else {
      return null;
    }
  }

  async checkAppVersion() {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();
    if (!currentVersion || !latestVersion) {
      this.needUpdate$.next(false);
      return;
    }
    this.currentVersion.set(currentVersion);
    this.latestVersion.set(latestVersion);
    if (!isEqual(currentVersion, latestVersion)) {
      this.needUpdate$.next(true);
    } else {
      this.needUpdate$.next(false);
    }
    this.messageService.add({
      severity: 'info',
      summary: $localize`App version`,
      detail: $localize`App version checked`
    });
  }

  async update() {
    this.updateLoading.set(true);
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.active?.postMessage({
        type: 'update'
      });
    }
  }

  async install() {
    this.updateLoading.set(true);
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.active?.postMessage({ type: 'install' });
    }
  }
}
