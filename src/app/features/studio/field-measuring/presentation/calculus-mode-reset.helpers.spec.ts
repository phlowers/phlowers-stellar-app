import { describe, it, expect } from 'vitest';
import { createTestMeasureData } from './helpers';
import { applyTangentAimingInteriorDefaults } from './components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.helpers';
import {
  applyActiveTangentAimingDefaults,
  resetInactiveCalculusModes,
  toUnsavedChangesComparable
} from './calculus-mode-reset.helpers';

const context = { defaultTangentLeftSupport: '11' };

describe('resetInactiveCalculusModes', () => {
  it('resets tangent aiming and pep when papoto is active, keeping papoto data', () => {
    const data = createTestMeasureData({
      calculationMethod: 'papoto',
      HL: 5,
      tangentSpanLength: 400,
      cableTangentAngle: 3,
      calculationType: 'parametre',
      xSight1: 2,
      windSpeed: 7
    });
    const result = resetInactiveCalculusModes(data, 'papoto', context);
    expect(result.HL).toBe(5);
    expect(result.windSpeed).toBe(7);
    expect(result.tangentSpanLength).not.toBe(400);
    expect(result.tangentLeftSupport).toBe('11');
    expect(result.cableTangentAngle).not.toBe(3);
    expect(result.calculationType).toBe('tangente');
    expect(result.xSight1).toBeNull();
  });

  it('resets papoto inputs and output when tangent aiming is active', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming',
      HL: 5,
      leftSupport: '1',
      tangentSpanLength: 400,
      outputs: {
        papoto: { parameter: 1 } as never,
        cableTemperature: null,
        parameter15C: null,
        tangentAimingSupport: null,
        tangentAimingExterior: null,
        tangentAimingInterior: null
      }
    });
    const result = resetInactiveCalculusModes(data, 'tangente-aiming', context);
    expect(result.HL).toBeNull();
    expect(result.leftSupport).toBeNull();
    expect(result.outputs.papoto).toBeNull();
    expect(result.tangentSpanLength).toBe(400);
  });

  it('clears tangent aiming output when inactive', () => {
    const data = createTestMeasureData({
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: null,
        tangentAimingSupport: { parameter: 1 } as never,
        tangentAimingExterior: null,
        tangentAimingInterior: null
      }
    });
    const result = resetInactiveCalculusModes(data, 'papoto', context);
    expect(result.outputs.tangentAimingSupport).toBeNull();
  });

  it('resets the exterior inputs and output when inactive, leaving the support mode untouched', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming',
      cableHAccDistance: 9,
      exteriorSpanLength: 400,
      exteriorTangentAngle: 3,
      exteriorCalculationType: 'parametre',
      exteriorLeftSupport: '5',
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: null,
        tangentAimingSupport: { parameter: 2 } as never,
        tangentAimingExterior: { parameter: 1 } as never,
        tangentAimingInterior: null
      }
    });
    const result = resetInactiveCalculusModes(data, 'tangente-aiming', context);
    expect(result).toMatchObject({
      exteriorLeftSupport: '11',
      exteriorSpanLength: 0,
      exteriorTangentAngle: 0,
      exteriorParameter: 20,
      exteriorCalculationType: 'tangente',
      cableHAccDistance: 9
    });
    expect(result.outputs.tangentAimingExterior).toBeNull();
    expect(result.outputs.tangentAimingSupport).toEqual({ parameter: 2 });
  });

  it('resets the interior inputs and output when inactive, leaving the support mode untouched', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming',
      cableHAccDistance: 9,
      interiorSpanLength: 400,
      interiorHAccDistance: 12,
      interiorVerticalAccAngleLeft: 3,
      interiorVerticalAccAngleRight: 4,
      interiorParameter: 900,
      interiorCalculationType: 'parametre',
      interiorLeftSupport: '5',
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: null,
        tangentAimingSupport: { parameter: 2 } as never,
        tangentAimingExterior: null,
        tangentAimingInterior: { parameter: 1 } as never
      }
    });
    const result = resetInactiveCalculusModes(data, 'tangente-aiming', context);
    expect(result).toMatchObject({
      interiorLeftSupport: '11',
      interiorSpanLength: 0,
      interiorHAccDistance: 0,
      interiorVerticalAccAngleLeft: 0,
      interiorVerticalAccAngleRight: 0,
      interiorParameter: 20,
      interiorCalculationType: 'tangente',
      cableHAccDistance: 9
    });
    expect(result.outputs.tangentAimingInterior).toBeNull();
    expect(result.outputs.tangentAimingSupport).toEqual({ parameter: 2 });
  });

  it('keeps the interior mode when active and resets the other modes', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming-interior',
      interiorSpanLength: 400,
      exteriorSpanLength: 300,
      cableParameter: 55
    });
    const result = resetInactiveCalculusModes(data, 'tangente-aiming-interior', context);
    expect(result.interiorSpanLength).toBe(400);
    expect(result.exteriorSpanLength).toBe(0);
    expect(result.cableParameter).not.toBe(55);
  });

  it('keeps the exterior mode when active and does not alter its fields when support is reset', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming-exterior',
      exteriorSpanLength: 400,
      cableParameter: 55
    });
    const result = resetInactiveCalculusModes(data, 'tangente-aiming-exterior', context);
    expect(result.exteriorSpanLength).toBe(400);
    expect(result.cableParameter).not.toBe(55);
  });
});

