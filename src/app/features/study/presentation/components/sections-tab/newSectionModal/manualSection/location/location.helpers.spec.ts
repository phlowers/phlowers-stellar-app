import { describe, expect, it } from 'vitest';
import { LOCATION_CONFIG } from './location.constantes';
import { isLocationEmpty, isLocationPartiallyFilled, isLocationValid } from './location.helpers';

describe('location.helpers', () => {
  describe('isLocationEmpty', () => {
    it('should return true when all fields are null', () => {
      expect(isLocationEmpty({ latitude: null, longitude: null, azimuth: null })).toBe(true);
    });

    it('should return false when at least one field is filled', () => {
      expect(isLocationEmpty({ latitude: 45, longitude: null, azimuth: null })).toBe(false);
    });
  });

  describe('isLocationPartiallyFilled', () => {
    it('should return true when some but not all fields are filled', () => {
      expect(isLocationPartiallyFilled({ latitude: 45, longitude: 1, azimuth: null })).toBe(true);
      expect(isLocationPartiallyFilled({ latitude: null, longitude: null, azimuth: 10 })).toBe(true);
    });

    it('should return false when all fields are empty or all filled', () => {
      expect(isLocationPartiallyFilled({ latitude: null, longitude: null, azimuth: null })).toBe(false);
      expect(isLocationPartiallyFilled({ latitude: 45, longitude: 1, azimuth: 10 })).toBe(false);
    });
  });

  describe('isLocationValid', () => {
    it('should be valid when all fields are empty', () => {
      expect(isLocationValid({ latitude: null, longitude: null, azimuth: null })).toBe(true);
    });

    it('should be valid when all fields are filled within bounds', () => {
      expect(isLocationValid({ latitude: 45.5, longitude: 1.2, azimuth: -180 })).toBe(true);
      expect(isLocationValid({ latitude: -90, longitude: 180, azimuth: 180 })).toBe(true);
    });

    it('should be invalid when only some fields are filled', () => {
      expect(isLocationValid({ latitude: 45, longitude: null, azimuth: null })).toBe(false);
      expect(isLocationValid({ latitude: 45, longitude: 1, azimuth: null })).toBe(false);
      expect(isLocationValid({ latitude: null, longitude: 1, azimuth: 10 })).toBe(false);
    });

    it('should be invalid when a filled field is out of bounds', () => {
      expect(isLocationValid({ latitude: 90.1, longitude: 1, azimuth: 10 })).toBe(false);
      expect(isLocationValid({ latitude: 45, longitude: -180.5, azimuth: 10 })).toBe(false);
      expect(isLocationValid({ latitude: 45, longitude: 1, azimuth: 180.1 })).toBe(false);
    });

    it('should use the provided config bounds', () => {
      const config = { ...LOCATION_CONFIG, azimuth: { min: 0, max: 90, step: 0.1 } };
      expect(isLocationValid({ latitude: 45, longitude: 1, azimuth: -10 }, config)).toBe(false);
      expect(isLocationValid({ latitude: 45, longitude: 1, azimuth: 90 }, config)).toBe(true);
    });
  });
});
