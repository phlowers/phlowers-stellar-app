import { FormControl, FormGroup } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { INITIAL_LEFT_SUPPORT_STATE, TANGENT_AIMING_FIELD_RULES } from './tangent-aiming-common.constantes';
import {
  buildCalculationTypeOptions,
  buildSpanSupportOptions,
  calculateTangentAimingMock,
  createNumberControl,
  getCalculatedSpanLength,
  getDefaultLeftSupport,
  getSpanKey,
  getTangentAimingError,
  nextLeftSupportState,
  resolveLeftSupport,
  resolveSpanLeftSupport,
  syncDisplayedControls
} from './tangent-aiming-common.helpers';

describe('tangent-aiming-common helpers', () => {
  it('should build span support options with a 5-character label, empty without a full span', () => {
    const supports = [{ number: 'ABCDEFG' }, { number: null }, { number: 'S3' }];
    expect(buildSpanSupportOptions(supports, [1, 2])).toEqual([
      { label: '-', value: '1' },
      { label: 'S3', value: '2' }
    ]);
    expect(buildSpanSupportOptions(supports, [0, 1])[0]).toEqual({ label: 'ABCDE', value: '0' });
    expect(buildSpanSupportOptions(supports, [])).toEqual([]);
    expect(buildSpanSupportOptions(supports, null)).toEqual([]);
    expect(buildSpanSupportOptions(supports, [2, 7])[1]).toEqual({ label: '-', value: '7' });
  });

  it('should keep the left support when it belongs to the span, else use the departure support', () => {
    expect(resolveLeftSupport('4', [3, 4])).toBe('4');
    expect(resolveLeftSupport('0', [3, 4])).toBe('3');
    expect(resolveLeftSupport(null, [3, 4])).toBe('3');
    expect(resolveLeftSupport('3', null)).toBeNull();
  });

  it('should restore the support remembered for the span on a span change, else use its departure support', () => {
    const memory = { '3-4': '3' };
    const previous = { spanKey: '4-5', leftSupport: '4' };
    expect(resolveSpanLeftSupport('4', [3, 4], previous, memory)).toBe('3');
    expect(resolveSpanLeftSupport('4', [2, 3], previous, memory)).toBe('2');
    expect(resolveSpanLeftSupport('4', [4, 5], previous, memory)).toBe('4');
    expect(resolveSpanLeftSupport('4', [3, 4], null, memory)).toBe('4');
    expect(resolveSpanLeftSupport('3', [3, 4], { spanKey: '3-4', leftSupport: '4' }, memory)).toBe('3');
  });

  it('should build a span key', () => {
    expect(getSpanKey([3, 4])).toBe('3-4');
    expect(getSpanKey(null)).toBe('');
  });

  it('should default the left support to the first support of the span', () => {
    expect(getDefaultLeftSupport([3, 4])).toBe('3');
    expect(getDefaultLeftSupport([])).toBeNull();
    expect(getDefaultLeftSupport(null)).toBeNull();
  });

  describe('nextLeftSupportState', () => {
    it('should keep a valid left support and remember it for the span', () => {
      const { resolved, state } = nextLeftSupportState('4', [3, 4], INITIAL_LEFT_SUPPORT_STATE);
      expect(resolved).toBe('4');
      expect(state).toEqual({ previous: { spanKey: '3-4', leftSupport: '4' }, memory: { '3-4': '4' } });
    });

    it('should restore the remembered left support when coming back to a span', () => {
      const first = nextLeftSupportState('4', [3, 4], INITIAL_LEFT_SUPPORT_STATE).state;
      const second = nextLeftSupportState('4', [5, 6], first);
      expect(second.resolved).toBe('5');
      expect(second.state.memory).toEqual({ '3-4': '4' });
      expect(nextLeftSupportState('5', [3, 4], second.state).resolved).toBe('4');
    });

    it('should not remember an empty left support', () => {
      const { resolved, state } = nextLeftSupportState(null, null, INITIAL_LEFT_SUPPORT_STATE);
      expect(resolved).toBeNull();
      expect(state.memory).toEqual({});
    });
  });

  it('should return the engine span length of the selected span only', () => {
    expect(getCalculatedSpanLength([1, 2], [10, 20, 30])).toBe(20);
    expect(getCalculatedSpanLength([1], [10, 20])).toBeNull();
    expect(getCalculatedSpanLength([5, 6], [10])).toBeNull();
    expect(getCalculatedSpanLength([0, 1], undefined)).toBeNull();
  });

  it('should create a required control validating bounds and decimals', () => {
    const control = createNumberControl(TANGENT_AIMING_FIELD_RULES.parameter);
    expect(control.hasError('required')).toBe(true);
    control.setValue(19);
    expect(control.hasError('min')).toBe(true);
    control.setValue(20.5);
    expect(control.valid).toBe(false);
    control.setValue(100);
    expect(control.valid).toBe(true);
  });

  it('should enable only the displayed controls', () => {
    const form = new FormGroup({ a: new FormControl(1), b: new FormControl(2) });
    syncDisplayedControls(form, ['a']);
    expect(form.controls.a.enabled).toBe(true);
    expect(form.controls.b.disabled).toBe(true);
    syncDisplayedControls(form, ['b']);
    expect(form.controls.a.disabled).toBe(true);
    expect(form.controls.b.enabled).toBe(true);
  });

  describe('translated helpers', () => {
    const transloco = { translate: (key: string) => key } as unknown as TranslocoService;

    it('should build the calculation type options', () => {
      expect(buildCalculationTypeOptions(transloco)).toEqual([
        { label: 'common.parameter-label', value: 'parametre' },
        { label: 'common.calculation-type-tangent', value: 'tangente' }
      ]);
    });

    it('should only report the error of a touched control', () => {
      const control = createNumberControl(TANGENT_AIMING_FIELD_RULES.parameter);
      expect(getTangentAimingError(control, transloco)).toBe('');
      control.markAsTouched();
      expect(getTangentAimingError(control, transloco)).toBe('common.required');
      control.setValue(19);
      expect(getTangentAimingError(control, transloco)).not.toBe('');
      control.setValue(100);
      expect(getTangentAimingError(control, transloco)).toBe('');
    });
  });

  it('should return a constant mock result', async () => {
    const { result, error } = await calculateTangentAimingMock({});
    expect(error).toBeNull();
    expect(result?.checkValidity).toBe(true);
  });
});
