import { buildL0Csv, isL0TableExportable } from './l0-sum.helpers';
import { L0Row } from './l0-sum.interfaces';

const row = (overrides: Partial<L0Row> = {}): L0Row => ({
  span: '1-2',
  spanLength: 101.25,
  l0: 100,
  cumulatedL0: 100,
  index: 0,
  ...overrides
});

const frLabels = {
  span: 'Portée',
  spanLength: 'Longueur de portée',
  l0: 'Longueur naturelle L0',
  cumulatedL0: 'Longueur naturelle L0 cumulée'
};

describe('isL0TableExportable', () => {
  it('should accept a table whose lengths are all finite numbers', () => {
    expect(isL0TableExportable([row(), row({ index: 1 })])).toBe(true);
  });

  it('should reject an empty table', () => {
    expect(isL0TableExportable([])).toBe(false);
  });

  it.each([
    ['spanLength', { spanLength: undefined as unknown as number }],
    ['l0', { l0: Number.NaN }],
    ['cumulatedL0', { cumulatedL0: Number.POSITIVE_INFINITY }]
  ])('should reject a table with an invalid %s', (_field, overrides) => {
    expect(isL0TableExportable([row(), row(overrides)])).toBe(false);
  });
});

describe('buildL0Csv', () => {
  it('should start with a UTF-8 byte order mark', () => {
    expect(buildL0Csv([row()], frLabels, 'fr').startsWith('\uFEFF')).toBe(true);
  });

  it('should write the translated labels in upper case as the heading', () => {
    const [heading] = buildL0Csv([], frLabels, 'fr').replace('\uFEFF', '').split('\r\n');
    expect(heading).toBe('PORTÉE;LONGUEUR DE PORTÉE;LONGUEUR NATURELLE L0;LONGUEUR NATURELLE L0 CUMULÉE');
  });

  it('should write the heading in english when given english labels', () => {
    const [heading] = buildL0Csv(
      [],
      {
        span: 'Span',
        spanLength: 'Span length',
        l0: 'Natural length L0',
        cumulatedL0: 'Cumulated natural length L0'
      },
      'en'
    )
      .replace('\uFEFF', '')
      .split('\r\n');
    expect(heading).toBe('SPAN;SPAN LENGTH;NATURAL LENGTH L0;CUMULATED NATURAL LENGTH L0');
  });

  it('should write one ";" separated line per span after the heading', () => {
    const csv = buildL0Csv(
      [row(), row({ span: '2-3', spanLength: 201, l0: 200.5, cumulatedL0: 300.5, index: 1 })],
      frLabels,
      'fr'
    );
    expect(csv.replace('\uFEFF', '').split('\r\n').slice(1)).toEqual(['1-2;101,25;100;100', '2-3;201;200,5;300,5', '']);
  });

  it('should use the decimal separator of the locale and no thousands grouping', () => {
    const line = (locale: string) =>
      buildL0Csv([row({ spanLength: 1234.5, l0: 1234.5, cumulatedL0: 1234.5 })], frLabels, locale)
        .replace('\uFEFF', '')
        .split('\r\n')[1];
    expect(line('fr')).toBe('1-2;1234,5;1234,5;1234,5');
    expect(line('en')).toBe('1-2;1234.5;1234.5;1234.5');
  });

  it('should keep at most 3 decimals like the table', () => {
    const line = buildL0Csv([row({ l0: 100.123456 })], frLabels, 'en').split('\r\n')[1];
    expect(line).toBe('1-2;101.25;100.123;100');
  });

  it('should quote a span label holding the separator or a quote', () => {
    const line = (span: string) => buildL0Csv([row({ span })], frLabels, 'en').split('\r\n')[1];
    expect(line('A;1-B')).toBe('"A;1-B";101.25;100;100');
    expect(line('A"1-B')).toBe('"A""1-B";101.25;100;100');
  });
});
