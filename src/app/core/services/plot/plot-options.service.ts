/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { AspectRatio, ScalingFactors, PlotOptions, PLOT_ID, SelectedDisplayOptions } from '@shared/types/plot.types';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';
import { checkIfProjectionNeedRefresh, getLiveCamera } from './plot-options.utils';

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
  baseState: false,
  transparentBackground: false,
  measurePoints: true
};

/** Service managing plot display options, camera state, and axes norms for the studio section view. */
@Injectable({
  providedIn: 'root'
})
export class PlotOptionsService {
  readonly plotOptions = signal<PlotOptions>({ ...defaultPlotOptions });
  readonly selectedDisplayOptions = signal<SelectedDisplayOptions>({ ...defaultSelectedDisplayOptions });
  readonly scalingFactors = signal<ScalingFactors>({ x: 1, y: 1, z: 1, aspectMode: 'data' });
  readonly aspectRatio = signal<AspectRatio>({ x: 1, y: 1, z: 1 });
  readonly camera = signal<Camera | null>(null);
  /**
   * Camera to restore directly via Plotly.relayout after the first render following
   * a back-navigation. Set by StudioPageComponent on init, cleared by SectionPlotComponent
   * after the restore relayout completes.
   */
  readonly pendingCameraRestore = signal<Camera | null>(null);
  readonly isFreePositioningMode = signal<boolean>(false);
  /** Which feature currently drives free positioning mode, so the studio page can render the matching plot. */
  readonly freePositioningSource = signal<'obstacle' | 'floor' | null>(null);

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
   * See getLiveCamera for why this reads the live WebGL scene rather
   * than relying on the last value written to the camera signal (bug #1032).
   * @returns The current camera or null if the plot element is not yet mounted.
   */
  getCamera(): Camera | null {
    return getLiveCamera(this.document, PLOT_ID);
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

  /** Update the scaling factors signal (user-controlled input from scale-view). */
  setScalingFactors(factors: ScalingFactors): void {
    this.scalingFactors.set(factors);
  }

  /** Update the aspect ratio signal (computed output from Python's getAspectRatio). */
  setAspectRatio(ratio: AspectRatio): void {
    this.aspectRatio.set(ratio);
  }

  /** Turns free positioning mode on for the given feature, or off (source is cleared either way when disabling). */
  setFreePositioningMode(enabled: boolean, source: 'obstacle' | 'floor'): void {
    this.isFreePositioningMode.set(enabled);
    this.freePositioningSource.set(enabled ? source : null);
  }

  /** Reset all view options and camera state to their initial defaults. */
  reset(): void {
    this.plotOptions.set({ ...defaultPlotOptions });
    this.camera.set(null);
    this.pendingCameraRestore.set(null);
    this.isFreePositioningMode.set(false);
    this.freePositioningSource.set(null);
    this.scalingFactors.set({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    this.aspectRatio.set({ x: 1, y: 1, z: 1 });
  }
}
