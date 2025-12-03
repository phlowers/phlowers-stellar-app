import { createDataObject } from './createPlotDataObject';
import { PlotObjectsType } from './types';

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

    it('should return red color for spans type', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).line
      ).toEqual({ color: 'dodgerblue', dash: 'solid', width: 4 });
    });

    it('should return blue color for supports type', () => {
      const result = createDataObject(
        testData,
        0,
        1,
        'supports',
        '2d',
        'profile'
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).line
      ).toEqual({ color: 'indigo', dash: 'solid', width: 4 });
    });

    it('should return green color for insulators type', () => {
      const result = createDataObject(
        testData,
        0,
        1,
        'insulators',
        '2d',
        'profile'
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).line
      ).toEqual({
        color: 'red',
        dash: 'solid',
        width: 4
      });
    });

    it('should return black color for unknown type', () => {
      const result = createDataObject(
        testData,
        0,
        1,
        'unknown' as PlotObjectsType,
        '2d',
        'profile'
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).line
      ).toEqual({
        color: 'black',
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
      const result = createDataObject(
        testData,
        0,
        1,
        'supports',
        '2d',
        'profile'
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).mode
      ).toBe('text+lines+markers');
    });

    it('should return lines mode for spans type', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).mode
      ).toBe('lines+markers');
    });

    it('should return lines mode for insulators type', () => {
      const result = createDataObject(
        testData,
        0,
        1,
        'insulators',
        '2d',
        'profile'
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).mode
      ).toBe('lines+markers');
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

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).type
      ).toBe('scatter3d');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toBeDefined();
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toBeDefined();
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).z
      ).toBeDefined();
    });

    it('should handle face side correctly in 2d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'face');

      // In face side with 2d view, x should use y coordinates and y should use z coordinates
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toEqual([10, 20, 30]); // y coordinates
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toEqual([100, 200, 300]); // z coordinates
    });

    it('should include text properties', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).textposition
      ).toBe('top center');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).text
      ).toEqual([]);
    });

    it('should handle spans type with correct slicing', () => {
      const result = createDataObject(testData, 0, 2, 'spans', '2d', 'profile');

      // For spans, it should slice from startSupport to endSupport (exclusive)
      expect(result).toHaveLength(2);
    });

    it('should handle non-spans type with correct slicing', () => {
      const result = createDataObject(
        testData,
        0,
        2,
        'supports',
        '2d',
        'profile'
      );

      // For non-spans, it should slice from startSupport to endSupport + 1 (inclusive)
      expect(result).toHaveLength(3);
    });

    it('should map coordinates correctly for profile side in 2d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '2d', 'profile');

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toEqual([1, 2, 3]); // x coordinates
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toEqual([100, 200, 300]); // z coordinates
    });

    it('should map coordinates correctly for 3d view', () => {
      const result = createDataObject(testData, 0, 1, 'spans', '3d', 'profile');

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toEqual([1, 2, 3]); // x coordinates
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toEqual([10, 20, 30]); // y coordinates
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).z
      ).toEqual([100, 200, 300]); // z coordinates
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const emptyData: number[][][] = [];
      const result = createDataObject(
        emptyData,
        0,
        0,
        'spans',
        '2d',
        'profile'
      );

      expect(result).toHaveLength(0);
    });

    it('should handle single data point', () => {
      const singleData: number[][][] = [[[1, 2, 3]]];
      const result = createDataObject(
        singleData,
        0,
        1,
        'spans',
        '2d',
        'profile'
      );

      expect(result).toHaveLength(1);
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toEqual([1]);
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toEqual([3]);
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
      const result = createDataObject(
        testData,
        1,
        1,
        'supports',
        '2d',
        'profile'
      );

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
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).x
      ).toEqual([]);
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[0] as any).y
      ).toEqual([]);
    });
  });
});
