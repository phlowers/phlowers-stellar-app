import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import {
  applyTangentAimingExteriorDefaults,
  calculateTangentAimingExteriorMock,
  createTangentAimingExteriorForm,
  getDisplayedInputFields,
  isTangentAimingExteriorDataValid,
  resetNonDisplayedExteriorFields,
  syncDisplayedControls,
  toTangentAimingExteriorInputs,
  toTangentAimingExteriorTaskInputs
} from './tangent-aiming-exterior.helpers';
import { TANGENT_AIMING_EXTERIOR_FIELD_RULES } from './tangent-aiming-exterior.constantes';

describe('tangent-aiming-exterior helpers', () => {
  it('should create an invalid form with every control empty', () => {
    const form = createTangentAimingExteriorForm();
    expect(form.valid).toBe(false);
    expect(Object.values(form.getRawValue()).every((value) => value === null)).toBe(true);
  });

  it('should reuse the support rules for both vertical angles', () => {
    expect(TANGENT_AIMING_EXTERIOR_FIELD_RULES.verticalAccAngleLeft).toBe(
      TANGENT_AIMING_EXTERIOR_FIELD_RULES.verticalAccAngleRight
    );
  });

  it('should display the parameter field for the parametre type', () => {
    const fields = getDisplayedInputFields('parametre');
    expect(fields).toContain('parameter');
    expect(fields).not.toContain('tangentAngle');
    expect(fields).toContain('verticalAccAngleRight');
  });

  it('should display the tangent angle field for the tangente type', () => {
    const fields = getDisplayedInputFields('tangente');
    expect(fields).toContain('tangentAngle');
    expect(fields).not.toContain('parameter');
  });

  it('should disable the hidden control and re-enable it when displayed again', () => {
    const form = createTangentAimingExteriorForm();
    syncDisplayedControls(form, 'parametre');
    expect(form.controls.tangentAngle.disabled).toBe(true);
    expect(form.controls.parameter.enabled).toBe(true);
    syncDisplayedControls(form, 'tangente');
    expect(form.controls.parameter.disabled).toBe(true);
    expect(form.controls.tangentAngle.enabled).toBe(true);
  });

  it('should be valid once every displayed control is filled', () => {
    const form = createTangentAimingExteriorForm();
    form.patchValue({
      leftSupport: '0',
      spanLength: 100,
      hAccDistance: 10,
      verticalAccAngleLeft: 5,
      verticalAccAngleRight: 6,
      parameter: 1000
    });
    syncDisplayedControls(form, 'parametre');
    expect(form.valid).toBe(true);
  });

  describe('measure helpers', () => {
    it('should fill empty fields with defaults and keep existing values', () => {
      const data = {
        ...createTestMeasureData(),
        exteriorHAccDistance: 7,
        exteriorParameter: undefined as unknown as null
      };
      expect(applyTangentAimingExteriorDefaults(data, '2')).toMatchObject({
        exteriorLeftSupport: '2',
        exteriorSpanLength: 0,
        exteriorHAccDistance: 7,
        exteriorVerticalAccAngleLeft: 0,
        exteriorVerticalAccAngleRight: 0,
        exteriorParameter: 20,
        exteriorTangentAngle: 0,
        exteriorCalculationType: 'parametre'
      });
    });

    it('should not override an already chosen left support', () => {
      const data = { ...createTestMeasureData(), exteriorLeftSupport: '1' };
      expect(applyTangentAimingExteriorDefaults(data, '2').exteriorLeftSupport).toBe('1');
    });

    it('should not touch the support or papoto fields', () => {
      const data = { ...createTestMeasureData(), cableHAccDistance: 3, tangentLeftSupport: '4' };
      expect(applyTangentAimingExteriorDefaults(data, '2')).toMatchObject({
        cableHAccDistance: 3,
        tangentLeftSupport: '4'
      });
    });

    it('should be valid only when every displayed field is filled and in range', () => {
      const data = applyTangentAimingExteriorDefaults(createTestMeasureData(), '0');
      expect(isTangentAimingExteriorDataValid(data)).toBe(true);
      expect(isTangentAimingExteriorDataValid({ ...data, exteriorLeftSupport: null })).toBe(false);
      expect(isTangentAimingExteriorDataValid({ ...data, exteriorParameter: null })).toBe(false);
    });

    it('should ignore the hidden field for the validity', () => {
      const data = applyTangentAimingExteriorDefaults(createTestMeasureData(), '0');
      expect(isTangentAimingExteriorDataValid({ ...data, exteriorTangentAngle: null })).toBe(true);
      expect(
        isTangentAimingExteriorDataValid({
          ...data,
          exteriorCalculationType: 'tangente',
          exteriorParameter: null
        })
      ).toBe(true);
    });

    it('should clear the field hidden by the calculation type', () => {
      const data = applyTangentAimingExteriorDefaults(createTestMeasureData(), '0');
      expect(resetNonDisplayedExteriorFields(data)).toMatchObject({
        exteriorParameter: 20,
        exteriorTangentAngle: null
      });
      expect(resetNonDisplayedExteriorFields({ ...data, exteriorCalculationType: 'tangente' })).toMatchObject({
        exteriorParameter: null,
        exteriorTangentAngle: 0
      });
    });

    it('should map the measure to the tangent aiming task inputs (device left of the left support)', () => {
      const inputs = toTangentAimingExteriorInputs({
        ...createTestMeasureData(),
        exteriorSpanLength: 400,
        exteriorHAccDistance: 50,
        exteriorVerticalAccAngleLeft: 93.6,
        exteriorVerticalAccAngleRight: 99.3,
        exteriorTangentAngle: 101.4
      });
      expect(toTangentAimingExteriorTaskInputs(inputs)).toEqual({
        angleToCableTangent: 101.4,
        angleToLeftSupport: 93.6,
        angleToRightSupport: 99.3,
        spanLength: 400,
        inputHeight: 0,
        distance: -50
      });
    });

    it('should build the calculation inputs and return the mocked result', async () => {
      const data = applyTangentAimingExteriorDefaults(createTestMeasureData(), '3');
      const inputs = toTangentAimingExteriorInputs(data);
      expect(inputs).toMatchObject({ leftSupport: '3', calculationType: 'parametre', parameter: 20 });
      expect(await calculateTangentAimingExteriorMock(inputs)).toEqual({
        result: { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true },
        error: null
      });
    });
  });
});
