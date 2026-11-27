import { formatGenerationDate, sanitizeFilenamePart } from './filename.helpers';

describe('formatGenerationDate', () => {
  const date = new Date(2026, 10, 6, 9, 5);

  it('should format the local date only by default', () => {
    expect(formatGenerationDate(date)).toBe('2026-11-06');
  });

  it('should append the zero-padded hours and minutes with withTime', () => {
    expect(formatGenerationDate(date, true)).toBe('2026-11-06 09-05');
  });
});

describe('sanitizeFilenamePart', () => {
  it('should replace illegal filesystem characters with a dash', () => {
    expect(sanitizeFilenamePart('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('should leave a value without illegal characters unchanged', () => {
    expect(sanitizeFilenamePart('canton-42_2026-05-20')).toBe('canton-42_2026-05-20');
  });
});
