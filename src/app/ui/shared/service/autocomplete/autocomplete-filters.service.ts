/**
 * Filter a list of objects based on filters that are in the object (only works with strings)
 * @param elements - The objects to filter
 * @param filters - The filters to apply
 * @returns The filtered objects
 */
export const filterElements = <Element extends Record<any, any>>(
  elements: Element[],
  filters: Element
): Element[] => {
  const filteredElements = elements.filter((element) => {
    let found = true;
    Object.entries(filters).forEach(([key]) => {
      const checkedStudyValue = element[key] ?? '';
      const enteredValue = filters[key];
      if (
        typeof enteredValue === 'string' &&
        enteredValue.length > 0 &&
        !checkedStudyValue.toString().includes(enteredValue?.toString() ?? '')
      ) {
        found = false;
      }
    });
    return found;
  });
  return filteredElements;
};
