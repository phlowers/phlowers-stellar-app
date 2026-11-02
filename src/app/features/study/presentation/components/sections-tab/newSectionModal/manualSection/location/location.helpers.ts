import { LOCATION_CONFIG } from './location.constantes';
import { LocationValues } from './location.interfaces';

/** `true` when latitude, longitude and azimuth are all empty (geolocation not provided). */
export function isLocationEmpty(values: LocationValues): boolean {
  return values.latitude === null && values.longitude === null && values.azimuth === null;
}

/** `true` when at least one field is filled but not all three. */
export function isLocationPartiallyFilled(values: LocationValues): boolean {
  return !isLocationEmpty(values) && (values.latitude === null || values.longitude === null || values.azimuth === null);
}

/**
 * Location validity is all or nothing:
 * - all fields empty → valid (the section has no geolocation);
 * - all fields filled and each within its min/max bounds → valid;
 * - anything else (partially filled or out of bounds) → invalid.
 */
export function isLocationValid(values: LocationValues, config: typeof LOCATION_CONFIG = LOCATION_CONFIG): boolean {
  if (isLocationEmpty(values)) return true;
  const { latitude, longitude, azimuth } = values;
  if (latitude === null || longitude === null || azimuth === null) return false;
  return (
    latitude >= config.latitude.min &&
    latitude <= config.latitude.max &&
    longitude >= config.longitude.min &&
    longitude <= config.longitude.max &&
    azimuth >= config.azimuth.min &&
    azimuth <= config.azimuth.max
  );
}
