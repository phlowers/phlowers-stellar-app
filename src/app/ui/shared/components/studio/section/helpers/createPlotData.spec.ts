import { createPlotData } from './createPlotData';
import { CreateDataForPlotParams } from './types';

// Mock the createDataObject function
jest.mock('./createPlotDataObject', () => ({
  createDataObject: jest.fn()
}));

import { createDataObject } from './createPlotDataObject';

const mockCreateDataObject = createDataObject as jest.MockedFunction<
  typeof createDataObject
>;

describe('createPlotData', () => {
  const mockParams: CreateDataForPlotParams = {
    litXs: [1, 2, 3, 4, 5],
    litYs: [10, 20, 30, 40, 50],
    litZs: [100, 200, 300, 400, 500],
    litSection: ['phase_1', 'phase_2', 'phase_3', 'garde', 'support'],
    litTypes: ['span', 'span', 'span', 'span', 'support'],
    litSupports: ['support1', 'support2', 'support1', 'support2', 'support1'],
    uniqueSupports: ['support1', 'support2'],
    uniqueSupportsForSupports: ['support1', 'support2'],
    side: 'face'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock return value for createDataObject
    mockCreateDataObject.mockReturnValue([
      {
        x: [10, 30],
        y: [100, 300],
        z: [10, 30],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'solid' },
        textposition: 'inside',
        text: ''
      }
    ]);
  });

  it('should create plot data for all plot objects', () => {
    const result = createPlotData(mockParams);

    // Should call createDataObject for each plot object (6 total)
    expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(6);

    // Verify calls for each plot object type
    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupports,
      name: 'phase_1',
      type: 'span',
      side: mockParams.side
    });

    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupports,
      name: 'phase_2',
      type: 'span',
      side: mockParams.side
    });

    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupports,
      name: 'phase_3',
      type: 'span',
      side: mockParams.side
    });

    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupports,
      name: 'garde',
      type: 'span',
      side: mockParams.side
    });

    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupportsForSupports,
      name: 'support',
      type: 'support',
      side: mockParams.side
    });

    expect(mockCreateDataObject).toHaveBeenCalledWith({
      litXs: mockParams.litXs,
      litYs: mockParams.litYs,
      litZs: mockParams.litZs,
      litSection: mockParams.litSection,
      litTypes: mockParams.litTypes,
      litSupports: mockParams.litSupports,
      uniqueSupports: mockParams.uniqueSupportsForSupports,
      name: 'insulator',
      type: 'insulator',
      side: mockParams.side
    });
  });

  it('should use uniqueSupportsForSupports for support and insulator types', () => {
    createPlotData(mockParams);

    // Check that support and insulator types use uniqueSupportsForSupports
    const supportCall = mockCreateDataObject.mock.calls.find(
      (call) => call[0].type === 'support'
    );
    const insulatorCall = mockCreateDataObject.mock.calls.find(
      (call) => call[0].type === 'insulator'
    );

    expect(supportCall?.[0].uniqueSupports).toBe(
      mockParams.uniqueSupportsForSupports
    );
    expect(insulatorCall?.[0].uniqueSupports).toBe(
      mockParams.uniqueSupportsForSupports
    );
  });

  it('should use uniqueSupports for span types', () => {
    createPlotData(mockParams);

    // Check that span types use uniqueSupports
    const spanCalls = mockCreateDataObject.mock.calls.filter(
      (call) => call[0].type === 'span'
    );

    spanCalls.forEach((call) => {
      expect(call[0].uniqueSupports).toBe(mockParams.uniqueSupports);
    });
  });

  it('should work with profile side', () => {
    const profileParams = { ...mockParams, side: 'profile' as const };
    createPlotData(profileParams);

    expect(mockCreateDataObject).toHaveBeenCalledTimes(6);

    // Verify that side parameter is passed correctly
    mockCreateDataObject.mock.calls.forEach((call) => {
      expect(call[0].side).toBe('profile');
    });
  });

  it('should work with face side', () => {
    const faceParams = { ...mockParams, side: 'face' as const };
    createPlotData(faceParams);

    expect(mockCreateDataObject).toHaveBeenCalledTimes(6);

    // Verify that side parameter is passed correctly
    mockCreateDataObject.mock.calls.forEach((call) => {
      expect(call[0].side).toBe('face');
    });
  });

  it('should handle empty arrays in input parameters', () => {
    const emptyParams: CreateDataForPlotParams = {
      litXs: [],
      litYs: [],
      litZs: [],
      litSection: [],
      litTypes: [],
      litSupports: [],
      uniqueSupports: [],
      uniqueSupportsForSupports: [],
      side: 'face'
    };

    const result = createPlotData(emptyParams);

    expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(6);
  });

  it('should handle null values in coordinate arrays', () => {
    const paramsWithNulls: CreateDataForPlotParams = {
      ...mockParams,
      litXs: [1, null, 3, null, 5],
      litYs: [10, null, 30, null, 50],
      litZs: [100, null, 300, null, 500]
    };

    const result = createPlotData(paramsWithNulls);

    expect(mockCreateDataObject).toHaveBeenCalledTimes(6);
    expect(result).toHaveLength(6);
  });

  it('should return flattened array of Data objects', () => {
    // Mock createDataObject to return multiple Data objects
    mockCreateDataObject.mockReturnValue([
      {
        x: [10, 20],
        y: [100, 200],
        z: [10, 20],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'solid' },
        textposition: 'inside',
        text: ''
      },
      {
        x: [30, 40],
        y: [300, 400],
        z: [30, 40],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'blue', dash: 'solid' },
        textposition: 'inside',
        text: ''
      }
    ]);

    const result = createPlotData(mockParams);

    // Should return 6 * 2 = 12 Data objects (6 plot objects, each returning 2 Data objects)
    expect(result).toHaveLength(12);
    expect(result.every((item) => typeof item === 'object')).toBe(true);
  });

  it('should preserve all input parameters when calling createDataObject', () => {
    createPlotData(mockParams);

    // Verify that all input parameters are preserved
    mockCreateDataObject.mock.calls.forEach((call) => {
      const callParams = call[0];
      expect(callParams.litXs).toEqual(mockParams.litXs);
      expect(callParams.litYs).toEqual(mockParams.litYs);
      expect(callParams.litZs).toEqual(mockParams.litZs);
      expect(callParams.litSection).toEqual(mockParams.litSection);
      expect(callParams.litTypes).toEqual(mockParams.litTypes);
      expect(callParams.litSupports).toEqual(mockParams.litSupports);
      expect(callParams.side).toEqual(mockParams.side);
    });
  });

  it('should handle different uniqueSupports and uniqueSupportsForSupports arrays', () => {
    const differentParams: CreateDataForPlotParams = {
      ...mockParams,
      uniqueSupports: ['support1', 'support2', 'support3'],
      uniqueSupportsForSupports: ['support1', 'support4']
    };

    createPlotData(differentParams);

    // Verify span types use uniqueSupports
    const spanCalls = mockCreateDataObject.mock.calls.filter(
      (call) => call[0].type === 'span'
    );
    spanCalls.forEach((call) => {
      expect(call[0].uniqueSupports).toEqual([
        'support1',
        'support2',
        'support3'
      ]);
    });

    // Verify support and insulator types use uniqueSupportsForSupports
    const supportCalls = mockCreateDataObject.mock.calls.filter(
      (call) => call[0].type === 'support' || call[0].type === 'insulator'
    );
    supportCalls.forEach((call) => {
      expect(call[0].uniqueSupports).toEqual(['support1', 'support4']);
    });
  });
});
