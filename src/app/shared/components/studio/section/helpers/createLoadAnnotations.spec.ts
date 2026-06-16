import { describe, it, expect } from 'vitest';
import type * as Plotly from 'plotly.js-dist-min';
import { createLoadAnnotations, LoadType, SpanLoadAnnotationData } from './createLoadAnnotations';
import { CreatePlotParams } from './createPlot';
import { SpanLoad } from '@shared/domain';
import { LOAD_COLOR, LOAD_ICON, MARKING_ICON } from './createLoadAnnotations.constantes';

type AnnotationWithExtras = Partial<Plotly.Annotations> & {
  z?: number;
  data?: SpanLoadAnnotationData;
};

const makeSpanLoad = (overrides: Partial<SpanLoad> = {}): SpanLoad =>
  ({
    uuid: 'load-1',
    supportUuid: 'support-1',
    type: LoadType.PUNCTUAL,
    loadPosition: 10,
    loadWeight: 100,
    ...overrides
  }) as SpanLoad;

const makePlotParams = (overrides: Partial<CreatePlotParams> = {}): CreatePlotParams => ({
  documentRef: globalThis.document,
  plotId: 'test-plot',
  data: [],
  invert: false,
  view: '3d',
  camera: null,
  side: 'profile',
  spanLoads: [],
  startSupport: 0,
  endSupport: 2,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [],
  distanceType: null,
  litData: {
    loads_coords: {
      0: [5, 3, 10]
    }
  } as unknown as CreatePlotParams['litData'],
  ...overrides
});

describe('createLoadAnnotations', () => {
  describe('empty cases', () => {
    it('should return [] when spanLoads is empty', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [] }));
      expect(result).toEqual([]);
    });

    it('should return [] when all spanLoads entries are null', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [null, null] }));
      expect(result).toEqual([]);
    });

    it('should return [] when spanLoad exists but its index+startSupport is not in loads_coords', () => {
      const result = createLoadAnnotations(
        makePlotParams({
          spanLoads: [makeSpanLoad()],
          startSupport: 5,
          litData: { loads_coords: {} } as unknown as CreatePlotParams['litData']
        })
      );
      expect(result).toEqual([]);
    });
  });

  describe('icon selection by LoadType', () => {
    it('should use LOAD_ICON for LoadType.PUNCTUAL', () => {
      const result = createLoadAnnotations(
        makePlotParams({ spanLoads: [makeSpanLoad({ type: LoadType.PUNCTUAL })] })
      ) as AnnotationWithExtras[];
      expect(result[0].text).toBe(LOAD_ICON);
    });

    it('should use MARKING_ICON for LoadType.MARKING', () => {
      const result = createLoadAnnotations(
        makePlotParams({ spanLoads: [makeSpanLoad({ type: LoadType.MARKING })] })
      ) as AnnotationWithExtras[];
      expect(result[0].text).toBe(MARKING_ICON);
    });
  });

  describe('coordinate mapping — 3D view', () => {
    it('should use coord[0] as x and coord[1] as y in 3D view', () => {
      const result = createLoadAnnotations(
        makePlotParams({ view: '3d', side: 'profile', spanLoads: [makeSpanLoad()] })
      ) as AnnotationWithExtras[];
      // loads_coords[0] = [5, 3, 10] → x=coord[0]=5, y=coord[1]=3
      expect(result[0].x).toBe(5);
      expect(result[0].y).toBe(3);
      expect(result[0].z).toBe(10);
    });
  });

  describe('coordinate mapping — 2D profile view', () => {
    it('should use coord[0] as x and coord[2] as y in 2D profile view', () => {
      const result = createLoadAnnotations(
        makePlotParams({ view: '2d', side: 'profile', spanLoads: [makeSpanLoad()] })
      ) as AnnotationWithExtras[];
      // loads_coords[0] = [5, 3, 10] → x=coord[0]=5, y=coord[2]=10
      expect(result[0].x).toBe(5);
      expect(result[0].y).toBe(10);
      expect(result[0].z).toBe(10);
    });
  });

  describe('coordinate mapping — 2D face view', () => {
    it('should use coord[1] as x and coord[2] as y in 2D face view', () => {
      const result = createLoadAnnotations(
        makePlotParams({ view: '2d', side: 'face', spanLoads: [makeSpanLoad()] })
      ) as AnnotationWithExtras[];
      // loads_coords[0] = [5, 3, 10] → x=coord[1]=3, y=coord[2]=10
      expect(result[0].x).toBe(3);
      expect(result[0].y).toBe(10);
      expect(result[0].z).toBe(10);
    });
  });

  describe('data payload', () => {
    it('should set data.type to spanLoad', () => {
      const result = createLoadAnnotations(
        makePlotParams({ spanLoads: [makeSpanLoad({ supportUuid: 'support-abc' })] })
      ) as AnnotationWithExtras[];
      expect(result[0].data?.type).toBe('spanLoad');
    });

    it('should set data.supportUuid from the spanLoad', () => {
      const result = createLoadAnnotations(
        makePlotParams({ spanLoads: [makeSpanLoad({ supportUuid: 'support-xyz' })] })
      ) as AnnotationWithExtras[];
      expect(result[0].data?.supportUuid).toBe('support-xyz');
    });
  });

  describe('arrow and click style (via buildClickableIconAnnotation)', () => {
    it('should set captureevents to true', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].captureevents).toBe(true);
    });

    it('should set arrowhead to 0', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].arrowhead).toBe(0);
    });

    it('should set arrowwidth to 1', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].arrowwidth).toBe(1);
    });

    it('should set ay to -50', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].ay).toBe(-50);
    });

    it('should set ax to 0', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].ax).toBe(0);
    });

    it('should apply LOAD_COLOR to arrowcolor, bordercolor and font.color', () => {
      const result = createLoadAnnotations(makePlotParams({ spanLoads: [makeSpanLoad()] }));
      expect(result[0].arrowcolor).toBe(LOAD_COLOR);
      expect(result[0].bordercolor).toBe(LOAD_COLOR);
      expect(result[0].font?.color).toBe(LOAD_COLOR);
    });
  });

  describe('startSupport offset', () => {
    it('should offset spanIndex by startSupport to look up loads_coords', () => {
      const result = createLoadAnnotations(
        makePlotParams({
          startSupport: 2,
          spanLoads: [makeSpanLoad()],
          litData: {
            loads_coords: {
              2: [99, 88, 77]
            }
          } as unknown as CreatePlotParams['litData']
        })
      ) as AnnotationWithExtras[];
      // spanIndex=0, startSupport=2 → key=2 → coord[0]=99
      expect(result[0].x).toBe(99);
    });
  });

  describe('multiple spanLoads', () => {
    it('should produce one annotation per non-null spanLoad with a matching coord', () => {
      const result = createLoadAnnotations(
        makePlotParams({
          spanLoads: [makeSpanLoad({ supportUuid: 'a' }), null, makeSpanLoad({ supportUuid: 'b' })],
          litData: {
            loads_coords: {
              0: [1, 2, 3],
              2: [4, 5, 6]
            }
          } as unknown as CreatePlotParams['litData']
        })
      ) as AnnotationWithExtras[];
      expect(result).toHaveLength(2);
      expect(result[0].data?.supportUuid).toBe('a');
      expect(result[1].data?.supportUuid).toBe('b');
    });
  });
});
