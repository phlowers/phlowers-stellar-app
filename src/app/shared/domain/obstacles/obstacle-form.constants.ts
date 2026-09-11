import { LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { ObstacleFormData } from './obstacle-form.interfaces';

/** Delay in ms for debouncing obstacle point coordinate updates. */
export const DEBOUNCED_UPDATE_POINT_DELAY = 300;

/** Allowed range and precision for a point's "Alt. point" (z) field — RG.OBS.POZ.1. */
export const ALTITUDE_MIN = -100;
export const ALTITUDE_MAX = 9000;

/** Allowed range and precision for a point's "Dist. supp. réf." (x) field — RG.OBS.POX.1. */
export const REF_SUPPORT_DISTANCE_MIN = -50;
export const REF_SUPPORT_DISTANCE_MAX = 5000;

/** Allowed range and precision for a point's "Dist. axe ligne" (y) field — RG.OBS.POY.1. */
export const AXIS_DISTANCE_MIN = -100;
export const AXIS_DISTANCE_MAX = 100;

/** Maximum number of decimals allowed on a point's x/y/z coordinate fields. */
export const POSITION_MAX_DECIMALS = 2;

/** Default values for a new obstacle form. */
export const defaultObstacleForm: ObstacleFormData = {
  uuid: '',
  name: null,
  type: 'House',
  supportUuid: null,
  referenceSupport: null,
  altitudeType: 'absolute',
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: []
};
