/**
 * Generates a unique copy title by appending an incremented copy suffix
 * (e.g. "(Copy 1)", "(Copy 2)") that does not collide with any existing titles.
 * Any pre-existing copy suffix on the input title is stripped before generating the new one.
 * @category Helpers
 * @param existingTitles - The list of existing titles to check against for uniqueness.
 * @param duplicatedTitle - The original title to create a copy name for.
 * @returns A new title with a unique copy suffix.
 */

export const findDuplicateTitle = (existingTitles: string[], duplicatedTitle: string) => {
  const copySuffix = $localize`Copy`;
  const regex = new RegExp(/\s*\(Copy\s*\d+\)/); //NOSONAR
  const duplicateTitle = duplicatedTitle.replace(new RegExp(regex.source.replace('Copy', copySuffix), 'g'), '');
  let copyIndex = 1;
  while (existingTitles.includes(`${duplicateTitle} (${copySuffix} ${copyIndex})`)) {
    copyIndex++;
  }
  return `${duplicateTitle} (${copySuffix} ${copyIndex})`;
};
