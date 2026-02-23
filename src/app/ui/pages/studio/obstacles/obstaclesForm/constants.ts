import { LateralDistanceType } from '@src/app/core/domain/models/obstacle.model';
import { ObstacleFormData } from './interfaces';

export const DEBOUNCED_UPDATE_POINT_DELAY = 300;

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
