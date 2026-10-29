import { sanitizeFilenamePart } from './filename.helpers';

describe('sanitizeFilenamePart', () => {
  it('should replace illegal filesystem characters with a dash', () => {
    expect(sanitizeFilenamePart('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('should leave a value without illegal characters unchanged', () => {
    expect(sanitizeFilenamePart('canton-42_2026-05-20')).toBe('canton-42_2026-05-20');
  });
});
