export const LOCATION_CONFIG = {
  latitude: { min: -90, max: 90, step: 0.0000001 },
  longitude: { min: -180, max: 180, step: 0.0000001 },
  azimuth: { min: -180, max: 180, step: 0.1 }
};

export const LOCATION_ERROR_IDS = {
  latitude: {
    max: 'location-latitude-max-error',
    min: 'location-latitude-min-error'
  },
  longitude: {
    max: 'location-longitude-max-error',
    min: 'location-longitude-min-error'
  },
  azimuth: {
    max: 'location-azimuth-max-error',
    min: 'location-azimuth-min-error'
  }
} as const;
