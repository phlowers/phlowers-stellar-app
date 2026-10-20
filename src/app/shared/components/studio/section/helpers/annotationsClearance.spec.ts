/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { CableModification, SpanLoad } from '@shared/domain';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { createCableModificationAnnotations } from './createCableModificationAnnotations';
import { createCutStrandsAnnotations } from './createCutStrandsAnnotations';
import { createLoadAnnotations, LoadType } from './createLoadAnnotations';
import { CreatePlotParams } from './createPlot';

// Vertical extent of an annotation box above the anchor point, in pixels
interface Band {
  bottom: number;
  top: number;
}

// Smallest empty strip wanted between the scissors box and anything stacked below it
const MIN_GAP = 4;

// Half heights of the annotation boxes, in pixels. Measured on the boxes Plotly draws (bounding box of the annotation
// background in Chromium), not worked out from the constants under test: an icon box is its glyph, twice its border
// pad and twice its 1 px border, the label is its text and Plotly's default 1 px pad
const HALF_HEIGHT = { scissors: 13, loadOrCableModificationIcon: 10.5, label: 7.5 };

// The sizes the half heights above were measured with. A change here means measuring the boxes again
const MEASURED_WITH = {
  scissors: { iconSize: 12, borderPad: 6 },
  loadOrCableModificationIcon: { iconSize: 8, borderPad: 6 },
  labelFontSize: 11
};

const around = (center: number, halfHeight: number): Band => ({
  bottom: center - halfHeight,
  top: center + halfHeight
});

// Every annotation sits on this single point, the worst case: a load, a cable modification and a cut strand marking
// sharing the same anchor
const makePlotParams = (view: CreatePlotParams['view']): CreatePlotParams => {
  const cutStrands: RrtsCutStrandsData = {
    spanUuid: 'span-1',
    supportRef: 'LEFT',
    distanceSupportRef: 0,
    cutStrands: [1, 0, 0],
    addMarking: true
  };
  return {
    documentRef: globalThis.document,
    plotId: 'test-plot',
    data: [],
    invert: false,
    view,
    camera: null,
    side: 'profile',
    spanLoads: [{ uuid: 'load-1', supportUuid: 'support-1', type: LoadType.PUNCTUAL } as unknown as SpanLoad],
    startSupport: 0,
    endSupport: 1,
    obstacles: [],
    currentObstacleUuid: null,
    currentObstaclePointIndex: 0,
    distances: [],
    distanceType: null,
    cutStrands,
    spanUuidToIndex: new Map([['span-1', 0]]),
    litData: {
      coords: {
        spans: [
          [
            [0, 0, 0],
            [5, 0, 0],
            [10, 0, 0]
          ]
        ]
      },
      output_parameters: { span_length: [10], loads_coords: { 0: [0, 0, 0] } }
    } as unknown as CreatePlotParams['litData']
  };
};

const cableModification: CableModification = {
  uuid: 'mod-1',
  spanUuid: 'span-1',
  supportRef: 'LEFT',
  modificationType: 'lengthening',
  modifiedLengthCable: 1,
  distanceSupportRef: 0
};

// The annotations stacked above the anchor, as the plot draws them
const stackAt = (view: CreatePlotParams['view']) => {
  const params = makePlotParams(view);
  const [load] = createLoadAnnotations(params);
  const [cableModificationIcon, cableModificationLabel] = createCableModificationAnnotations(
    params,
    [cableModification],
    params.spanUuidToIndex!
  );
  const scissors = createCutStrandsAnnotations(params).at(-1)!;
  return { load, cableModificationIcon, cableModificationLabel, scissors };
};

describe('stacking of the annotations sharing an anchor point', () => {
  it('should measure the boxes with the current sizes', () => {
    const both = (value: number) => ({ '2d': value, '3d': value });
    const { scissors, loadOrCableModificationIcon, labelFontSize } = MEASURED_WITH;

    expect(PlotlyDrawings.cutStrands.iconSize).toEqual(both(scissors.iconSize));
    expect(PlotlyDrawings.cutStrands.borderPad).toEqual(both(scissors.borderPad));
    [PlotlyDrawings.loadPunctual, PlotlyDrawings.loadMarking, PlotlyDrawings.cableModification].forEach((drawing) => {
      expect(drawing.iconSize).toEqual(both(loadOrCableModificationIcon.iconSize));
      expect(drawing.borderPad).toEqual(both(loadOrCableModificationIcon.borderPad));
    });
    expect(PlotlyDrawings.cableModification.label.size).toEqual(both(labelFontSize));
  });

  it.each(['2d', '3d'] as const)(
    `should leave at least ${MIN_GAP} px between the scissors and the load, cable modification and label in %s`,
    (view) => {
      const { load, cableModificationIcon, cableModificationLabel, scissors } = stackAt(view);

      // Icons joined to their anchor by an arrow sit |ay| px above it; the label and the scissors are shifted by yshift
      const scissorsBox = around(scissors.yshift as number, HALF_HEIGHT.scissors);
      const below: Record<string, Band> = {
        load: around(-load.ay!, HALF_HEIGHT.loadOrCableModificationIcon),
        cableModificationIcon: around(-cableModificationIcon.ay!, HALF_HEIGHT.loadOrCableModificationIcon),
        cableModificationLabel: around(cableModificationLabel.yshift as number, HALF_HEIGHT.label)
      };

      Object.entries(below).forEach(([name, band]) => {
        expect(scissorsBox.bottom - band.top, `gap above the ${name}`).toBeGreaterThanOrEqual(MIN_GAP);
      });
    }
  );

  it('should keep the load and the cable modification icons clear of each other', () => {
    const { load, cableModificationIcon } = stackAt('2d');
    const loadBox = around(-load.ay!, HALF_HEIGHT.loadOrCableModificationIcon);
    const modificationBox = around(-cableModificationIcon.ay!, HALF_HEIGHT.loadOrCableModificationIcon);

    expect(modificationBox.bottom - loadBox.top).toBeGreaterThan(0);
  });
});
