import { createDistanceAnnotations, createDistanceTraces } from './createDistanceTraces';
import { CreatePlotParams } from './createPlot';
import { Distance, GetSectionOutput } from '@services/worker_python/tasks/types';
import { DataObject } from './createPlotDataObject';

const DISTANCE_COLOR = '#674883';

/**
 * Geometrically consistent mock data:
 *   obstacleCoord:         [120, 0, 5]   — obstacle at x=120, z=5m altitude
 *   linePoint:             [100, 0, 40]  — nearest point on the wire
 *   virtualPointVertical:  [120, 0, 40]  — same x,y as obstacle, same z as linePoint
 *   virtualPointHorizontal:[100, 0, 5]   — same x,y as linePoint, same z as obstacle
 *
 * Vertical pattern:   l=[100,0,40] --dot--> v=[120,0,40] --solid--> o=[120,0,5]
 * Horizontal pattern: l=[100,0,40] --dot--> v=[100,0,5]  --solid--> o=[120,0,5]
 */
const makeDistance = (overrides: Partial<Distance> = {}): Distance => ({
  obstacleUuid: 'obstacle_mock',
  points: [
    {
      pointIndex: 0,
      linePoint: [100, 0, 40],
      virtualPointHorizontal: [100, 0, 5],
      virtualPointVertical: [120, 0, 40],
      distanceDiagonal: 234,
      distanceHorizontal: 20,
      distanceVertical: 35
    }
  ],
  ...overrides
});

const makeLitDataWithObstacles = (): GetSectionOutput => ({
  spans: [],
  insulators: [],
  supports: [],
  L0: [],
  elevation: [],
  line_angle: [],
  vtl_under_chain: [],
  vtl_under_console: [],
  r_under_chain: [],
  r_under_console: [],
  ground_altitude: [],
  load_angle: [],
  displacement: [],
  span_length: [],
  loads_coords: {},
  parameter: [],
  tension_sup: [],
  tension_inf: [],
  horizontal_distance: [],
  arc_length: [],
  T_h: [],
  obstacles: [
    {
      name: 'obstacle_mock',
      points: [[120, 0, 5]]
    }
  ]
});

const basePlotParams = (overrides: Partial<CreatePlotParams> = {}): CreatePlotParams => ({
  plotId: 'plot-1',
  data: [],
  litData: makeLitDataWithObstacles(),
  invert: false,
  view: '3d',
  camera: null,
  side: 'profile',
  spanLoads: [],
  startSupport: 0,
  endSupport: 1,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [makeDistance()],
  distanceType: 'oblique',
  ...overrides
});

