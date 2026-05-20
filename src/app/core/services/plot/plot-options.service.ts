/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AxesNorms, PlotOptions, PLOT_ID, SelectedDisplayOptions } from '@shared/types/plot.types';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';
import { checkIfProjectionNeedRefresh } from './plot-options.utils';

/** Default plot options used when initializing or resetting the studio view. */
const defaultPlotOptions: PlotOptions = {
  view: '3d',
  side: 'profile',
  startSupport: 0,
  endSupport: 1,
  invert: false
};

const defaultSelectedDisplayOptions: SelectedDisplayOptions = {
  loads: true,
  baseState: false
};

/** Service managing plot display options, camera state, and axes norms for the studio section view. */
@Injectable({
  providedIn: 'root'
})
export class PlotOptionsService {
  readonly plotOptions = signal<PlotOptions>({ ...defaultPlotOptions });
  readonly selectedDisplayOptions = signal<SelectedDisplayOptions>({ ...defaultSelectedDisplayOptions });
  readonly axesNorms = signal<AxesNorms>({ x: 1, y: 1, z: 1, aspectMode: 'data' });
  readonly baseScaleFactors = signal<AxesNorms>({ x: 1, y: 1, z: 1, aspectMode: 'data' });
  readonly camera = signal<Camera | null>(null);
  readonly isFreePositioningMode = signal<boolean>(false);

  private readonly document = inject(DOCUMENT);

  /**
   * Update plot options, refresh camera state, and trigger projection refresh if needed.
   * @param values Partial plot options to merge with current options.
   * @param loading Getter for the current loading state (used to guard projection refresh).
   * @param onProjectionNeeded Optional callback invoked when a projection refresh is required.
   */
  plotOptionsChange(values: Partial<PlotOptions>, loading: () => boolean, onProjectionNeeded?: () => void): void {
    const oldOptions = untracked(() => this.plotOptions());
    const newOptions = { ...oldOptions, ...values };
    this.plotOptions.set(newOptions);
    if (checkIfProjectionNeedRefresh(oldOptions, newOptions, untracked(loading))) {
      onProjectionNeeded?.();
    }
  }

  /**
   * Read the current camera state directly from the Plotly DOM element.
   * @returns The current camera or null if the plot element is not yet mounted.
   */
  getCamera(): Camera | null {
    const plot = this.document.getElementById(PLOT_ID);
    if (!plot) {
      return null;
    }
    return (plot as HTMLElement & { _fullLayout?: { scene?: { camera?: Camera } } })._fullLayout?.scene?.camera ?? null;
  }

  /**
   * Synchronise the camera signal with the value read from the DOM.
   * Skips the signal write when the value is unchanged (deep-equal).
   * @returns The current camera value.
   */
  refreshCamera(): Camera | null {
    const camera = this.getCamera();
    if (
      !isEqual(
        camera,
        untracked(() => this.camera())
      )
    ) {
      this.camera.set(camera);
    }
    return camera;
  }

  /** Update the axes norms signal. */
  setAxesNorms(norms: AxesNorms): void {
    this.axesNorms.set(norms);
  }

  /** Update the base scale factors used as input for aspect ratio computation. */
  setBaseScaleFactors(norms: AxesNorms): void {
    this.baseScaleFactors.set(norms);
  }

  /** Reset all view options and camera state to their initial defaults. */
  reset(): void {
    this.plotOptions.set({ ...defaultPlotOptions });
    this.camera.set(null);
    this.isFreePositioningMode.set(false);
    this.axesNorms.set({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    this.baseScaleFactors.set({ x: 1, y: 1, z: 1, aspectMode: 'data' });
  }
}
