/**
 * Find a duplicate title in a list of titles
 * @param existingTitles - The list of existing titles
 * @param duplicatedTitle - The title to duplicate
 * @returns The duplicate title
 */

export const findDuplicateTitle = (
  existingTitles: string[],
  duplicatedTitle: string
) => {
  const duplicateTitle = duplicatedTitle.replace(/\s*\(Copy\s*\d+\)/, ''); //NOSONAR
  let copyIndex = 1;
  while (existingTitles.includes(`${duplicateTitle} (Copy ${copyIndex})`)) {
    copyIndex++;
  }
  return `${duplicateTitle} (Copy ${copyIndex})`;
};
