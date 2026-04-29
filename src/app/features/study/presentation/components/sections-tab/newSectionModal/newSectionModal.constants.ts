import { isNil } from 'lodash';
import { Section } from '@shared/domain';
import { SUPPORT_FIELD_LIMITS } from './manualSection/supportsTable/helpers';

/**
 * Checks whether all mandatory fields in a section are filled.
 * @param section - The section to validate
 * @returns `true` if all required fields have values
 */
export const areAllRequiredFieldsFilled = (section: Section): boolean => {
  const nameCondition = !!section.name.trim();
  const typeCondition = !!section.type;
  const cablesAmountCondition = !!section.cables_amount;
  const cableNameCondition = !!section.cable_name;
  const supportsNumberCondition = !!section.supports.every((support) => !isNil(support.number));
  const supportsSpanLengthCondition = !!section.supports.every(
    (support, index) => !isNil(support.spanLength) || index === section.supports.length - 1
  );
  const supportsSpanAngleCondition = !!section.supports.every((support) => !isNil(support.spanAngle));
  const supportsChainLengthCondition = !!section.supports.every((support) => !isNil(support.chainLength));
  const supportsAttachmentHeightCondition = !!section.supports.every((support) => !isNil(support.attachmentHeight));
  return (
    nameCondition &&
    typeCondition &&
    cablesAmountCondition &&
    cableNameCondition &&
    supportsNumberCondition &&
    supportsSpanLengthCondition &&
    supportsSpanAngleCondition &&
    supportsChainLengthCondition &&
    supportsAttachmentHeightCondition
  );
};

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
