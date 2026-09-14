// Primitives and lists of them are searchable (a tag list matches on any of its tags); a plain
// object stringifies to '[object Object]', which no filter can usefully match.
const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(asText).join(',');
  return '';
};

/**
 * Filter a list of objects based on filters that are in the object (only works with strings)
 * @param elements - The objects to filter
 * @param filters - The filters to apply
 * @returns The filtered objects
 */
export const filterElements = <Element extends Record<string, unknown>>(
  elements: Element[],
  filters: Element
): Element[] => {
  const filteredElements = elements.filter((element) => {
    let found = true;
    Object.entries(filters).forEach(([key]) => {
      const checkedStudyValue = element[key] ?? '';
      const enteredValue = filters[key];
      if (typeof enteredValue === 'boolean') {
        if (enteredValue !== checkedStudyValue) {
          found = false;
        }
      }
      if (
        typeof enteredValue === 'string' &&
        enteredValue.length > 0 &&
        !asText(checkedStudyValue).toLowerCase().includes(enteredValue.trim().toLowerCase())
      ) {
        found = false;
      }
    });
    return found;
  });
  return filteredElements;
};
