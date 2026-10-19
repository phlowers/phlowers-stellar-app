import {
  createTangentAimingExteriorForm,
  getDisplayedInputFields,
  syncDisplayedControls
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
});