describe('applyActiveTangentAimingDefaults', () => {
  it('normalizes legacy support data and clears its stale results', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming',
      calculationType: 'parametre',
      cableParameter: 1500,
      tangentLeftSupport: null,
      tangentSpanLength: null,
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: { parameter: 1 } as never,
        tangentAimingSupport: { parameter: 1 } as never,
        tangentAimingExterior: null,
        tangentAimingInterior: null
      },
      exteriorCalculationType: 'parametre'
    });
    const result = applyActiveTangentAimingDefaults(data, '3');
    expect(result).toMatchObject({
      calculationType: 'tangente',
      tangentLeftSupport: '3',
      tangentSpanLength: 0,
      cableTangentAngle: 0,
      cableParameter: 1500,
      exteriorCalculationType: 'parametre',
      exteriorLeftSupport: null
    });
    expect(result.outputs.tangentAimingSupport).toBeNull();
    expect(result.outputs.parameter15C).toBeNull();
  });

  it('normalizes legacy exterior data and clears its stale results', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming-exterior',
      exteriorCalculationType: 'parametre',
      exteriorHAccDistance: 50,
      exteriorLeftSupport: null,
      exteriorSpanLength: null,
      calculationType: 'parametre',
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: { parameter: 1 } as never,
        tangentAimingSupport: null,
        tangentAimingExterior: { parameter: 1 } as never,
        tangentAimingInterior: null
      }
    });
    const result = applyActiveTangentAimingDefaults(data, '3');
    expect(result).toMatchObject({
      exteriorCalculationType: 'tangente',
      exteriorLeftSupport: '3',
      exteriorHAccDistance: 50,
      exteriorTangentAngle: 0,
      calculationType: 'parametre',
      tangentLeftSupport: null
    });
    expect(result.exteriorSpanLength).toBe(0);
    expect(result.outputs.tangentAimingExterior).toBeNull();
    expect(result.outputs.parameter15C).toBeNull();
  });

  it('normalizes legacy interior data and clears its stale results', () => {
    const data = createTestMeasureData({
      calculationMethod: 'tangente-aiming-interior',
      interiorCalculationType: 'parametre',
      interiorLeftSupport: null,
      interiorSpanLength: null,
      outputs: {
        papoto: null,
        cableTemperature: null,
        parameter15C: { parameter: 1 } as never,
        tangentAimingSupport: null,
        tangentAimingExterior: null,
        tangentAimingInterior: { parameter: 1 } as never
      }
    });
    const result = applyActiveTangentAimingDefaults(data, '3');
    expect(result).toMatchObject({
      interiorCalculationType: 'tangente',
      interiorLeftSupport: '3',
      interiorSpanLength: 0,
      interiorTangentAngle: 0,
      exteriorLeftSupport: null
    });
    expect(result.outputs.tangentAimingInterior).toBeNull();
    expect(result.outputs.parameter15C).toBeNull();
  });

  it.each([
    ['tangente-aiming', 'tangentAimingSupport'],
    ['tangente-aiming-exterior', 'tangentAimingExterior'],
    ['tangente-aiming-interior', 'tangentAimingInterior']
  ] as const)('keeps normalized %s data and its results', (calculationMethod, outputField) => {
    const data = applyActiveTangentAimingDefaults(createTestMeasureData({ calculationMethod }), '11');
    const withOutputs = {
      ...data,
      outputs: {
        ...data.outputs,
        parameter15C: { parameter: 1 } as never,
        [outputField]: { parameter: 1 } as never
      }
    };

    const result = applyActiveTangentAimingDefaults(withOutputs, '11');
    expect(result).toBe(withOutputs);
    expect(result.outputs[outputField]).not.toBeNull();
    expect(withOutputs.outputs.parameter15C).not.toBeNull();
  });

  it('returns the measure unchanged for the other methods', () => {
    const data = createTestMeasureData({ calculationMethod: 'papoto', calculationType: 'parametre' });
    expect(applyActiveTangentAimingDefaults(data, '3')).toBe(data);
  });
});

describe('toUnsavedChangesComparable', () => {
  it('ignores the selected method and the defaults it fills in', () => {
    const saved = createTestMeasureData({ calculationMethod: 'papoto', interiorSpanLength: null });
    const switched = applyTangentAimingInteriorDefaults(
      { ...saved, calculationMethod: 'tangente-aiming-interior' },
      '0'
    );
    expect(switched.interiorSpanLength).not.toBeNull();
    expect(toUnsavedChangesComparable(switched, '0')).toEqual(toUnsavedChangesComparable(saved, '0'));
    expect(toUnsavedChangesComparable(saved, '0')).not.toHaveProperty('calculationMethod');
  });

  it('ignores the stale automatic 15°C result but not an input edit', () => {
    const data = createTestMeasureData({ calculationMethod: 'tangente-aiming', tangentSpanLength: 10 });
    const withAuto = {
      ...data,
      outputs: { ...data.outputs, parameter15C: { parameter: 1 } as never }
    };
    expect(toUnsavedChangesComparable(withAuto, '0')).toEqual(toUnsavedChangesComparable(data, '0'));
    expect(toUnsavedChangesComparable({ ...data, tangentSpanLength: 11 }, '0')).not.toEqual(
      toUnsavedChangesComparable(data, '0')
    );
  });
});
