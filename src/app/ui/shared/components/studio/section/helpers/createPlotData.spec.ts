import { createPlotData } from './createPlotData';
import { CreateDataForPlotParams, PlotOptions } from './types';
import { createDataObject } from './createPlotDataObject';

// Mock the createDataObject function
jest.mock('./createPlotDataObject');
const mockCreateDataObject = createDataObject as jest.MockedFunction<
  typeof createDataObject
>;

// Mock lodash uniq function
jest.mock('lodash', () => ({
  uniq: jest.fn((arr: any[]) => [...new Set(arr)])
}));

describe('createPlotData', () => {
  let mockParams: CreateDataForPlotParams;
  let mockOptions: PlotOptions;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock parameters
    mockParams = {
      litXs: [1, 2, 3, 4, 5],
      litYs: [10, 20, 30, 40, 50],
      litZs: [100, 200, 300, 400, 500],
      litSection: ['phase_1', 'phase_2', 'phase_3', 'garde', 'support'],
      litTypes: ['span', 'span', 'span', 'span', 'support'],
      litSupports: [
        'support_1',
        'support_2',
        'support_1',
        'support_2',
        'support_1'
      ]
    };

    mockOptions = {
      view: '2d' as const,
      side: 'profile' as const,
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

    it('should call createDataObject for each plot object', () => {
      createPlotData(mockParams, mockOptions);

      // Should be called 6 times (phase_1, phase_2, phase_3, garde, support, insulator)
      expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    });

    it('should flatten the result from createDataObject calls', () => {
      const result = createPlotData(mockParams, mockOptions);

      // Since each createDataObject returns an array, the final result should be flattened
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('plot object types', () => {
    it('should handle span type objects correctly', () => {
      createPlotData(mockParams, mockOptions);

      // Check that createDataObject was called for span types
      const calls = mockCreateDataObject.mock.calls;
      const spanCalls = calls.filter((call) => call[0].type === 'span');

      expect(spanCalls.length).toBe(4); // phase_1, phase_2, phase_3, garde
    });

    it('should handle support type objects correctly', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const supportCalls = calls.filter((call) => call[0].type === 'support');

      expect(supportCalls.length).toBe(1);
    });

    it('should handle insulator type objects correctly', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const insulatorCalls = calls.filter(
        (call) => call[0].type === 'insulator'
      );

      expect(insulatorCalls.length).toBe(1);
    });
  });

  describe('support filtering logic', () => {
    it('should use uniqueSupports for span types', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const spanCall = calls.find((call) => call[0].type === 'span');

      expect(spanCall).toBeDefined();
      // With startSupport: 0, endSupport: 1, slice(0, 1) returns ['support_1']
      expect(spanCall![0].uniqueSupports).toEqual(['support_1']);
    });

    it('should use uniqueSupportsForSupports for support and insulator types', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;
      const supportCall = calls.find((call) => call[0].type === 'support');
      const insulatorCall = calls.find((call) => call[0].type === 'insulator');

      expect(supportCall).toBeDefined();
      expect(insulatorCall).toBeDefined();
      // For support/insulator, endSupport + 1 is used, so slice(0, 2) returns ['support_1', 'support_2']
      expect(supportCall![0].uniqueSupports).toEqual([
        'support_1',
        'support_2'
      ]);
      expect(insulatorCall![0].uniqueSupports).toEqual([
        'support_1',
        'support_2'
      ]);
    });

    it('should handle different startSupport and endSupport values', () => {
      const customOptions: PlotOptions = {
        ...mockOptions,
        startSupport: 1,
        endSupport: 2
      };

      createPlotData(mockParams, customOptions);

      const calls = mockCreateDataObject.mock.calls;
      const spanCall = calls.find((call) => call[0].type === 'span');

      expect(spanCall).toBeDefined();
      // Should slice from index 1 to 2
      expect(spanCall![0].uniqueSupports).toEqual(['support_2']);
    });
  });

  describe('parameter passing', () => {
    it('should pass all required parameters to createDataObject', () => {
      createPlotData(mockParams, mockOptions);

      const call = mockCreateDataObject.mock.calls[0];
      const params = call[0];

      expect(params).toMatchObject({
        litXs: mockParams.litXs,
        litYs: mockParams.litYs,
        litZs: mockParams.litZs,
        litSection: mockParams.litSection,
        litTypes: mockParams.litTypes,
        litSupports: mockParams.litSupports,
        side: mockOptions.side,
        view: mockOptions.view
      });
    });

    it('should pass correct name and type for each plot object', () => {
      createPlotData(mockParams, mockOptions);

      const calls = mockCreateDataObject.mock.calls;

      const expectedObjects = [
        { name: 'phase_1', type: 'span' },
        { name: 'phase_2', type: 'span' },
        { name: 'phase_3', type: 'span' },
        { name: 'garde', type: 'span' },
        { name: 'support', type: 'support' },
        { name: 'insulator', type: 'insulator' }
      ];

      expectedObjects.forEach((expected, index) => {
        expect(calls[index][0]).toMatchObject(expected);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays in input parameters', () => {
      const emptyParams: CreateDataForPlotParams = {
        litXs: [],
        litYs: [],
        litZs: [],
        litSection: [],
        litTypes: [],
        litSupports: []
      };

      const result = createPlotData(emptyParams, mockOptions);

      expect(Array.isArray(result)).toBe(true);
      expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    });

    it('should handle null values in coordinate arrays', () => {
      const paramsWithNulls: CreateDataForPlotParams = {
        ...mockParams,
        litXs: [1, null, 3, null, 5],
        litYs: [10, null, 30, null, 50],
        litZs: [100, null, 300, null, 500]
      };

      const result = createPlotData(paramsWithNulls, mockOptions);

      expect(Array.isArray(result)).toBe(true);
      expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    });

    it('should handle single support in litSupports', () => {
      const singleSupportParams: CreateDataForPlotParams = {
        ...mockParams,
        litSupports: [
          'support_1',
          'support_1',
          'support_1',
          'support_1',
          'support_1'
        ]
      };

      const result = createPlotData(singleSupportParams, mockOptions);

      expect(Array.isArray(result)).toBe(true);
      expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
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
        expect(call[0].view).toBe('3d');
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
        expect(call[0].side).toBe('face');
      });
    });
  });

  describe('integration with createDataObject', () => {
    it('should return flattened array from createDataObject calls', () => {
      // Mock createDataObject to return different arrays for different calls
      mockCreateDataObject
        .mockReturnValueOnce([{ type: 'scatter', x: [1], y: [1] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [2], y: [2] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [3], y: [3] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [4], y: [4] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [5], y: [5] }])
        .mockReturnValueOnce([{ type: 'scatter', x: [6], y: [6] }]);

      const result = createPlotData(mockParams, mockOptions);

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ type: 'scatter', x: [1], y: [1] });
      expect(result[5]).toEqual({ type: 'scatter', x: [6], y: [6] });
    });

    it('should handle createDataObject returning empty arrays', () => {
      mockCreateDataObject.mockReturnValue([]);

      const result = createPlotData(mockParams, mockOptions);

      expect(result).toHaveLength(0);
    });
  });
});
