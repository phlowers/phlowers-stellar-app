interface SelectOption {
  name: string;
  code: string;
}

export const sectionTypes: SelectOption[] = [
  { name: $localize`Guard`, code: 'guard' },
  { name: $localize`Phase`, code: 'phase' }
];
