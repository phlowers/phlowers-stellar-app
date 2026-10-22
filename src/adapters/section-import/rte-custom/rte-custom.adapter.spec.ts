/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { buildImportSource } from '@shared/import/section-adapter/section-import-adapter';
import fakeCanton from './fixtures/fake-canton.json';
import { RteCustomAdapter } from './rte-custom.adapter';

const sourceOf = (json: unknown) => buildImportSource('canton.json', JSON.stringify(json));

describe('RteCustomAdapter', () => {
  let adapter: RteCustomAdapter;

  beforeEach(() => {
    const translations: Record<string, string> = {
      'rte-custom.format-error': 'The section file to import is invalid.'
    };

    TestBed.configureTestingModule({
      providers: [
        RteCustomAdapter,
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string) => translations[key] ?? key,
            selectTranslate: (key: string, _params?: Record<string, unknown>, scope?: string | { scope?: string }) => {
              const scopeName = typeof scope === 'string' ? scope : (scope?.scope ?? 'rte-custom');
              return of(translations[scopeName ? `${scopeName}.${key}` : key] ?? translations[key] ?? key);
            }
          }
        }
      ]
    });
    adapter = TestBed.inject(RteCustomAdapter);
  });

  it('should declare its identity and accepted extensions', () => {
    expect(adapter.id).toBe('rte_custom');
    expect(adapter.extensions).toEqual(['.json']);
  });

  it('should handle files with a cantons array only', () => {
    expect(adapter.canHandle(sourceOf(fakeCanton))).toBe(true);
    expect(adapter.canHandle(sourceOf({ uuid: 'a', supports: [] }))).toBe(false);
  });

  it('should extract the trimmed CANTON_CUR as uuid', () => {
    expect(adapter.extractUuid(sourceOf(fakeCanton))).toBe('FAKE-CANTON-0001');
  });

  it('should map the fixture, declare Lambert93 foot coordinates and ask the core for catalog corrections', async () => {
    const payload = await adapter.import(sourceOf(fakeCanton));

    expect(payload.section.uuid).toBe('FAKE-CANTON-0001');
    expect(payload.coordinates?.crs).toBe('LAMBERT93');
    expect(payload.coordinates?.x).toHaveLength(payload.section.supports.length);
    expect(payload.coordinates?.y).toHaveLength(payload.section.supports.length);
    expect(payload.section.start_latitude).toBeNull();
    expect(payload.applyCatalogCorrections).toBe(true);
    expect(payload.notices).toBeUndefined();
  });

  // Shape of a real RTE export: voltage IDR is a code, ADR is the catalog text.
  describe('catalog lookup keys (real-export shape)', () => {
    const buildRealShapeExport = () => {
      const raw = structuredClone(fakeCanton);
      const appartenance = raw.cantons[0].general.appartenance[0];
      appartenance.TENSION_ELECTRIQUE_IDR = '4';
      appartenance.TENSION_ELECTRIQUE_ADR = '225 KV';
      return raw;
    };

    it('should keep the raw voltage and the maintenance designations, without resolving any ID', async () => {
      const { section } = await adapter.import(sourceOf(buildRealShapeExport()));

      expect(section.voltage_idr).toBe('4');
      expect(section.voltage_adr).toBe('225 KV');
      expect(section.cm_designation).toBe('FAKE-CM-01');
      expect(section.gmr_designation).toBe('FAKE-GMR-ZONE');
      expect(section.eel_designation).toBe('FAKE-EEL-ZONE');
      expect(section.maintenance_center_id).toBeUndefined();
      expect(section.regional_team_id).toBeUndefined();
      expect(section.maintenance_team_id).toBeUndefined();
    });

    it('should keep the general link and line fields from appartenance', async () => {
      const { section } = await adapter.import(sourceOf(buildRealShapeExport()));

      expect(section.link_idr).toBe('FAKEBR00LINE');
      expect(section.lit_adr).toBe('LIT 225kV NO FAKE-SITE-A-FAKE-SITE-B');
      expect(section.branch_idr).toBe('FAKEBR00LINE04');
    });

    it('should keep the file values of the supports (name, attachment set, arm length, chain)', async () => {
      const { section } = await adapter.import(sourceOf(buildRealShapeExport()));
      const support = section.supports.find((s) => s.name === 'FAKE-SUP-101');

      expect(support?.armLength).toBe(1.2);
      expect(support?.chainWeight).toBe(45);
      expect(support?.attachmentSet).toEqual(expect.any(Number));
      expect(support?.chainName).toEqual(expect.any(String));
    });
  });

  it('should fall back to SUPPORT_ADR as the support name when SUPPORT_IDR is absent', async () => {
    const raw = structuredClone(fakeCanton);
    const span = raw.cantons[0]['portee unitaire'][0] as unknown as Record<string, Record<string, string | null>>;
    span['accroche depart']['SUPPORT_IDR'] = null;
    span['accroche depart']['SUPPORT_ADR'] = 'FAKE-ADR-NAME';

    const { section } = await adapter.import(sourceOf(raw));

    expect(section.supports.some((s) => s.name === 'FAKE-ADR-NAME')).toBe(true);
  });

  it('should fail with an adapter format error when the first canton is malformed', async () => {
    await expect(adapter.import(sourceOf({ cantons: [{ general: {} }] }))).rejects.toMatchObject({
      code: 'RTE_CUSTOM_FORMAT_ERROR',
      stage: 'VALIDATION',
      message: 'The section file to import is invalid.'
    });
  });

  it('should fail when required fields are missing', async () => {
    const invalid = structuredClone(fakeCanton);
    invalid.cantons[0].general.CABLE_ADR = null as unknown as string;

    await expect(adapter.import(sourceOf(invalid))).rejects.toMatchObject({
      code: 'RTE_CUSTOM_REQUIRED_FIELDS',
      message: expect.stringContaining('CABLE_ADR: null')
    });
  });
});
