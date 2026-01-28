/**
 * Option item for section type selection dropdown.
 * @internal
 */
interface SelectOption {
  /** Display name for the option */
  name: string;
  /** Value code for the option */
  code: string;
}

/**
 * Available section types for manual section creation.
 */
export const sectionTypes: SelectOption[] = [
  { name: $localize`Guard`, code: 'guard' },
  { name: $localize`Phase`, code: 'phase' }
];
