import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

/** Calculus type identifier displayed by the calculus setting radio buttons, per calculation method. */
export const CALCULUS_TYPE_BY_METHOD: Record<FieldMeasure['calculationMethod'], string> = {
  papoto: 'PAPOTO',
  'tangente-aiming': 'TANGENT_AIMING_SUPPORT',
  'tangente-aiming-exterior': 'TANGENT_AIMING_EXTERIOR',
  pep: 'PEP'
};
