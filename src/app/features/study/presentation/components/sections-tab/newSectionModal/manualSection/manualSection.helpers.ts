import { CatalogLine, Section, Support } from '@shared/domain';
import { FootLocalization, GpsPoint } from '@shared/domain/helpers/geopositioning.interfaces';
import { normalizeAzimuth } from '@shared/domain/helpers/geopositioning.helpers';
import { StartFromNextSupportInput } from '@services/geopositioning/geopositioning.interfaces';
import { lineTablePropertiesToSectionProperties, orderedLineTableProperties } from './manualSection.constantes';
import { LineTableProperties, SectionStart, StartAnchor, StartFromNextSupportFn } from './manualSection.interfaces';
import { LocationValues } from './location/location.interfaces';
import { isLocationEmpty } from './location/location.helpers';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Converts an angle in gradians to degrees (400 gradians = 360 degrees). */
const gradiansToDegrees = (gradians: number): number => gradians * 0.9;

/**
 * Reads the GPS and span azimuth of a support: stored values first, `localization` (indexed like the supports) as fallback.
 * @returns The geometry, or null when a value is unknown
 */
const getSupportGeometry = (
  support: Support,
  localization: FootLocalization | null,
  index: number
): { latitude: number; longitude: number; spanAzimuth: number } | null => {
  const latitude = isFiniteNumber(support.footLatitude) ? support.footLatitude : localization?.latitude[index];
  const longitude = isFiniteNumber(support.footLongitude) ? support.footLongitude : localization?.longitude[index];
  const spanAzimuth = isFiniteNumber(support.spanAzimut) ? support.spanAzimut : localization?.azimuth[index];
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude) || !isFiniteNumber(spanAzimuth)) return null;
  return { latitude, longitude, spanAzimuth };
};

/**
 * Computes the new start of a geolocated section once its first support (index 0) is deleted.
 * The former support 1 becomes the new start. Its azimuth of span 0 is the former span 1 azimuth,
 * so the new start azimuth is that azimuth minus the deflection at the new start, which keeps supports 2..n in place.
 * @param previousSupports - Supports of the section before the deletion, the deleted support being at index 0
 * @param localization - Localization of the previous section, or null when unavailable
 * @returns The new start point and azimuth, or null when they cannot be determined
 */
export const getStartAfterFirstSupportDeletion = (
  previousSupports: Support[],
  localization: FootLocalization | null
): SectionStart | null => {
  const next = previousSupports[1];
  if (!next || !isFiniteNumber(next.spanAngle)) return null;
  const geometry = getSupportGeometry(next, localization, 1);
  if (!geometry) return null;
  return {
    latitude: geometry.latitude,
    longitude: geometry.longitude,
    azimuth: normalizeAzimuth(geometry.spanAzimuth - gradiansToDegrees(next.spanAngle))
  };
};

/**
 * Captures the start of a geolocated section before a support is inserted before support 0.
 * The former support 0 is kept as anchor: its GPS and span azimuth are the reference to compute the new start later.
 * @param supports - Supports of the section before the insertion
 * @param localization - Localization of the section, or null when unavailable
 * @returns The anchor, or null when the GPS or the span azimuth of support 0 cannot be determined
 */
export const extractStartAnchor = (supports: Support[], localization: FootLocalization | null): StartAnchor | null => {
  const first = supports[0];
  if (!first) return null;
  const geometry = getSupportGeometry(first, localization, 0);
  if (!geometry) return null;
  return {
    supportUuid: first.uuid,
    gps: { latitude: geometry.latitude, longitude: geometry.longitude },
    spanAzimuth: geometry.spanAzimuth
  };
};

/**
 * Start of a section whose anchor is its first support: the anchor GPS and the start azimuth before its deflection.
 * @param anchor - Anchor captured before the insertion
 * @param support - The anchor support, now at index 0
 * @returns The section start
 */
export const getStartFromAnchorSupport = (anchor: StartAnchor, support: Support): SectionStart => ({
  latitude: anchor.gps.latitude,
  longitude: anchor.gps.longitude,
  azimuth: normalizeAzimuth(anchor.spanAzimuth - gradiansToDegrees(support.spanAngle ?? 0))
});

