import { isNil } from 'lodash';
import { Section } from '@shared/domain';

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
