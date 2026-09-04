import { LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { ObstacleFormData } from './obstacle-form.interfaces';

/** Delay in ms for debouncing obstacle point coordinate updates. */
export const DEBOUNCED_UPDATE_POINT_DELAY = 300;

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

/** Min/max constraints for obstacle point coordinates (RG.OBS.POZ.1 / POX.1 / POY.1). */
export const obstaclePositionConstraints = {
  z: { min: -100, max: 9000 },
  x: { min: -50, max: 5000 },
  y: { min: -100, max: 100 }
} as const;
