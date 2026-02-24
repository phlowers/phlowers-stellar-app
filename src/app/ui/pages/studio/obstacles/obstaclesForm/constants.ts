import { LateralDistanceType } from '@src/app/core/domain/models/obstacle.model';
import { ObstacleFormData } from './interfaces';

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
