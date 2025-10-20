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
  const copySuffix = $localize`Copy`;
  while (
    existingTitles.includes(`${duplicateTitle} (${copySuffix} ${copyIndex})`)
  ) {
    copyIndex++;
  }
  return `${duplicateTitle} (${copySuffix} ${copyIndex})`;
};
