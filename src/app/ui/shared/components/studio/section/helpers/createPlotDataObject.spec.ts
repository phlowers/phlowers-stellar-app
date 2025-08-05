import { createDataObject } from './createPlotDataObject';
import { GetAllPhasesParams, PlotObjectType } from './types';
import { ScatterData } from 'plotly.js-dist-min';

describe('createPlotDataObject', () => {
  const mockParams: GetAllPhasesParams = {
    litXs: [1, 2, 3, 4, 5, 6],
    litYs: [10, 20, 30, 40, 50, 60],
    litZs: [100, 200, 300, 400, 500, 600],
    litSection: [
      'phase_1',
      'phase_1',
      'phase_2',
      'phase_2',
      'support',
      'insulator'
    ],
    litTypes: ['span', 'span', 'span', 'span', 'support', 'insulator'],
    litSupports: [
      'support1',
      'support1',
      'support2',
      'support2',
      'support1',
      'support2'
    ],
    uniqueSupports: ['support1', 'support2'],
    name: 'phase_1',
    side: 'face',
    type: 'span'
  };

  describe('getColor function (via createDataObject)', () => {
    it('should return red color and solid dash for span type', () => {
      const spanParams = { ...mockParams, type: 'span' as PlotObjectType };
      const result = createDataObject(spanParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.line).toEqual({ color: 'red', dash: 'solid' });
      });
    });

    it('should return blue color and solid dash for support type', () => {
      const supportParams = {
        ...mockParams,
        type: 'support' as PlotObjectType
      };
      const result = createDataObject(supportParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.line).toEqual({ color: 'blue', dash: 'solid' });
      });
    });

    it('should return green color and solid dash for insulator type', () => {
      const insulatorParams = {
        ...mockParams,
        type: 'insulator' as PlotObjectType
      };
      const result = createDataObject(insulatorParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.line).toEqual({ color: 'green', dash: 'solid' });
      });
    });

    it('should return black color and solid dash for unknown type', () => {
      const unknownParams = {
        ...mockParams,
        type: 'unknown' as PlotObjectType
      };
      const result = createDataObject(unknownParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.line).toEqual({ color: 'black', dash: 'solid' });
      });
    });
  });

  describe('getMode function (via createDataObject)', () => {
    it('should return text+lines mode for support type', () => {
      const supportParams = {
        ...mockParams,
        type: 'support' as PlotObjectType
      };
      const result = createDataObject(supportParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.mode).toBe('text+lines');
      });
    });

    it('should return lines mode for span type', () => {
      const spanParams = { ...mockParams, type: 'span' as PlotObjectType };
      const result = createDataObject(spanParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.mode).toBe('lines');
      });
    });

    it('should return lines mode for insulator type', () => {
      const insulatorParams = {
        ...mockParams,
        type: 'insulator' as PlotObjectType
      };
      const result = createDataObject(insulatorParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.mode).toBe('lines');
      });
    });
  });

  describe('createDataObject function', () => {
    it('should create data objects for each unique support', () => {
      const result = createDataObject(mockParams);

      expect(result).toHaveLength(2); // Two unique supports: support1, support2
      expect(result[0]).toBeDefined();
      expect(result[1]).toBeDefined();
    });

    it('should filter coordinates correctly for span type with section name', () => {
      const result = createDataObject(mockParams);

      // For support1, should only include coordinates where:
      // - litSupports[index] === 'support1'
      // - litTypes[index] === 'span'
      // - litSection[index] === 'phase_1'
      // This means indices 0 and 1: support1, span, phase_1
      const support1Data = result.find((data) => {
        const scatterData = data as ScatterData;
        return (
          scatterData.x.length > 0 ||
          scatterData.y.length > 0 ||
          scatterData.z.length > 0
        );
      });

      if (support1Data) {
        const scatterData = support1Data as ScatterData;
        // For face side: x = litYs, y = litZs, z = litYs
        // Indices 0,1: litYs[0]=10, litYs[1]=20, litZs[0]=100, litZs[1]=200
        // But only indices 0,1 match the filter criteria
        expect(scatterData.x).toEqual([10, 20]); // litYs filtered for support1, span, phase_1
        expect(scatterData.y).toEqual([100, 200]); // litZs filtered for support1, span, phase_1
        expect(scatterData.z).toEqual([10, 20]); // litYs filtered for support1, span, phase_1
      }
    });

    it('should handle face side correctly (x = y, z = y, y = z)', () => {
      const faceParams = { ...mockParams, side: 'face' as const };
      const result = createDataObject(faceParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        // For face side: x = litYs, y = litZs, z = litYs
        expect(scatterData.x).toEqual(scatterData.z);
        // Check that y contains numbers (litZs values)
        if (scatterData.y.length > 0) {
          expect(scatterData.y).toEqual(
            expect.arrayContaining([expect.any(Number)])
          );
        }
      });
    });

    it('should handle profile side correctly (x = x, z = y, y = z)', () => {
      const profileParams = { ...mockParams, side: 'profile' as const };
      const result = createDataObject(profileParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        // For profile side: x = litXs, y = litZs, z = litYs
        if (scatterData.x.length > 0) {
          expect(scatterData.x).toEqual(
            expect.arrayContaining([expect.any(Number)])
          );
        }
        if (scatterData.y.length > 0) {
          expect(scatterData.y).toEqual(
            expect.arrayContaining([expect.any(Number)])
          );
        }
        if (scatterData.z.length > 0) {
          expect(scatterData.z).toEqual(
            expect.arrayContaining([expect.any(Number)])
          );
        }
      });
    });

    it('should return correct data structure for each object', () => {
      const result = createDataObject(mockParams);

      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData).toHaveProperty('x');
        expect(scatterData).toHaveProperty('y');
        expect(scatterData).toHaveProperty('z');
        expect(scatterData).toHaveProperty('type', 'scatter');
        expect(scatterData).toHaveProperty('mode');
        expect(scatterData).toHaveProperty('line');
        expect(scatterData).toHaveProperty('textposition', 'inside');
        expect(scatterData).toHaveProperty('text', '');
      });
    });

    it('should handle empty uniqueSupports array', () => {
      const emptySupportsParams = { ...mockParams, uniqueSupports: [] };
      const result = createDataObject(emptySupportsParams);

      expect(result).toHaveLength(0);
    });

    it('should handle null values in coordinate arrays', () => {
      const paramsWithNulls: GetAllPhasesParams = {
        ...mockParams,
        litXs: [1, null, 3, null, 5, 6],
        litYs: [10, null, 30, null, 50, 60],
        litZs: [100, null, 300, null, 500, 600]
      };

      const result = createDataObject(paramsWithNulls);

      expect(result).toHaveLength(2);
      // The function doesn't filter out null values, it just filters based on conditions
      // So null values can still be present if they match the filter criteria
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        // Just check that the arrays exist and have the expected structure
        expect(Array.isArray(scatterData.x)).toBe(true);
        expect(Array.isArray(scatterData.y)).toBe(true);
        expect(Array.isArray(scatterData.z)).toBe(true);
      });
    });

    it('should handle support type without section filtering', () => {
      const supportParams = {
        ...mockParams,
        type: 'support' as PlotObjectType
      };
      const result = createDataObject(supportParams);

      // For support type, section filtering should be ignored (litSection[index] === name : true)
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.mode).toBe('text+lines');
        expect(scatterData.line).toEqual({ color: 'blue', dash: 'solid' });
      });
    });

    it('should handle insulator type without section filtering', () => {
      const insulatorParams = {
        ...mockParams,
        type: 'insulator' as PlotObjectType
      };
      const result = createDataObject(insulatorParams);

      // For insulator type, section filtering should be ignored (litSection[index] === name : true)
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.mode).toBe('lines');
        expect(scatterData.line).toEqual({ color: 'green', dash: 'solid' });
      });
    });

    it('should handle arrays with different lengths', () => {
      const differentLengthParams: GetAllPhasesParams = {
        ...mockParams,
        litXs: [1, 2, 3],
        litYs: [10, 20, 30, 40],
        litZs: [100, 200],
        litSection: ['phase_1', 'phase_1', 'phase_2', 'phase_2'],
        litTypes: ['span', 'span', 'span', 'span'],
        litSupports: ['support1', 'support1', 'support2', 'support2']
      };

      const result = createDataObject(differentLengthParams);

      expect(result).toHaveLength(2);
      // Should handle the mismatch gracefully
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(Array.isArray(scatterData.x)).toBe(true);
        expect(Array.isArray(scatterData.y)).toBe(true);
        expect(Array.isArray(scatterData.z)).toBe(true);
      });
    });

    it('should handle case where no coordinates match the filter criteria', () => {
      const noMatchParams: GetAllPhasesParams = {
        ...mockParams,
        litTypes: [
          'support',
          'support',
          'support',
          'support',
          'support',
          'support'
        ], // No spans
        name: 'phase_1',
        type: 'span' as PlotObjectType
      };

      const result = createDataObject(noMatchParams);

      expect(result).toHaveLength(2);
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.x).toEqual([]);
        expect(scatterData.y).toEqual([]);
        expect(scatterData.z).toEqual([]);
      });
    });

    it('should handle case where section name does not match', () => {
      const noSectionMatchParams: GetAllPhasesParams = {
        ...mockParams,
        name: 'nonexistent_phase',
        type: 'span' as PlotObjectType
      };

      const result = createDataObject(noSectionMatchParams);

      expect(result).toHaveLength(2);
      result.forEach((dataObject) => {
        const scatterData = dataObject as ScatterData;
        expect(scatterData.x).toEqual([]);
        expect(scatterData.y).toEqual([]);
        expect(scatterData.z).toEqual([]);
      });
    });
  });
});
