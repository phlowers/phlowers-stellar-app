import { ObstacleFormData } from './interfaces';

export const DEBOUNCED_UPDATE_POINT_DELAY = 300;

export const defaultObstacleForm: ObstacleFormData = {
  uuid: '',
  name: null,
  type: 'House',
  supportUuid: null,
  referenceSupport: null,
  altitudeType: 'absolute',
  lateralDistanceType: 'span_axis',
  positions: []
};
