import { GpsPoint } from '@shared/domain/helpers/geopositioning.interfaces';
import {
  StartFromNextSupportInput,
  StartFromNextSupportResult
} from '@services/geopositioning/geopositioning.interfaces';

/** Computes one backward step of a section start, e.g. `GeopositioningService.computeStartFromNextSupport`. */
export type StartFromNextSupportFn = (input: StartFromNextSupportInput) => Promise<StartFromNextSupportResult | null>;

/** Property keys from the lines catalog table used for cascading filters. */
export type LineTableProperties =
  'voltage_idr' | 'link_idr' | 'link_adr' | 'lit_idr' | 'lit_adr' | 'branch_idr' | 'branch_adr';

/** Start of a section: start GPS and start azimuth in degrees, normalized to ]-180, 180]. */
export interface SectionStart {
  latitude: number;
  longitude: number;
  azimuth: number;
}

/**
 * Start of a geolocated section kept while supports are inserted before support 0.
 * It is the first support of the section before the insertions, its GPS and span azimuth
 * being the only known geometry until the new start is computed on validation.
 */
export interface StartAnchor {
  /** Uuid of the anchor support. */
  supportUuid: string;
  /** GPS of the anchor support foot. */
  gps: GpsPoint;
  /** Grid azimuth in degrees of the span starting at the anchor support. */
  spanAzimuth: number;
}
