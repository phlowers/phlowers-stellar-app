import { TranslocoService } from '@jsverse/transloco';

/** Option item for a dropdown select with display name and code. */
interface SelectOption {
  name: string;
  code: string;
}

/** Available section types: guard or phase. */
export const createSectionTypes = (transloco: TranslocoService): SelectOption[] => [
  { name: transloco.translate('common.section-type.guard'), code: 'guard' },
  { name: transloco.translate('common.section-type.phase'), code: 'phase' }
];
