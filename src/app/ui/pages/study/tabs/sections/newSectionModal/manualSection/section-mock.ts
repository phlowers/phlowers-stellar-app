interface SelectOption {
  name: string;
  code: string;
}

export const sectionTypes: SelectOption[] = [
  { name: 'Guard', code: 'guard' },
  { name: 'Phase', code: 'phase' }
];
