import { isAppStudyFile, isRecord, isStsdFile } from './study-import.helpers';

describe('study-import helpers', () => {
  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ uuid: 'a' })).toBe(true);
    });

    it('should return false for null, primitives and arrays', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord('section')).toBe(false);
      expect(isRecord([])).toBe(false);
    });
  });

  describe('isStsdFile', () => {
    it('should return true for .stsd files (case-insensitive)', () => {
      expect(isStsdFile('study.stsd')).toBe(true);
      expect(isStsdFile('study.STSD')).toBe(true);
    });

    it('should return false for other extensions', () => {
      expect(isStsdFile('study.clst')).toBe(false);
      expect(isStsdFile('study.csv')).toBe(false);
      expect(isStsdFile('study.stsd.json')).toBe(false);
    });
  });

  describe('isAppStudyFile', () => {
    it('should return true for .clst and .stsd files', () => {
      expect(isAppStudyFile('study.clst')).toBe(true);
      expect(isAppStudyFile('study.stsd')).toBe(true);
    });

    it('should return false for non-app study files', () => {
      expect(isAppStudyFile('study.csv')).toBe(false);
      expect(isAppStudyFile('study.json')).toBe(false);
    });
  });
});
