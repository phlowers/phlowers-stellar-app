import { Injectable, isDevMode } from '@angular/core';
import { Subject } from 'rxjs';

interface AppVersion {
  git_hash: string;
  build_datetime_utc: string;
}

export interface AssetList {
  app_version: AppVersion;
  files: string[];
}

const mockCurrentVersion: AppVersion = {
  git_hash: '0000000000000000000000000000000000000000',
  build_datetime_utc: '0000-00-00T00:00:00.000000'
};

const mockLatestVersion: AppVersion = {
  git_hash: '1111111111111111111111111111111111111111',
  build_datetime_utc: '0000-00-00T00:00:00.000000'
};

@Injectable({ providedIn: 'root' })
export class UpdateService {
  currentVersion: AppVersion | null = isDevMode() ? mockCurrentVersion : null;
  latestVersion: AppVersion | null = isDevMode() ? mockLatestVersion : null;
  updateLoading = false;
  needUpdate = !!this.latestVersion && !!this.currentVersion && (this.latestVersion?.git_hash !== this.currentVersion?.git_hash || this.latestVersion?.build_datetime_utc !== this.currentVersion?.build_datetime_utc);
  sucessFullUpdate = new Subject<void>();

  constructor() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log(`Message from service worker:`, event.data);
      switch (event.data.message) {
        case 'update_complete':
          this.updateLoading = false;
          this.currentVersion = event.data.current_version;
          this.needUpdate = !!this.latestVersion && (this.latestVersion?.git_hash !== this.currentVersion?.git_hash || this.latestVersion?.build_datetime_utc !== this.currentVersion?.build_datetime_utc);
          this.sucessFullUpdate.next();
          // reload the page to apply the update
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
          break;
        case 'no_new_version':
        case 'new_version':
          this.currentVersion = event.data.current_version;
          this.latestVersion = event.data.latest_version;
          this.needUpdate = !!this.latestVersion && !!this.currentVersion && (this.latestVersion?.git_hash !== this.currentVersion?.git_hash || this.latestVersion?.build_datetime_utc !== this.currentVersion?.build_datetime_utc);
          break;
        case 'install_complete':
          this.currentVersion = event.data.latest_version;
          this.latestVersion = event.data.latest_version;
          this.needUpdate = false;
          break;
      }
    });
  }

  async getAppVersion() {
    try {
      const response = await fetch('/assets_list.json');
      const data: AssetList = await response.json();
      console.log('latest version is', data.app_version);
      this.latestVersion = data.app_version;
    } catch (error) {
      console.error('Error fetching asset list:', error);
    }
    try {
      const cache = await caches.open('app-assets');
      const cachedResponse = await cache.match('/app_version');
      if (cachedResponse) {
        const version = await cachedResponse.json();
        console.log('current version in cache', version);
        this.currentVersion = version;
      } else {
        console.log('no current version in cache');
        this.currentVersion = null;
      }
      this.needUpdate = !!this.latestVersion && !!this.currentVersion && (this.latestVersion?.git_hash !== this.currentVersion?.git_hash || this.latestVersion?.build_datetime_utc !== this.currentVersion?.build_datetime_utc);
    } catch (error) {
      console.error('Error fetching asset list:', error);
    }
  }

  async update() {
    this.updateLoading = true;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.active?.postMessage({
        type: 'update',
        currentVersion: this.currentVersion,
        latestVersion: this.latestVersion
      });
    }
  }
}
