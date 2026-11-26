import { PlotData } from 'plotly.js-dist-min';
import { createDataObject, createVirtualSupportDataObjects } from './createPlotDataObject';
import { Support } from '@shared/domain/models/support.model';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { SectionCoords } from '@services/worker_python/tasks/types';

const createMockSupport = (overrides: Partial<Support> = {}): Support => ({
  uuid: 'test-uuid',
  number: null,
  name: null,
  spanLength: null,
  spanAngle: null,
  attachmentSet: null,
  attachmentHeight: null,
  heightBelowConsole: null,
  towerModel: null,
  cableType: null,
  armLength: null,
  chainName: null,
  chainLength: null,
  chainWeight: null,
  chainV: null,
  counterWeight: null,
  supportFootAltitude: null,
  attachmentPosition: null,
  chainSurface: null,
  spanAzimut: null,
  footLongitude: null,
  footLatitude: null,
  ...overrides
});

describe('createPlotDataObject', () => {
  describe('getColor function', () => {
    // Test the getColor function indirectly through createDataObject
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

    it('should return the span color for spans type', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: PlotlyDrawings.span.color,
        dash: 'solid',
        width: 4
      });
    });

    it('should return the support color for supports type', () => {
      const result = createDataObject(testData, 0, 1, 'supports', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: PlotlyDrawings.support.color,
        dash: 'solid',
        width: 4
      });
    });

    it('should return the insulator color for insulators type', () => {
      const result = createDataObject(testData, 0, 1, 'insulators', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).line).toEqual({
        color: PlotlyDrawings.insulator.color,
        dash: 'solid',
        width: 4
      });
    });
  });

  describe('getMode function', () => {
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

    it('should return text+lines mode for supports type', () => {
      const result = createDataObject(testData, 0, 1, 'supports', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).mode).toBe('text+lines+markers');
    });

    it('should return lines mode for spans type', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).mode).toBe('lines+markers');
    });

    it('should return lines mode for insulators type', () => {
      const result = createDataObject(testData, 0, 1, 'insulators', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).mode).toBe('lines+markers');
    });
  });

  describe('getText function', () => {
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

    it('should display support number on the highest point for supports type', () => {
      const supports = [
        createMockSupport({ uuid: 'uuid-1', number: '42' }),
        createMockSupport({ uuid: 'uuid-2', number: '43' })
      ];
      const result = createDataObject(testData, 0, 1, 'supports', '2d', 'profile', supports);

      // Point [4,5,6] has the highest z (6), so index 1 gets the label
      expect((result[0] as Partial<PlotData>).text).toEqual(['', '42']);
    });

    it('should use index-based fallback label when no support is provided', () => {
      const result = createDataObject(testData, 0, 1, 'supports', '2d', 'profile');

      // startSupport=0, index=0 → fallback = '1'
      expect((result[0] as Partial<PlotData>).text).toEqual(['', '1']);
    });

    it('should use index-based fallback label when support number is null', () => {
      const supports = [createMockSupport({ uuid: 'uuid-1', number: null })];
      const result = createDataObject(testData, 0, 0, 'supports', '2d', 'profile', supports);

      // startSupport=0, index=0 → fallback = '1'
      expect((result[0] as Partial<PlotData>).text).toEqual(['', '1']);
    });

    it('should use index-based fallback label when support number is an empty string', () => {
      const supports = [createMockSupport({ uuid: 'uuid-1', number: '' })];
      const result = createDataObject(testData, 0, 0, 'supports', '2d', 'profile', supports);

      // startSupport=0, index=0 → fallback = '1'
      expect((result[0] as Partial<PlotData>).text).toEqual(['', '1']);
    });

    it('should truncate support number longer than 5 characters', () => {
      const supports = [createMockSupport({ uuid: 'uuid-1', number: 'ABCDEFGH' })];
      const result = createDataObject(testData, 0, 0, 'supports', '2d', 'profile', supports);

      expect((result[0] as Partial<PlotData>).text).toEqual(['', 'ABCDE']);
    });

    it('should return empty array for non-supports type', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).text).toEqual([]);
    });
  });

  describe('createDataObject function', () => {
    const testData: number[][][] = [
      [
        [1, 10, 100],
        [2, 20, 200],
        [3, 30, 300]
      ],
      [
        [4, 40, 400],
        [5, 50, 500],
        [6, 60, 600]
      ],
      [
        [7, 70, 700],
        [8, 80, 800],
        [9, 90, 900]
      ]
    ];

    it('should create data objects for each data point group', () => {
      const result = createDataObject(testData, 0, 2, 'spans', '2d', 'profile');

      expect(result).toHaveLength(2); // endSupport - startSupport for spans
      expect(result[0]).toBeDefined();
      expect(result[1]).toBeDefined();
    });

    it('should handle 3d view correctly', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).type).toBe('scatter3d');
      expect((result[0] as Partial<PlotData>).x).toBeDefined();
      expect((result[0] as Partial<PlotData>).y).toBeDefined();
      expect((result[0] as Partial<PlotData>).z).toBeDefined();
    });

    it('should handle face side correctly in 2d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'face');

      // In face side with 2d view, x should use y coordinates and y should use z coordinates
      expect((result[0] as Partial<PlotData>).x).toEqual([10, 20, 30]); // y coordinates
      expect((result[0] as Partial<PlotData>).y).toEqual([100, 200, 300]); // z coordinates
    });

    it('should include text properties', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).textposition).toBe('top center');
      expect((result[0] as Partial<PlotData>).text).toEqual([]);
    });

    it('should handle spans type with correct slicing', () => {
      const result = createDataObject(testData, 0, 2, 'spans', '2d', 'profile');

      // For spans, it should slice from startSupport to endSupport (exclusive)
      expect(result).toHaveLength(2);
    });

    it('should handle non-spans type with correct slicing', () => {
      const result = createDataObject(testData, 0, 2, 'supports', '2d', 'profile');

      // For non-spans, it should slice from startSupport to endSupport + 1 (inclusive)
      expect(result).toHaveLength(3);
    });

    it('should map coordinates correctly for profile side in 2d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect((result[0] as Partial<PlotData>).x).toEqual([1, 2, 3]); // x coordinates
      expect((result[0] as Partial<PlotData>).y).toEqual([100, 200, 300]); // z coordinates
    });

    it('should map coordinates correctly for 3d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect((result[0] as Partial<PlotData>).x).toEqual([1, 2, 3]); // x coordinates
      expect((result[0] as Partial<PlotData>).y).toEqual([10, 20, 30]); // y coordinates
      expect((result[0] as Partial<PlotData>).z).toEqual([100, 200, 300]); // z coordinates
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const emptyData: number[][][] = [];
      const result = createDataObject(emptyData, 0, 0, 'spans', '2d', 'profile');

      expect(result).toHaveLength(0);
    });

    it('should handle single data point', () => {
      const singleData: number[][][] = [[[1, 2, 3]]];
      const result = createDataObject(singleData, 0, 1, 'spans', '2d', 'profile');

      expect(result).toHaveLength(1);
      expect((result[0] as Partial<PlotData>).x).toEqual([1]);
      expect((result[0] as Partial<PlotData>).y).toEqual([3]);
    });

    it('should handle startSupport equal to endSupport for spans', () => {
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
      const result = createDataObject(testData, 1, 1, 'spans', '2d', 'profile');

      expect(result).toHaveLength(0); // endSupport - startSupport = 0
    });

    it('should handle startSupport equal to endSupport for non-spans', () => {
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
      const result = createDataObject(testData, 1, 1, 'supports', '2d', 'profile');

      expect(result).toHaveLength(1); // endSupport + 1 - startSupport = 1
    });

    it('should handle startSupport greater than endSupport', () => {
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
      const result = createDataObject(testData, 2, 1, 'spans', '2d', 'profile');

      expect(result).toHaveLength(0); // Negative slice length
    });

    it('should handle data with empty point arrays', () => {
      const testData: number[][][] = [
        [],
        [
          [1, 2, 3],
          [4, 5, 6]
        ]
      ];
      const result = createDataObject(testData, 0, 2, 'spans', '2d', 'profile');

      expect(result).toHaveLength(2);
      expect((result[0] as Partial<PlotData>).x).toEqual([]);
      expect((result[0] as Partial<PlotData>).y).toEqual([]);
    });
  });

  describe('createVirtualSupportDataObjects function', () => {
    // A manipulation in span 0 then one in span 2: crane from the ground up to the hook, then the sling down to the cable
    const coords = {
      spans: [],
      supports: [],
      insulators: [],
      virtual_supports: [
        [
          [4, 2, 0],
          [4, 2, 35]
        ],
        [
          [24, -1, 0],
          [24, -1, 40]
        ]
      ],
      virtual_insulators: [
        [
          [4, 2, 35],
          [5, 0, 30]
        ],
        [
          [24, -1, 40],
          [25, 0, 30]
        ]
      ],
      virtual_supports_span_indices: [0, 2]
    } as unknown as SectionCoords;

    it('should draw each virtual support in its own style, then its insulator in the insulator style', () => {
      const result = createVirtualSupportDataObjects(coords, 0, 1, '2d', 'profile') as Partial<PlotData>[];

      expect(result.map((data) => data.name)).toEqual(['virtual_supports', 'insulators']);
      expect(result[0].line).toEqual({
        color: PlotlyDrawings.virtualSupport.color,
        dash: 'solid',
        width: PlotlyDrawings.virtualSupport.lineWidth['2d']
      });
      expect(result[0].marker).toEqual({ size: PlotlyDrawings.virtualSupport.markerSize['2d'] });
      expect(result[1].line?.color).toBe(PlotlyDrawings.insulator.color);
    });

    it('should not number the virtual supports nor link them to a real support', () => {
      const [support] = createVirtualSupportDataObjects(coords, 0, 1, '2d', 'profile');

      expect((support as Partial<PlotData>).mode).toBe('lines+markers');
      expect((support as Partial<PlotData>).text).toEqual([]);
      expect(support.supportUuid).toBeUndefined();
    });

    it('should use the 3D style and keep the 3 axes in 3D', () => {
      const [support] = createVirtualSupportDataObjects(coords, 0, 1, '3d', 'profile') as Partial<PlotData>[];

      expect(support.type).toBe('scatter3d');
      expect(support.line?.width).toBe(PlotlyDrawings.virtualSupport.lineWidth['3d']);
      expect([support.x, support.y, support.z]).toEqual([
        [4, 4],
        [2, 2],
        [0, 35]
      ]);
    });

    it('should map the axes of the 2D face view', () => {
      const [support] = createVirtualSupportDataObjects(coords, 0, 1, '2d', 'face') as Partial<PlotData>[];

      expect([support.x, support.y]).toEqual([
        [2, 2],
        [0, 35]
      ]);
    });

    it.each([
      [0, 3, [4, 24]],
      [1, 3, [24]],
      // endSupport belongs to the next span: the span starting there is not displayed
      [0, 2, [4]],
      [1, 2, []]
    ])('should only draw the spans visible from support %i to %i', (startSupport, endSupport, expectedX) => {
      const result = createVirtualSupportDataObjects(coords, startSupport, endSupport, '2d', 'profile');

      expect(
        result.filter((data) => data.name === 'virtual_supports').map((data) => (data as Partial<PlotData>).x?.[0])
      ).toEqual(expectedX);
    });

    it('should draw nothing without a span manipulation', () => {
      expect(
        createVirtualSupportDataObjects({ ...coords, virtual_supports_span_indices: null }, 0, 3, '2d', 'profile')
      ).toEqual([]);
    });
  });
});
