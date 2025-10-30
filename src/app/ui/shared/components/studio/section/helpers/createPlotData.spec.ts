import { createPlotData } from './createPlotData';
import { PlotOptions } from './types';
import { createDataObject } from './createPlotDataObject';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';

// Mock the createDataObject function
jest.mock('./createPlotDataObject');
const mockCreateDataObject = createDataObject as jest.MockedFunction<
  typeof createDataObject
>;

describe('createPlotData', () => {
  let mockParams: GetSectionOutput;
  let mockOptions: PlotOptions;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock parameters
    mockParams = {
      supports: [[[1, 2, 3, 4, 5]]],
      insulators: [[[10, 20, 30, 40, 50]]],
      spans: [[[100, 200, 300, 400, 500]]],
      span: [[[1, 2, 3, 4, 5]]],
      support: [[[10, 20, 30, 40, 50]]],
      insulator: [[[100, 200, 300, 400, 500]]]
    };

    mockOptions = {
      view: '2d' as const,
      side: 'profile' as const,
      invert: false,
      startSupport: 0,
      endSupport: 1
    };

    // Setup default mock return for createDataObject
    mockCreateDataObject.mockReturnValue([
      {
        x: [1, 2],
        y: [10, 20],
        z: [100, 200],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'solid' },
        textposition: 'inside',
        text: ''
      }
    ]);
  });

  describe('basic functionality', () => {
    it('should return an array of Data objects', () => {
      const result = createPlotData(mockParams, mockOptions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should call createDataObject for each plot object type', () => {
      createPlotData(mockParams, mockOptions);

      // Should be called 3 times (spans, insulators, supports)
      expect(mockCreateDataObject).toHaveBeenCalledTimes(3);
    });

    it('should flatten the result from createDataObject calls', () => {
      const result = createPlotData(mockParams, mockOptions);

      // Since each createDataObject returns an array, the final result should be flattened
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('plot object types', () => {
    it('should call createDataObject for spans type', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const spansCall = calls.find((call) => call[3] === 'spans');

      expect(spansCall).toBeDefined();
      expect(spansCall![0]).toEqual(mockParams.spans);
      expect(spansCall![1]).toBe(mockOptions.startSupport);
      expect(spansCall![2]).toBe(mockOptions.endSupport);
      expect(spansCall![4]).toBe(mockOptions.view);
      expect(spansCall![5]).toBe(mockOptions.side);
    });

    it('should call createDataObject for insulators type', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const insulatorsCall = calls.find((call) => call[3] === 'insulators');

      expect(insulatorsCall).toBeDefined();
      expect(insulatorsCall![0]).toEqual(mockParams.insulators);
      expect(insulatorsCall![1]).toBe(mockOptions.startSupport);
      expect(insulatorsCall![2]).toBe(mockOptions.endSupport);
      expect(insulatorsCall![4]).toBe(mockOptions.view);
      expect(insulatorsCall![5]).toBe(mockOptions.side);
    });

    it('should call createDataObject for supports type', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const supportsCall = calls.find((call) => call[3] === 'supports');

      expect(supportsCall).toBeDefined();
      expect(supportsCall![0]).toEqual(mockParams.supports);
      expect(supportsCall![1]).toBe(mockOptions.startSupport);
      expect(supportsCall![2]).toBe(mockOptions.endSupport);
      expect(supportsCall![4]).toBe(mockOptions.view);
      expect(supportsCall![5]).toBe(mockOptions.side);
    });
  });

  describe('parameter passing', () => {
    it('should pass correct parameters to createDataObject for spans', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const spansCall = calls.find((call) => call[3] === 'spans');

      expect(spansCall).toBeDefined();
      expect(spansCall![0]).toBe(mockParams.spans);
      expect(spansCall![1]).toBe(mockOptions.startSupport);
      expect(spansCall![2]).toBe(mockOptions.endSupport);
      expect(spansCall![3]).toBe('spans');
      expect(spansCall![4]).toBe(mockOptions.view);
      expect(spansCall![5]).toBe(mockOptions.side);
    });

    it('should pass correct parameters to createDataObject for insulators', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const insulatorsCall = calls.find((call) => call[3] === 'insulators');

      expect(insulatorsCall).toBeDefined();
      expect(insulatorsCall![0]).toBe(mockParams.insulators);
      expect(insulatorsCall![1]).toBe(mockOptions.startSupport);
      expect(insulatorsCall![2]).toBe(mockOptions.endSupport);
      expect(insulatorsCall![3]).toBe('insulators');
      expect(insulatorsCall![4]).toBe(mockOptions.view);
      expect(insulatorsCall![5]).toBe(mockOptions.side);
    });

    it('should pass correct parameters to createDataObject for supports', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const supportsCall = calls.find((call) => call[3] === 'supports');

      expect(supportsCall).toBeDefined();
      expect(supportsCall![0]).toBe(mockParams.supports);
      expect(supportsCall![1]).toBe(mockOptions.startSupport);
      expect(supportsCall![2]).toBe(mockOptions.endSupport);
      expect(supportsCall![3]).toBe('supports');
      expect(supportsCall![4]).toBe(mockOptions.view);
      expect(supportsCall![5]).toBe(mockOptions.side);
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays in input parameters', () => {
      const emptyParams: GetSectionOutput = {
        supports: [],
        insulators: [],
        spans: [],
        span: [],
        support: [],
        insulator: []
      };

      const result = createPlotData(emptyParams, mockOptions);

      expect(Array.isArray(result)).toBe(true);
      expect(mockCreateDataObject).toHaveBeenCalledTimes(3);
    });

    it('should handle different startSupport and endSupport values', () => {
      const customOptions: PlotOptions = {
        ...mockOptions,
        startSupport: 1,
        endSupport: 2
      };

      createPlotData(mockParams, customOptions);

      const calls = mockCreateDataObject.mock.calls;
      calls.forEach((call) => {
        expect(call[1]).toBe(1);
        expect(call[2]).toBe(2);
      });
    });
  });

  describe('3D view handling', () => {
    it('should pass 3d view option correctly', () => {
      const threeDOptions: PlotOptions = {
        ...mockOptions,
        view: '3d'
      };

      createPlotData(mockParams, threeDOptions);

      const calls = mockCreateDataObject.mock.calls;
      calls.forEach((call) => {
        expect(call[4]).toBe('3d');
      });
    });
  });

  describe('side handling', () => {
    it('should pass face side option correctly', () => {
      const faceOptions: PlotOptions = {
        ...mockOptions,
        side: 'face'
      };

      createPlotData(mockParams, faceOptions);

      const calls = mockCreateDataObject.mock.calls;
      calls.forEach((call) => {
        expect(call[5]).toBe('face');
      });
    });
  });

  describe('integration with createDataObject', () => {
    it('should return flattened array from createDataObject calls', () => {
      // Mock createDataObject to return different arrays for different calls
      mockCreateDataObject
        .mockReturnValueOnce([{ type: 'scatter', x: [1], y: [1] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [2], y: [2] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [3], y: [3] }]);

      const result = createPlotData(mockParams, mockOptions);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'scatter', x: [1], y: [1] });
      expect(result[1]).toEqual({ type: 'scatter', x: [2], y: [2] });
      expect(result[2]).toEqual({ type: 'scatter', x: [3], y: [3] });
    });

    it('should handle createDataObject returning empty arrays', () => {
      mockCreateDataObject.mockReturnValue([]);

      const result = createPlotData(mockParams, mockOptions);

      expect(result).toHaveLength(0);
    });
  });
});
