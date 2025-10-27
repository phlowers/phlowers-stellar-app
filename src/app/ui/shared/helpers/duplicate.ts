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
  const copySuffix = $localize`Copy`;
  const regex = new RegExp(/\s*\(Copy\s*\d+\)/); //NOSONAR
  const duplicateTitle = duplicatedTitle.replace(
    new RegExp(regex.source.replace('Copy', copySuffix), 'g'),
    ''
  );
  let copyIndex = 1;
  while (
    existingTitles.includes(`${duplicateTitle} (${copySuffix} ${copyIndex})`)
  ) {
    copyIndex++;
  }
  return `${duplicateTitle} (${copySuffix} ${copyIndex})`;
};
