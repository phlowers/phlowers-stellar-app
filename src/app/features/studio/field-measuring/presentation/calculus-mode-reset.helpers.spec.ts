import { describe, it, expect } from 'vitest';
import { createTestMeasureData } from './helpers';
import { resetInactiveCalculusModes } from './calculus-mode-reset.helpers';

const context = { defaultTangentLeftSupport: '11' };

describe('resetInactiveCalculusModes', () => {
  it('resets tangent aiming and pep when papoto is active, keeping papoto data', () => {
    const data = createTestMeasureData({
      calculationMethod: 'papoto',
      HL: 5,
      tangentSpanLength: 400,
      cableTangentAngle: 3,
      calculationType: 'tangente',
      xSight1: 2,
      windSpeed: 7
    });
    const result = resetInactiveCalculusModes(data, 'papoto', context);
    expect(result.HL).toBe(5);
    expect(result.windSpeed).toBe(7);
    expect(result.tangentSpanLength).not.toBe(400);
    expect(result.tangentLeftSupport).toBe('11');
    expect(result.cableTangentAngle).not.toBe(3);
    expect(result.calculationType).toBe('parametre');
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
      exteriorCalculationType: 'tangente',
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
      exteriorCalculationType: 'parametre',
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