describe('createDistanceTraces', () => {
  describe('empty/missing data', () => {
    it('should return empty array when distances is empty', () => {
      const result = createDistanceTraces(basePlotParams({ distances: [] }));
      expect(result).toEqual([]);
    });

    it('should return empty array when distanceType is null', () => {
      const result = createDistanceTraces(basePlotParams({ distanceType: null }));
      expect(result).toEqual([]);
    });

    it('should return empty array when litData has no obstacles', () => {
      const litData = makeLitDataWithObstacles();
      litData.obstacles = [];
      const result = createDistanceTraces(basePlotParams({ litData }));
      expect(result).toEqual([]);
    });

    it('should return empty array when obstacle UUID does not match', () => {
      const result = createDistanceTraces(
        basePlotParams({
          distances: [makeDistance({ obstacleUuid: 'unknown' })]
        })
      );
      expect(result).toEqual([]);
    });

    it('should return empty array when distance has no points', () => {
      const result = createDistanceTraces(
        basePlotParams({
          distances: [makeDistance({ points: [] })]
        })
      );
      expect(result).toEqual([]);
    });
  });

  describe('oblique distance type', () => {
    it('should produce 1 solid line trace and 1 marker trace', () => {
      const result = createDistanceTraces(basePlotParams({ distanceType: 'oblique' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const markers = result.filter((t: DataObject) => t.name === 'distance-marker');
      expect(lines).toHaveLength(1);
      expect(markers).toHaveLength(1);
    });

    it('should draw solid line from linePoint to obstacleCoord', () => {
      // 3D: linePoint=[100,0,40], obstacleCoord=[120,0,5]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'oblique' }));
      const line = result.find((t: DataObject) => t.name === 'distance-line');
      expect((line as Record<string, unknown>).x).toEqual([100, 120]);
      expect((line as Record<string, unknown>).y).toEqual([0, 0]);
      expect((line as Record<string, unknown>).z).toEqual([40, 5]);
      expect(((line as Record<string, unknown>).line as Record<string, unknown>).dash).toBe('solid');
    });
  });

  describe('vertical distance type', () => {
    it('should produce 2 line traces and 1 marker trace', () => {
      const result = createDistanceTraces(basePlotParams({ distanceType: 'vertical' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const markers = result.filter((t: DataObject) => t.name === 'distance-marker');
      expect(lines).toHaveLength(2);
      expect(markers).toHaveLength(1);
    });

    it('should draw dotted line from linePoint to virtualPointVertical', () => {
      // dotted: l=[100,0,40] → v=[120,0,40]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'vertical' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const dotLine = lines.find(
        (l) => ((l as Record<string, unknown>).line as Record<string, unknown>).dash === 'dot'
      );
      expect((dotLine as Record<string, unknown>).x).toEqual([100, 120]);
      expect((dotLine as Record<string, unknown>).z).toEqual([40, 40]);
    });

    it('should draw solid line from virtualPointVertical to obstacleCoord', () => {
      // solid: v=[120,0,40] → o=[120,0,5]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'vertical' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const solidLine = lines.find(
        (l) => ((l as Record<string, unknown>).line as Record<string, unknown>).dash === 'solid'
      );
      expect((solidLine as Record<string, unknown>).x).toEqual([120, 120]);
      expect((solidLine as Record<string, unknown>).z).toEqual([40, 5]);
    });
  });

  describe('horizontal distance type', () => {
    it('should produce 2 line traces and 1 marker trace', () => {
      const result = createDistanceTraces(basePlotParams({ distanceType: 'horizontal' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const markers = result.filter((t: DataObject) => t.name === 'distance-marker');
      expect(lines).toHaveLength(2);
      expect(markers).toHaveLength(1);
    });

    it('should draw dotted line from linePoint to virtualPointHorizontal', () => {
      // dotted: l=[100,0,40] → v=[100,0,5]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'horizontal' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const dotLine = lines.find(
        (l) => ((l as Record<string, unknown>).line as Record<string, unknown>).dash === 'dot'
      );
      expect((dotLine as Record<string, unknown>).x).toEqual([100, 100]);
      expect((dotLine as Record<string, unknown>).z).toEqual([40, 5]);
    });

    it('should draw solid line from virtualPointHorizontal to obstacleCoord', () => {
      // solid: v=[100,0,5] → o=[120,0,5]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'horizontal' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      const solidLine = lines.find(
        (l) => ((l as Record<string, unknown>).line as Record<string, unknown>).dash === 'solid'
      );
      expect((solidLine as Record<string, unknown>).x).toEqual([100, 120]);
      expect((solidLine as Record<string, unknown>).z).toEqual([5, 5]);
    });
  });

  describe('marker trace', () => {
    it('should create a purple 6px circle marker at linePoint', () => {
      const result = createDistanceTraces(basePlotParams());
      const marker = result.find((t: DataObject) => t.name === 'distance-marker');
      expect(marker).toBeDefined();
      expect((marker as Record<string, unknown>).mode).toBe('markers');
      const markerStyle = (marker as Record<string, unknown>).marker as Record<string, unknown>;
      expect(markerStyle.color).toBe(DISTANCE_COLOR);
      expect(markerStyle.size).toBe(6);
      expect(markerStyle.symbol).toBe('circle');
    });

    it('should place marker at linePoint coordinates', () => {
      // linePoint = [100, 0, 40]
      const result = createDistanceTraces(basePlotParams({ view: '3d' }));
      const marker = result.find((t: DataObject) => t.name === 'distance-marker');
      expect((marker as Record<string, unknown>).x).toEqual([100]);
      expect((marker as Record<string, unknown>).y).toEqual([0]);
      expect((marker as Record<string, unknown>).z).toEqual([40]);
    });
  });

  describe('3D coordinate mapping', () => {
    it('should use scatter3d type and include z coordinates', () => {
      const result = createDistanceTraces(basePlotParams({ view: '3d' }));
      for (const trace of result) {
        expect(trace.type).toBe('scatter3d');
        expect((trace as Record<string, unknown>).z).toBeDefined();
      }
    });

    it('should map obstacle [x,y,z] to plotly x,y,z directly', () => {
      // oblique: linePoint=[100,0,40] → obstacleCoord=[120,0,5]
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'oblique' }));
      const line = result.find((t: DataObject) => t.name === 'distance-line');
      expect((line as Record<string, unknown>).x).toEqual([100, 120]);
      expect((line as Record<string, unknown>).y).toEqual([0, 0]);
      expect((line as Record<string, unknown>).z).toEqual([40, 5]);
    });
  });

  describe('2D profile coordinate mapping', () => {
    it('should use scatter type and no z coordinates', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile' }));
      for (const trace of result) {
        expect(trace.type).toBe('scatter');
        expect((trace as Record<string, unknown>).z).toBeUndefined();
      }
    });

    it('should map x to plotly-x and z to plotly-y for oblique', () => {
      // oblique: linePoint=[100,0,40] → obstacleCoord=[120,0,5]
      // profile: plotly-x = coord[0], plotly-y = coord[2]
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' }));
      const line = result.find((t: DataObject) => t.name === 'distance-line');
      expect((line as Record<string, unknown>).x).toEqual([100, 120]);
      expect((line as Record<string, unknown>).y).toEqual([40, 5]);
    });
  });

  describe('2D face coordinate mapping', () => {
    it('should map y to plotly-x and z to plotly-y for oblique', () => {
      // oblique: linePoint=[100,0,40] → obstacleCoord=[120,0,5]
      // face: plotly-x = coord[1], plotly-y = coord[2]
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'face', distanceType: 'oblique' }));
      const line = result.find((t: DataObject) => t.name === 'distance-line');
      expect((line as Record<string, unknown>).x).toEqual([0, 0]);
      expect((line as Record<string, unknown>).y).toEqual([40, 5]);
    });
  });

  describe('2D distance label trace', () => {
    it('should add a distance-label text trace for oblique in 2D', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect(label).toBeDefined();
      expect((label as Record<string, unknown>).mode).toBe('text');
      expect((label as Record<string, unknown>).textposition).toBe('top center');
    });

    it('should place oblique label at midpoint of linePoint → obstacleCoord', () => {
      // mid([100,0,40], [120,0,5]) = [110, 0, 22.5] → profile: x=110, y=22.5
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect((label as Record<string, unknown>).x).toEqual([110]);
      expect((label as Record<string, unknown>).y).toEqual([22.5]);
    });

    it('should show distanceDiagonal for oblique', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect((label as Record<string, unknown>).text).toEqual(['234.00 m']);
    });

    it('should show distanceVertical for vertical', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'vertical' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect((label as Record<string, unknown>).text).toEqual(['35.00 m']);
    });

    it('should show distanceHorizontal for horizontal', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'horizontal' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect((label as Record<string, unknown>).text).toEqual(['20.00 m']);
    });

    it('should use the distance color for the font', () => {
      const result = createDistanceTraces(basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect(((label as Record<string, unknown>).textfont as Record<string, unknown>).color).toBe(DISTANCE_COLOR);
    });

    it('should not produce a distance-label trace in 3D', () => {
      const result = createDistanceTraces(basePlotParams({ view: '3d', distanceType: 'oblique' }));
      const label = result.find((t: DataObject) => t.name === 'distance-label');
      expect(label).toBeUndefined();
    });
  });

  describe('common trace properties', () => {
    it('should hide legend and hover info on all traces', () => {
      const result = createDistanceTraces(basePlotParams());
      for (const trace of result) {
        expect((trace as Record<string, unknown>).showlegend).toBe(false);
        expect((trace as Record<string, unknown>).hoverinfo).toBe('skip');
      }
    });

    it('should use width 4 for both solid and dotted lines', () => {
      const result = createDistanceTraces(basePlotParams({ distanceType: 'vertical' }));
      const lines = result.filter((t: DataObject) => t.name === 'distance-line');
      for (const line of lines) {
        expect(((line as Record<string, unknown>).line as Record<string, unknown>).width).toBe(4);
      }
    });
  });
});

