import { createDataObject } from './createPlotDataObject';
import { CreateDataObjectPlotParams, PlotObjectType } from './types';

describe('createPlotDataObject', () => {
  describe('getColor function', () => {
    // Test the getColor function indirectly through createDataObject
    const createTestParams = (
      type: PlotObjectType
    ): CreateDataObjectPlotParams => ({
      litXs: [1, 2, 3],
      litYs: [1, 2, 3],
      litZs: [1, 2, 3],
      litSection: ['section1', 'section2', 'section3'],
      litTypes: [type, type, type],
      litSupports: ['support1', 'support1', 'support1'],
      uniqueSupports: ['support1'],
      name: 'section1',
      type,
      side: 'profile',
      view: '2d'
    });

    it('should return red color for span type', () => {
      const params = createTestParams('span');
      const result = createDataObject(params);

      expect((result[0] as any).line).toEqual({ color: 'red', dash: 'solid' });
    });

    it('should return blue color for support type', () => {
      const params = createTestParams('support');
      const result = createDataObject(params);

      expect((result[0] as any).line).toEqual({ color: 'blue', dash: 'solid' });
    });

    it('should return green color for insulator type', () => {
      const params = createTestParams('insulator');
      const result = createDataObject(params);

      expect((result[0] as any).line).toEqual({
        color: 'green',
        dash: 'solid'
      });
    });

    it('should return black color for unknown type', () => {
      const params = createTestParams('unknown' as PlotObjectType);
      const result = createDataObject(params);

      expect((result[0] as any).line).toEqual({
        color: 'black',
        dash: 'solid'
      });
    });
  });

  describe('getMode function', () => {
    const createTestParams = (
      type: PlotObjectType
    ): CreateDataObjectPlotParams => ({
      litXs: [1, 2, 3],
      litYs: [1, 2, 3],
      litZs: [1, 2, 3],
      litSection: ['section1', 'section2', 'section3'],
      litTypes: [type, type, type],
      litSupports: ['support1', 'support1', 'support1'],
      uniqueSupports: ['support1'],
      name: 'section1',
      type,
      side: 'profile',
      view: '2d'
    });

    it('should return text+lines mode for support type', () => {
      const params = createTestParams('support');
      const result = createDataObject(params);

      expect((result[0] as any).mode).toBe('text+lines');
    });

    it('should return lines mode for span type', () => {
      const params = createTestParams('span');
      const result = createDataObject(params);

      expect((result[0] as any).mode).toBe('lines');
    });

    it('should return lines mode for insulator type', () => {
      const params = createTestParams('insulator');
      const result = createDataObject(params);

      expect((result[0] as any).mode).toBe('lines');
    });
  });

  describe('createDataObject function', () => {
    const baseParams: CreateDataObjectPlotParams = {
      litXs: [1, 2, 3, 4, 5],
      litYs: [10, 20, 30, 40, 50],
      litZs: [100, 200, 300, 400, 500],
      litSection: ['section1', 'section1', 'section2', 'section2', 'section1'],
      litTypes: ['span', 'span', 'support', 'support', 'insulator'],
      litSupports: ['support1', 'support2', 'support1', 'support2', 'support1'],
      uniqueSupports: ['support1', 'support2'],
      name: 'section1',
      type: 'span',
      side: 'profile',
      view: '2d'
    };

    it('should create data objects for each unique support', () => {
      const result = createDataObject(baseParams);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBeDefined();
    });

    it('should handle 3d view correctly', () => {
      const params = { ...baseParams, view: '3d' as const };
      const result = createDataObject(params);

      expect((result[0] as any).type).toBe('scatter3d');
      expect((result[0] as any).x).toBeDefined();
      expect((result[0] as any).y).toBeDefined();
      expect((result[0] as any).z).toBeDefined();
    });

    it('should handle face side correctly in 2d view', () => {
      const params = {
        ...baseParams,
        side: 'face' as const,
        view: '2d' as const
      };
      const result = createDataObject(params);

      // In face side with 2d view, x should use y coordinates and y should use z coordinates
      expect((result[0] as any).x).toEqual([10]); // y coordinates
      expect((result[0] as any).y).toEqual([100]); // z coordinates
    });

    it('should include text properties', () => {
      const result = createDataObject(baseParams);

      expect((result[0] as any).textposition).toBe('inside');
      expect((result[0] as any).text).toBe('');
    });

    it('should handle empty uniqueSupports', () => {
      const params = { ...baseParams, uniqueSupports: [] };
      const result = createDataObject(params);

      expect(result).toHaveLength(0);
    });

    it('should not filter by section for non-span types', () => {
      const params = {
        ...baseParams,
        litTypes: ['support', 'support', 'support'],
        litSection: ['section1', 'section2', 'section1'],
        litSupports: ['support1', 'support1', 'support1'],
        type: 'support' as PlotObjectType,
        name: 'section1'
      };
      const result = createDataObject(params);

      // All support types should be included regardless of section
      expect((result[0] as any).x).toEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle arrays of different lengths gracefully', () => {
      const params: CreateDataObjectPlotParams = {
        litXs: [1, 2],
        litYs: [10, 20, 30], // longer than litXs
        litZs: [100],
        litSection: ['section1', 'section2', 'section3'],
        litTypes: ['span', 'span', 'span'],
        litSupports: ['support1', 'support1', 'support1'],
        uniqueSupports: ['support1'],
        name: 'section1',
        type: 'span',
        side: 'profile',
        view: '2d'
      };

      // Should not throw and should work with the minimum length
      expect(() => createDataObject(params)).not.toThrow();
    });

    it('should handle empty input arrays', () => {
      const params: CreateDataObjectPlotParams = {
        litXs: [],
        litYs: [],
        litZs: [],
        litSection: [],
        litTypes: [],
        litSupports: [],
        uniqueSupports: ['support1'],
        name: 'section1',
        type: 'span',
        side: 'profile',
        view: '2d'
      };

      const result = createDataObject(params);
      expect(result).toHaveLength(1);
      expect((result[0] as any).x).toEqual([]);
      expect((result[0] as any).y).toEqual([]);
    });
  });
});
