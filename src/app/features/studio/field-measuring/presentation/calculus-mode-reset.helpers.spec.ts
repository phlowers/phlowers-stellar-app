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
        tangentAimingSupport: null
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
        tangentAimingSupport: { parameter: 1 } as never
      }
    });
    const result = resetInactiveCalculusModes(data, 'papoto', context);
    expect(result.outputs.tangentAimingSupport).toBeNull();
  });
});
