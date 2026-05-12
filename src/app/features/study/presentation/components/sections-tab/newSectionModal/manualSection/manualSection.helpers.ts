import { CatalogLine, Section } from '@shared/domain';
import { lineTablePropertiesToSectionProperties, orderedLineTableProperties } from './manualSection.constantes';
import { LineTableProperties } from './manualSection.interfaces';

/**
 * Sorts catalog lines by voltage, placing 'NO_VOLTAGE' entries first.
 * @param lines - Array of catalog lines to sort
 * @returns Sorted array of catalog lines
 */
export const sortCatalogLines = (lines: CatalogLine[]): CatalogLine[] => {
  return lines.sort((a, b) => {
    const aHasNoVoltage = a.voltage_adr === 'NO_VOLTAGE';
    const bHasNoVoltage = b.voltage_adr === 'NO_VOLTAGE';
    if (aHasNoVoltage) {
      return -1;
    }
    if (bHasNoVoltage) {
      return 1;
    }
    return a.voltage_adr.localeCompare(b.voltage_adr);
  });
};

/**
 * Applies a cascading filter on the lines catalog.
 * When `overrideType` and `overrideValue` are provided, the filter for that property
 * uses `overrideValue` instead of the section value (used in `onLinesSelect`).
 * @param allLines - Full catalog lines array
 * @param section - Current section whose properties drive the filter
 * @param overrideType - Optional property to override (from user selection)
 * @param overrideValue - Value to use for the overridden property
 * @returns Filtered catalog lines
 */
export const applyLinesCascadeFilter = (
  allLines: CatalogLine[],
  section: Section,
  overrideType?: LineTableProperties,
  overrideValue?: string
): CatalogLine[] => {
  let result = allLines;
  orderedLineTableProperties.forEach((id) => {
    if (overrideType && id === overrideType) {
      result = result.filter((item) => !overrideValue || item[id] === overrideValue);
    } else {
      result = result.filter(
        (item) =>
          !section[lineTablePropertiesToSectionProperties[id]] ||
          item[id] === section[lineTablePropertiesToSectionProperties[id]]
      );
    }
  });
  return result;
};

/**
 * Applies a fallback filter when the cascade filter returns no results.
 * Tries `link_name` first, then `lit_code`.
 * Returns the filtered lines and an optional voltage patch to apply on the section.
 * @param allLines - Full catalog lines array
 * @param filteredLines - Result of the cascade filter (may be empty)
 * @param section - Current section providing link_name and lit_code
 * @returns Object with the resulting lines and an optional `patchedVoltage`
 */
export const applyLinesFallback = (
  allLines: CatalogLine[],
  filteredLines: CatalogLine[],
  section: Section
): { lines: CatalogLine[]; patchedVoltage?: string } => {
  if (filteredLines.length > 0) {
    return { lines: filteredLines };
  }
  const linkName = section.link_name;
  const litCode = section.lit_code;
  let result: CatalogLine[] = [];
  if (linkName) {
    result = allLines.filter((item) => item.link_idr === linkName);
  } else if (litCode) {
    result = allLines.filter((item) => item.lit_idr === litCode);
  }
  if (result.length > 0) {
    return { lines: result, patchedVoltage: result[0].voltage_idr };
  }
  return { lines: filteredLines };
};
