/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { PlotData } from 'plotly.js-dist-min';
import { createShadowDataObject } from './createShadowDataObject';
import { PlotObjectsType } from '@shared/types/plot.types';

describe('createShadowDataObject', () => {
  const testData: number[][][] = [
    [
      [1, 2, 3],
      [4, 5, 6]
    ],
    [
      [7, 8, 9],
      [10, 11, 12]
    ]
  ];

  describe('getShadowLine function', () => {
    it('should return rgba color with opacity for spans type in 2d', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: 'rgba(30,144,255,0.3)',
        dash: 'solid',
        width: 4
      });
    });

    it('should return rgba color with opacity for supports type in 2d', () => {
      const result = createShadowDataObject(testData, 0, 1, 'supports', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: 'rgba(30,144,255,0.3)',
        dash: 'solid',
        width: 4
      });
    });

    it('should return rgba color with opacity for insulators type in 2d', () => {
      const result = createShadowDataObject(testData, 0, 1, 'insulators', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: 'rgba(30,144,255,0.3)',
        dash: 'solid',
        width: 4
      });
    });

    it('should return rgba color with opacity for unknown type in 2d', () => {
      const result = createShadowDataObject(testData, 0, 1, 'unknown' as PlotObjectsType, '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: 'rgba(30,144,255,0.3)',
        dash: 'solid',
        width: 4
      });
    });

    it('should return dodgerblue color for 3d view (opacity at trace level)', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: 'dodgerblue',
        dash: 'solid',
        width: 8
      });
    });
  });

  describe('getShadowMarker function', () => {
    it('should return marker with rgba color for spans type in 2d', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).marker).toEqual({
        size: 5,
        opacity: 0.3,
        color: 'rgba(30,144,255,0.3)'
      });
    });

    it('should return marker with dodgerblue color for 3d view', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).marker).toEqual({
        size: 3,
        opacity: 0.3,
        color: 'dodgerblue'
      });
    });

    it('should set trace-level opacity for 3d view', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).opacity).toBe(0.3);
    });

    it('should not set trace-level opacity for 2d view', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).opacity).toBeUndefined();
    });
  });

  describe('data object properties', () => {
    it('should set hoverinfo to skip', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).hoverinfo).toBe('skip');
    });

    it('should set showlegend to false', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).showlegend).toBe(false);
    });

    it('should set mode to lines+markers', () => {
      const result = createShadowDataObject(testData, 0, 1, 'supports', '2d', 'profile');

      // Shadow traces don't include text, just lines+markers
      expect((result[0] as Partial<PlotData>).mode).toBe('lines+markers');
    });

    it('should set type to scatter3d for 3d view', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).type).toBe('scatter3d');
    });

    it('should set type to scatter for 2d view', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).type).toBe('scatter');
    });
  });

  describe('coordinate mapping', () => {
    const coordData: number[][][] = [
      [
        [1, 10, 100],
        [2, 20, 200]
      ]
    ];

    it('should map coordinates correctly for 3d profile view', () => {
      const result = createShadowDataObject(coordData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).x).toEqual([1, 2]);
      expect((result[0] as Partial<PlotData>).y).toEqual([10, 20]);
      expect((result[0] as Partial<PlotData>).z).toEqual([100, 200]);
    });

    it('should map coordinates correctly for 2d profile view', () => {
      const result = createShadowDataObject(coordData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).x).toEqual([1, 2]);
      expect((result[0] as Partial<PlotData>).y).toEqual([100, 200]); // z becomes y in 2d
      expect((result[0] as Partial<PlotData>).z).toEqual([10, 20]); // y becomes z in 2d
    });

    it('should map coordinates correctly for 2d face view', () => {
      const result = createShadowDataObject(coordData, 0, 1, 'spans', '2d', 'face');

      expect((result[0] as Partial<PlotData>).x).toEqual([10, 20]); // y becomes x for face view
      expect((result[0] as Partial<PlotData>).y).toEqual([100, 200]);
    });
  });

  describe('data slicing', () => {
    const sliceData: number[][][] = [[[1, 1, 1]], [[2, 2, 2]], [[3, 3, 3]], [[4, 4, 4]]];

    it('should slice data correctly for spans based on start and end support', () => {
      const result = createShadowDataObject(sliceData, 1, 3, 'spans', '2d', 'profile');

      expect(result.length).toBe(2); // endSupport - startSupport for spans
    });

    it('should slice data correctly for supports (includes endSupport + 1)', () => {
      const result = createShadowDataObject(sliceData, 1, 3, 'supports', '2d', 'profile');

      expect(result.length).toBe(3); // endSupport - startSupport + 1 for supports
    });

    it('should slice data correctly for insulators (includes endSupport + 1)', () => {
      const result = createShadowDataObject(sliceData, 1, 3, 'insulators', '2d', 'profile');

      expect(result.length).toBe(3);
    });
  });

  describe('width variations by view', () => {
    it('should use width 4 for 2d view (same as normal traces)', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line!.width).toBe(4);
    });

    it('should use width 8 for 3d view (same as normal traces)', () => {
      const result = createShadowDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).line!.width).toBe(8);
    });
  });
});
