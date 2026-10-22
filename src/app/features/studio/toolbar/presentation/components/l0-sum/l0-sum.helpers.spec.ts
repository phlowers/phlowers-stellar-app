import Papa from 'papaparse';

import { buildL0Csv, buildL0ExportFilename, isL0TableExportable } from './l0-sum.helpers';
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

describe('buildL0ExportFilename', () => {
  const date = new Date(2026, 8, 30, 14, 5, 9);

  it('should join the english prefix, study, section and generation timestamp', () => {
    expect(buildL0ExportFilename('L0 Lengths Export', 'Study A', 'Section 1', date)).toBe(
      'L0 Lengths Export_Study A_Section 1_2026-09-30_14-05-09.csv'
    );
  });

  it('should join the french prefix, study, section and generation timestamp', () => {
    expect(buildL0ExportFilename('Export Longueurs L0', 'Étude démo', 'Canton démo 3', date)).toBe(
      'Export Longueurs L0_Étude démo_Canton démo 3_2026-09-30_14-05-09.csv'
    );
  });

  it('should zero pad the month, the day and the time', () => {
    expect(buildL0ExportFilename('Export', 'study', 'section', new Date(2026, 0, 2, 3, 4, 5))).toBe(
      'Export_study_section_2026-01-02_03-04-05.csv'
    );
  });

  it('should replace the characters that are illegal in a file name', () => {
    expect(buildL0ExportFilename('Export', 'a/b:c*d?e"f<g>h|i\\j', 'x:y', date)).toBe(
      'Export_a-b-c-d-e-f-g-h-i-j_x-y_2026-09-30_14-05-09.csv'
    );
  });

  it('should use the current time when no generation date is given', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(date);
    try {
      expect(buildL0ExportFilename('Export', 'study', 'section')).toBe('Export_study_section_2026-09-30_14-05-09.csv');
    } finally {
      vi.useRealTimers();
    }
  });
});

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
    expect(csv.replace('\uFEFF', '').split('\r\n').slice(1)).toEqual([
      '"=""1-2""";101,25;100;100',
      '"=""2-3""";201;200,5;300,5',
      ''
    ]);
  });

  it('should use the decimal separator of the locale and no thousands grouping', () => {
    const line = (locale: string) =>
      buildL0Csv([row({ spanLength: 1234.5, l0: 1234.5, cumulatedL0: 1234.5 })], frLabels, locale)
        .replace('\uFEFF', '')
        .split('\r\n')[1];
    expect(line('fr')).toBe('"=""1-2""";1234,5;1234,5;1234,5');
    expect(line('en')).toBe('"=""1-2""";1234.5;1234.5;1234.5');
  });

  it('should keep at most 3 decimals like the table', () => {
    const line = buildL0Csv([row({ l0: 100.123456 })], frLabels, 'en').split('\r\n')[1];
    expect(line).toBe('"=""1-2""";101.25;100.123;100');
  });

  // Spreadsheet software turns a bare "1-2" into a date, so a span label is written as a text formula: ="1-2"
  it.each(['1-2', '2-3', '12-13', '1-31', 'A1-B2', '1-=2', 'A+B-C@D'])(
    'should write the span label "%s" as a text formula',
    (span) => {
      const line = buildL0Csv([row({ span })], frLabels, 'en').split('\r\n')[1];
      expect(line).toBe(`"=""${span}""";101.25;100;100`);
    }
  );

  it.each([
    ['=', '=1+1-2'],
    ['+', '+1-2'],
    ['-', '-1-2'],
    ['@', '@A-B'],
    ['a space then =', ' =1+1-2'],
    ['a tab then =', '\t=1+1-2'],
    ['a non breaking space then =', ' =1+1-2'],
    ['a tab then a letter', '\tA-B']
  ])('should keep a span label starting with %s inside the text formula', (_start, span) => {
    const line = buildL0Csv([row({ span })], frLabels, 'en').split('\r\n')[1];
    expect(line).toBe(`"=""${span}""";101.25;100;100`);
  });

  it('should double the quotes of a span label holding the separator or a quote', () => {
    const line = (span: string) => buildL0Csv([row({ span })], frLabels, 'en').split('\r\n')[1];
    expect(line('A;1-B')).toBe('"=""A;1-B""";101.25;100;100');
    expect(line('A"1-B')).toBe('"=""A""""1-B""";101.25;100;100');
  });

  // The text formula must hold the whole label as one string literal, with every inner quote doubled
  it.each([
    '1-2',
    "=cmd|' /C calc'!A0-1",
    '"&HYPERLINK("http://example.com","x")&"-2',
    '1-2"; DROP',
    'A;1-B',
    'line\nbreak-1',
    '\r=1+1-2',
    '"',
    '""'
  ])('should read the span label %j back from the CSV as a single string literal', (span) => {
    const csv = buildL0Csv([row({ span })], frLabels, 'en').replace('\uFEFF', '');
    const { data, errors } = Papa.parse<string[]>(csv, { delimiter: ';', skipEmptyLines: true });

    expect(errors).toEqual([]);
    expect(data).toHaveLength(2);
    expect(data[1]).toHaveLength(4);
    const literal = /^="((?:[^"]|"")*)"$/.exec(data[1][0]);
    expect(literal).not.toBeNull();
    expect(literal![1].replaceAll('""', '"')).toBe(span);
  });

  it('should keep the lengths as bare numbers, a negative one included', () => {
    const line = buildL0Csv([row({ spanLength: -101.25, l0: -5, cumulatedL0: -5 })], frLabels, 'en').split('\r\n')[1];
    expect(line).toBe('"=""1-2""";-101.25;-5;-5');
  });
});
