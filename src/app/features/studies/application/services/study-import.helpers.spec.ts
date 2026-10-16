import { isAppStudyFile, isStsdFile } from './study-import.helpers';

describe('study-import helpers', () => {
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
