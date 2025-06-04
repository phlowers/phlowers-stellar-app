/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, signal } from '@angular/core';

export interface LayoutConfig {
  preset?: string;
  primary?: string;
  surface?: string | null;
  darkTheme?: boolean;
  menuMode?: string;
}

interface LayoutState {
  staticMenuDesktopInactive?: boolean;
  overlayMenuActive?: boolean;
  configSidebarVisible?: boolean;
  staticMenuMobileActive?: boolean;
  menuHoverActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  _config: LayoutConfig = {
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
  };

  _state: LayoutState = {
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false
  };

  layoutConfig = signal<LayoutConfig>(this._config);

  layoutState = signal<LayoutState>(this._state);

  onMenuToggle() {
    this.layoutState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive
    }));
  }
}