/**
 * Builds the input of `computeStartFromNextSupport` for the span starting at `index`, towards the support at `index + 1`.
 * @param supports - Current supports of the section
 * @param index - Index of the support the span starts from
 * @param next - GPS of the support at `index + 1`
 * @param nextSpanAzimuth - Grid azimuth (deg) of the span starting at the support at `index + 1`
 * @returns The input, or null when the span length of the support at `index` is missing or not positive
 */
export const buildNextSupportStepInput = (
  supports: Support[],
  index: number,
  next: GpsPoint,
  nextSpanAzimuth: number
): StartFromNextSupportInput | null => {
  const support = supports[index];
  const nextSupport = supports[index + 1];
  if (!support || !nextSupport || !isFiniteNumber(support.spanLength) || support.spanLength <= 0) return null;
  return {
    next,
    nextSpanAzimuth,
    spanLength: support.spanLength,
    lineAngle: [support.spanAngle ?? 0, nextSupport.spanAngle ?? 0]
  };
};

/**
 * Span azimuth (deg) starting at a support, from the azimuth of the span arriving at it and its deflection angle.
 * @param arrivalAzimuth - Azimuth (deg) of the span arriving at the support, before its deflection
 * @param support - The support
 * @returns The span azimuth, normalized to ]-180, 180]
 */
export const getSpanAzimuthAtSupport = (arrivalAzimuth: number, support: Support): number =>
  normalizeAzimuth(arrivalAzimuth + gradiansToDegrees(support.spanAngle ?? 0));

/**
 * Computes the start of a section from its anchor, walking backwards from the anchor support to support 0.
 * Each step gives the GPS of the previous support and the azimuth of the span arriving at it.
 * @param supports - Current supports of the section, the anchor being one of them
 * @param anchor - Anchor captured before the insertions
 * @param computeStart - Computes one backward step, e.g. `GeopositioningService.computeStartFromNextSupport`
 * @returns The new start, or null when the anchor is missing, a span length is invalid or a step fails
 */
export const computeStartBeforeAnchor = async (
  supports: Support[],
  anchor: StartAnchor,
  computeStart: StartFromNextSupportFn
): Promise<SectionStart | null> => {
  const anchorIndex = supports.findIndex((support) => support.uuid === anchor.supportUuid);
  if (anchorIndex < 0) return null;
  if (anchorIndex === 0) return getStartFromAnchorSupport(anchor, supports[0]);
  let next = anchor.gps;
  let nextSpanAzimuth = anchor.spanAzimuth;
  for (let index = anchorIndex - 1; index >= 0; index--) {
    const input = buildNextSupportStepInput(supports, index, next, nextSpanAzimuth);
    if (!input) return null;
    const result = await computeStart(input);
    if (!result) return null;
    if (index === 0) {
      return {
        latitude: result.point.latitude,
        longitude: result.point.longitude,
        azimuth: normalizeAzimuth(result.azimuth)
      };
    }
    next = result.point;
    nextSpanAzimuth = getSpanAzimuthAtSupport(result.azimuth, supports[index]);
  }
  return null;
};

/**
 * Keeps a pending anchor only while the location inputs are empty: values entered by the user always win.
 * @param anchor - Pending anchor, or null
 * @param location - Current location inputs
 * @returns The anchor when it is still pending, else null
 */
export const keepStartAnchor = (anchor: StartAnchor | null, location: LocationValues): StartAnchor | null =>
  anchor && isLocationEmpty(location) ? anchor : null;

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
 * Tries `link_idr` first, then `lit_idr`.
 * Returns the filtered lines and an optional voltage patch to apply on the section.
 * @param allLines - Full catalog lines array
 * @param filteredLines - Result of the cascade filter (may be empty)
 * @param section - Current section providing link_idr and lit_idr
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
  const linkCode = section.link_idr;
  const litIdr = section.lit_idr;
  let result: CatalogLine[] = [];
  if (linkCode) {
    result = allLines.filter((item) => item.link_idr === linkCode);
  } else if (litIdr) {
    result = allLines.filter((item) => item.lit_idr === litIdr);
  }
  if (result.length > 0) {
    return { lines: result, patchedVoltage: result[0].voltage_idr };
  }
  return { lines: filteredLines };
};
