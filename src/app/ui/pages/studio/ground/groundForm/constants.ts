import { GroundFormData } from './interfaces';

export const DEBOUNCED_UPDATE_POINT_DELAY = 300;

export const defaultGroundForm: GroundFormData = {
  uuid: '',
  supportUuid: null,
  referenceSupport: null,
  altitudeType: 'absolute',
  positions: []
};
