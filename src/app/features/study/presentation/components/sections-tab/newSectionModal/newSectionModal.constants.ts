import { Section } from '@shared/domain';
import { SUPPORT_FIELD_LIMITS } from './manualSection/supportsTable/helpers';

export const hasSupportsBoundsErrors = (section: Section): boolean => {
  const fields = Object.keys(SUPPORT_FIELD_LIMITS) as (keyof typeof SUPPORT_FIELD_LIMITS)[];
  return section.supports.some((support) =>
    fields.some((field) => {
      const value = (support as unknown as Record<string, unknown>)[field];
      const { min, max } = SUPPORT_FIELD_LIMITS[field];
      return typeof value === 'number' && (value < min || value > max);
    })
  );
};
