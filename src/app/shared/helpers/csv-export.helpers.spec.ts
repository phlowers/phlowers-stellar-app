import { buildCsv, escapeCsvField } from './csv-export.helpers';

describe('escapeCsvField', () => {
  it('should leave a plain value unchanged', () => {
    expect(escapeCsvField("'1/8")).toBe("'1/8");
  });

  it('should quote a value holding the separator, a quote or a line break', () => {
    expect(escapeCsvField('a;b')).toBe('"a;b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
    expect(escapeCsvField('a\rb')).toBe('"a\rb"');
  });
});

describe('buildCsv', () => {
  it('should write a BOM then one ";" separated line per entry, each ending with CRLF', () => {
    expect(
      buildCsv([
        ['[A]', '2,00'],
        ['x;y', '3']
      ])
    ).toBe('\uFEFF[A];2,00\r\n"x;y";3\r\n');
  });

  it('should only write the BOM when there is no line', () => {
    expect(buildCsv([])).toBe('\uFEFF');
  });
});
