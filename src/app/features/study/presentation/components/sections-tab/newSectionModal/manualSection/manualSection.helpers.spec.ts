import { CatalogLine, Section } from '@shared/domain';
import { applyLinesCascadeFilter, applyLinesFallback, sortCatalogLines } from './manualSection.helpers';

const makeLine = (overrides: Partial<CatalogLine> = {}): CatalogLine => ({
  uuid: 'line-uuid',
  link_idr: '',
  lit_idr: '',
  lit_adr: '',
  branch_idr: '',
  branch_id: '',
  branch_adr: '',
  voltage_idr: '',
  voltage_adr: '',
  link_adr: '',
  ...overrides
});

const makeSection = (overrides: Partial<Section> = {}): Section =>
  ({
    uuid: 'section-uuid',
    link_name: undefined,
    lit_code: undefined,
    lit_name: undefined,
    branch_idr: undefined,
    branch_name: undefined,
    voltage_idr: undefined,
    ...overrides
  }) as unknown as Section;

describe('sortCatalogLines', () => {
  it('should place NO_VOLTAGE entries first', () => {
    const lines = [
      makeLine({ voltage_adr: 'Z_VOLTAGE', voltage_idr: 'z' }),
      makeLine({ voltage_adr: 'NO_VOLTAGE', voltage_idr: 'nv' }),
      makeLine({ voltage_adr: 'A_VOLTAGE', voltage_idr: 'a' })
    ];
    const result = sortCatalogLines(lines);
    expect(result[0].voltage_adr).toBe('NO_VOLTAGE');
  });

  it('should sort remaining entries alphabetically by voltage_adr', () => {
    const lines = [
      makeLine({ voltage_adr: 'ZZZ', voltage_idr: 'z' }),
      makeLine({ voltage_adr: 'AAA', voltage_idr: 'a' }),
      makeLine({ voltage_adr: 'MMM', voltage_idr: 'm' })
    ];
    const result = sortCatalogLines(lines);
    expect(result.map((l) => l.voltage_adr)).toEqual(['AAA', 'MMM', 'ZZZ']);
  });

  it('should return a single-element array unchanged', () => {
    const lines = [makeLine({ voltage_adr: 'ONLY', voltage_idr: 'x' })];
    const result = sortCatalogLines(lines);
    expect(result).toHaveLength(1);
    expect(result[0].voltage_adr).toBe('ONLY');
  });

  it('should return empty array unchanged', () => {
    expect(sortCatalogLines([])).toHaveLength(0);
  });
});

describe('applyLinesCascadeFilter', () => {
  const lines = [
    makeLine({
      voltage_idr: 'v1',
      link_idr: 'link1',
      lit_idr: 'lit1',
      lit_adr: 'litA1',
      branch_idr: 'b1',
      branch_adr: 'ba1'
    }),
    makeLine({
      voltage_idr: 'v2',
      link_idr: 'link2',
      lit_idr: 'lit2',
      lit_adr: 'litA2',
      branch_idr: 'b2',
      branch_adr: 'ba2'
    }),
    makeLine({
      voltage_idr: 'v1',
      link_idr: 'link3',
      lit_idr: 'lit3',
      lit_adr: 'litA3',
      branch_idr: 'b3',
      branch_adr: 'ba3'
    })
  ];

  it('should return all lines when section has no filter properties set', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(3);
  });

  it('should filter by voltage_idr from section', () => {
    const section = makeSection({ voltage_idr: 'v1' });
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(2);
    result.forEach((l) => expect(l.voltage_idr).toBe('v1'));
  });

  it('should filter by link_idr from section', () => {
    const section = makeSection({ link_name: 'link1' } as unknown as Partial<Section>);
    const result = applyLinesCascadeFilter(lines, section);
    expect(result).toHaveLength(1);
    expect(result[0].link_idr).toBe('link1');
  });

  it('should apply overrideType with overrideValue', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', 'link2');
    expect(result).toHaveLength(1);
    expect(result[0].link_idr).toBe('link2');
  });

  it('should return all lines when overrideValue is empty string', () => {
    const section = makeSection();
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', '');
    expect(result).toHaveLength(3);
  });

  it('should combine section filter with override', () => {
    const section = makeSection({ voltage_idr: 'v1' });
    const result = applyLinesCascadeFilter(lines, section, 'link_idr', 'link1');
    expect(result).toHaveLength(1);
    expect(result[0].voltage_idr).toBe('v1');
    expect(result[0].link_idr).toBe('link1');
  });
});

describe('applyLinesFallback', () => {
  const allLines = [
    makeLine({ voltage_idr: 'v1', link_idr: 'link1', lit_idr: 'lit1' }),
    makeLine({ voltage_idr: 'v2', link_idr: 'link2', lit_idr: 'lit2' })
  ];

  it('should return filteredLines unchanged when they are not empty', () => {
    const section = makeSection();
    const result = applyLinesFallback(allLines, [allLines[0]], section);
    expect(result.lines).toEqual([allLines[0]]);
    expect(result.patchedVoltage).toBeUndefined();
  });

  it('should apply fallback by link_name when filteredLines is empty', () => {
    const section = makeSection({ link_name: 'link1' } as unknown as Partial<Section>);
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].link_idr).toBe('link1');
    expect(result.patchedVoltage).toBe('v1');
  });

  it('should apply fallback by lit_code when link_name is absent', () => {
    const section = makeSection({ lit_code: 'lit2' } as unknown as Partial<Section>);
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lit_idr).toBe('lit2');
    expect(result.patchedVoltage).toBe('v2');
  });

  it('should prefer link_name over lit_code for fallback', () => {
    const section = makeSection({ link_name: 'link1', lit_code: 'lit2' } as unknown as Partial<Section>);
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines[0].link_idr).toBe('link1');
  });

  it('should return empty lines when neither link_name nor lit_code match', () => {
    const section = makeSection({ link_name: 'unknown' } as unknown as Partial<Section>);
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(0);
    expect(result.patchedVoltage).toBeUndefined();
  });

  it('should return empty lines when section has no link_name or lit_code', () => {
    const section = makeSection();
    const result = applyLinesFallback(allLines, [], section);
    expect(result.lines).toHaveLength(0);
    expect(result.patchedVoltage).toBeUndefined();
  });
});
