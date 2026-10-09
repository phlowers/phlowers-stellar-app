/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { buildImportSource } from '@shared/import/section-adapter/section-import-adapter';
import { StellarJsonAdapter } from './stellar-json.adapter';

const buildSectionJson = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  uuid: ' sec-1 ',
  name: 'Section',
  type: 'phase',
  cables_amount: 1,
  cable_name: 'ASTER570',
  supports: [{ number: '1', spanLength: 100 }, { number: '2' }],
  ...overrides
});

const sourceOf = (json: unknown, fileName = 'section.stsec') => buildImportSource(fileName, JSON.stringify(json));

describe('StellarJsonAdapter', () => {
  let adapter: StellarJsonAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StellarJsonAdapter,
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string, params?: Record<string, unknown>) =>
              params ? `${key} ${JSON.stringify(params)}` : key
          }
        }
      ]
    });
    adapter = TestBed.inject(StellarJsonAdapter);
  });

  it('should declare its identity and accepted extensions', () => {
    expect(adapter.id).toBe('stellar_json');
    expect(adapter.extensions).toEqual(['.stsec', '.json']);
    expect(adapter.formatLabel).toBe('section-import.stellar-json.format-label');
  });

  describe('canHandle()', () => {
    it('should handle a Stellar envelope, whatever its version', () => {
      expect(adapter.canHandle(sourceOf({ format: 'stellar-section', version: 99, section: {} }))).toBe(true);
    });

    it('should handle a raw section with a uuid or a supports array', () => {
      expect(adapter.canHandle(sourceOf({ uuid: 'a' }))).toBe(true);
      expect(adapter.canHandle(sourceOf({ supports: [] }))).toBe(true);
    });

    it('should not handle canton files, other envelopes or unrelated JSON', () => {
      expect(adapter.canHandle(sourceOf({ cantons: [{}], uuid: 'a' }))).toBe(false);
      expect(adapter.canHandle(sourceOf({ format: 'other', uuid: 'a' }))).toBe(false);
      expect(adapter.canHandle(sourceOf({ hello: 'world' }))).toBe(false);
      expect(adapter.canHandle(sourceOf([1, 2]))).toBe(false);
      expect(adapter.canHandle(buildImportSource('a.json', '{oops'))).toBe(false);
    });
  });

  describe('extractUuid()', () => {
    it('should return the trimmed uuid of a raw section', () => {
      expect(adapter.extractUuid(sourceOf(buildSectionJson()))).toBe('sec-1');
    });

    it('should return the trimmed uuid of the enveloped section', () => {
      const envelope = { format: 'stellar-section', version: 1, section: buildSectionJson() };
      expect(adapter.extractUuid(sourceOf(envelope))).toBe('sec-1');
    });

    it('should return null when the uuid is missing or blank', () => {
      expect(adapter.extractUuid(sourceOf({ supports: [] }))).toBeNull();
      expect(adapter.extractUuid(sourceOf(buildSectionJson({ uuid: '  ' })))).toBeNull();
      expect(adapter.extractUuid(sourceOf({ format: 'stellar-section', version: 1, section: 4 }))).toBeNull();
    });
  });

  describe('import()', () => {
    it('should map a raw section on top of the empty section defaults', async () => {
      const { section, coordinates } = await adapter.import(sourceOf(buildSectionJson({ extra: 'kept' }), 'a.json'));

      expect(section.uuid).toBe('sec-1');
      expect(section).toMatchObject({ uuid: 'sec-1', name: 'Section', cable_name: 'ASTER570', extra: 'kept' });
      expect(Object.keys(section)).toEqual(expect.arrayContaining(Object.keys(createEmptySection())));
      expect(section.supports[0]).toMatchObject({ number: '1', spanLength: 100 });
      expect(Object.keys(section.supports[0]).sort()).toEqual(Object.keys(createEmptySupport()).sort());
      expect(coordinates).toBeUndefined();
    });

    it('should map supports to an empty array when absent, empty or not an array', async () => {
      for (const supports of [undefined, [], 'nope']) {
        const { section } = await adapter.import(sourceOf(buildSectionJson({ supports }), 'a.json'));
        expect(section.supports).toEqual([]);
      }
    });

    it('should read the section and the coordinates of a version 1 envelope', async () => {
      const coordinates = { crs: 'WGS84', x: [3, null], y: [45, 46] };
      const envelope = { format: 'stellar-section', version: 1, section: buildSectionJson(), coordinates };

      const payload = await adapter.import(sourceOf(envelope));

      expect(payload.section.name).toBe('Section');
      expect(payload.coordinates).toEqual(coordinates);
    });

    it('should reject an unsupported envelope version with an adapter error', async () => {
      const envelope = { format: 'stellar-section', version: 2, section: buildSectionJson() };

      await expect(adapter.import(sourceOf(envelope))).rejects.toMatchObject({
        code: 'STELLAR_JSON_UNSUPPORTED_VERSION',
        stage: 'VALIDATION',
        message: expect.stringContaining('section-import.stellar-json.unsupported-version')
      });
    });

    it.each([
      ['a missing version', { format: 'stellar-section', section: buildSectionJson() }],
      ['a non-object section', { format: 'stellar-section', version: 1, section: 'nope' }]
    ])('should reject an envelope with %s', async (_label, envelope) => {
      await expect(adapter.import(sourceOf(envelope))).rejects.toMatchObject({ stage: 'VALIDATION' });
    });

    it.each([
      ['an unknown crs', { crs: 'EPSG', x: [1, 2], y: [1, 2] }],
      ['a length mismatch', { crs: 'WGS84', x: [1], y: [1, 2] }],
      ['a non numeric value', { crs: 'WGS84', x: ['a', 2], y: [1, 2] }],
      ['a non object block', 'nope']
    ])('should reject coordinates with %s', async (_label, coordinates) => {
      const envelope = { format: 'stellar-section', version: 1, section: buildSectionJson(), coordinates };

      await expect(adapter.import(sourceOf(envelope))).rejects.toMatchObject({
        code: 'STELLAR_JSON_INVALID_ENVELOPE',
        stage: 'VALIDATION'
      });
    });

    it('should reject content it cannot handle', async () => {
      await expect(adapter.import(sourceOf({ hello: 'world' }))).rejects.toMatchObject({
        code: 'STELLAR_JSON_INVALID_ENVELOPE'
      });
    });
  });
});