describe('createDistanceAnnotations', () => {
  describe('empty/missing data', () => {
    it('should return empty array when distances is empty', () => {
      expect(createDistanceAnnotations(basePlotParams({ distances: [] }))).toEqual([]);
    });

    it('should return empty array when distanceType is null', () => {
      expect(createDistanceAnnotations(basePlotParams({ distanceType: null }))).toEqual([]);
    });

    it('should return empty array when litData has no obstacles', () => {
      const litData = makeLitDataWithObstacles();
      litData.obstacles = [];
      expect(createDistanceAnnotations(basePlotParams({ litData }))).toEqual([]);
    });
  });

  describe('oblique annotation', () => {
    it('should produce one annotation', () => {
      const result = createDistanceAnnotations(basePlotParams({ distanceType: 'oblique' }));
      expect(result).toHaveLength(1);
    });

    it('should show distanceDiagonal formatted to 2 decimal places', () => {
      const result = createDistanceAnnotations(basePlotParams({ distanceType: 'oblique' }));
      expect(result[0].text).toBe('234.00 m');
    });

    it('should place annotation at midpoint of linePoint → obstacleCoord in 3D', () => {
      // mid([100,0,40], [120,0,5]) = [110, 0, 22.5]
      const result = createDistanceAnnotations(basePlotParams({ view: '3d', distanceType: 'oblique' }));
      expect(result[0].x).toBe(110);
      expect(result[0].y).toBe(0);
      expect((result[0] as Record<string, unknown>).z).toBe(22.5);
    });

    it('should return empty array for 2D (label is rendered as a text trace instead)', () => {
      const result = createDistanceAnnotations(
        basePlotParams({ view: '2d', side: 'profile', distanceType: 'oblique' })
      );
      expect(result).toEqual([]);
    });
  });

  describe('vertical annotation', () => {
    it('should show distanceVertical formatted to 2 decimal places', () => {
      const result = createDistanceAnnotations(basePlotParams({ distanceType: 'vertical' }));
      expect(result[0].text).toBe('35.00 m');
    });

    it('should place annotation at midpoint of virtualPointVertical → obstacleCoord in 3D', () => {
      // mid([120,0,40], [120,0,5]) = [120, 0, 22.5]
      const result = createDistanceAnnotations(basePlotParams({ view: '3d', distanceType: 'vertical' }));
      expect(result[0].x).toBe(120);
      expect(result[0].y).toBe(0);
      expect((result[0] as Record<string, unknown>).z).toBe(22.5);
    });
  });

  describe('horizontal annotation', () => {
    it('should show distanceHorizontal formatted to 2 decimal places', () => {
      const result = createDistanceAnnotations(basePlotParams({ distanceType: 'horizontal' }));
      expect(result[0].text).toBe('20.00 m');
    });

    it('should place annotation at midpoint of virtualPointHorizontal → obstacleCoord in 3D', () => {
      // mid([100,0,5], [120,0,5]) = [110, 0, 5]
      const result = createDistanceAnnotations(basePlotParams({ view: '3d', distanceType: 'horizontal' }));
      expect(result[0].x).toBe(110);
      expect(result[0].y).toBe(0);
      expect((result[0] as Record<string, unknown>).z).toBe(5);
    });
  });

  describe('annotation common properties', () => {
    it('should not show arrow', () => {
      const result = createDistanceAnnotations(basePlotParams());
      expect(result[0].showarrow).toBe(false);
    });

    it('should use the distance color for the font', () => {
      const result = createDistanceAnnotations(basePlotParams());
      expect((result[0].font as Record<string, unknown>).color).toBe(DISTANCE_COLOR);
    });

    it('should not capture events', () => {
      const result = createDistanceAnnotations(basePlotParams());
      expect((result[0] as Record<string, unknown>).captureevents).toBe(false);
    });
  });
});
