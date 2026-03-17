/** Option item for a dropdown select with display name and code. */
interface SelectOption {
  name: string;
  code: string;
}

/** Available section types: guard or phase. */
export const sectionTypes: SelectOption[] = [
  { name: $localize`Guard`, code: 'guard' },
  { name: $localize`Phase`, code: 'phase' }
];
