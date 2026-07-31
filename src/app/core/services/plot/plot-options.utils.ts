/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Camera } from 'plotly.js-dist-min';
import { PlotOptions } from '@shared/types/plot.types';

/**
 * Checks whether a projection refresh is needed based on changed plot options.
 * @param oldOptions - Previous plot options
 * @param newOptions - New plot options
 * @param loading - Whether a calculation is currently in progress
 * @returns `true` if the projection should be refreshed
 */
export const checkIfProjectionNeedRefresh = (
  oldOptions: PlotOptions,
  newOptions: PlotOptions,
  loading: boolean
): boolean => {
  if (loading) {
    return false;
  }
  const oldView = oldOptions.view;
  const newView = newOptions.view;
  const oldSide = oldOptions.side;
  const newSide = newOptions.side;
  if (oldView !== newView || oldSide !== newSide) {
    return true;
  }
  if (newView !== '2d') {
    return false;
  }
  const oldStartSupport = oldOptions.startSupport;
  const oldEndSupport = oldOptions.endSupport;
  const newStartSupport = newOptions.startSupport;
  const newEndSupport = newOptions.endSupport;
  if (oldStartSupport !== newStartSupport || oldEndSupport !== newEndSupport) {
    return true;
  }
  return false;
};

/**
 * Reads the current 3D camera directly from a Plotly DOM element's internal state,
 * bypassing whatever camera value the Angular signal layer last recorded.
 *
 * The WebGL scene camera (`_scene.getCamera()`) is the source of truth: scroll-wheel
 * zoom only mutates the WebGL camera and never syncs `_fullLayout.scene.camera`, so
 * reading the latter after a wheel zoom returns a stale value — feeding it back into
 * the layout on the next Plotly.react snaps the view back (bug #1032). The layout
 * camera is only used as a fallback before the gl scene exists.
 * @param documentRef - The document to look up the plot element in.
 * @param plotId - The DOM id of the Plotly chart container.
 * @returns The live camera, or `null` if the element or its camera data doesn't exist yet.
 */
export const getLiveCamera = (documentRef: Document, plotId: string): Camera | null => {
  const el = documentRef.getElementById(plotId) as
    | (HTMLElement & {
        _fullLayout?: { scene?: { camera?: Camera; _scene?: { getCamera?: () => Camera } } };
      })
    | null;
  const scene = el?._fullLayout?.scene;
  return scene?._scene?.getCamera?.() ?? scene?.camera ?? null;
};
