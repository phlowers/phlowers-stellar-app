/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, signal } from '@angular/core';

export interface appWrapperConfig {
  preset?: string;
  primary?: string;
  surface?: string | null;
  darkTheme?: boolean;
  menuMode?: string;
}

interface AppWrapperState {
  staticMenuDesktopInactive?: boolean;
  overlayMenuActive?: boolean;
  configSidebarVisible?: boolean;
  staticMenuMobileActive?: boolean;
  menuHoverActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppWrapperService {
  _config: appWrapperConfig = {
    preset: 'Material',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
  };

  _state: AppWrapperState = {
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false
  };

  appWrapperConfig = signal<appWrapperConfig>(this._config);

  appWrapperState = signal<AppWrapperState>(this._state);

  onMenuToggle() {
    this.appWrapperState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive:
        !this.appWrapperState().staticMenuDesktopInactive
    }));
  }
}
