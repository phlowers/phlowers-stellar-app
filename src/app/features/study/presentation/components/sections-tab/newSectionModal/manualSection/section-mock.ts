import { TranslocoService } from '@jsverse/transloco';

/** Option item for a dropdown select with display name and code. */
interface SelectOption {
  name: string;
  code: string;
}

// TODO: adapter l'appelant de createSectionTypes
/** Available section types: guard or phase. */
export const createSectionTypes = (transloco: TranslocoService): SelectOption[] => [
  { name: transloco.translate('sectionMock.guard'), code: 'guard' },
  { name: transloco.translate('sectionMock.phase'), code: 'phase' }
];
