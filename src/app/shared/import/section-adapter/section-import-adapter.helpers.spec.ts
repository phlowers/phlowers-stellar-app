/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SECTION_IMPORT_ADAPTERS } from './section-import-adapter.constantes';
import { SectionImportAdapter } from './section-import-adapter.interfaces';
import {
  buildImportSource,
  getFileExtension,
  isFileAccepted,
  isImportError,
  provideSectionImportAdapter,
  selectAdapter
} from './section-import-adapter.helpers';

const buildAdapter = (overrides: Partial<SectionImportAdapter> = {}): SectionImportAdapter => ({
  id: 'fake',
  formatLabel: 'Fake',
  extensions: ['.json'],
  canHandle: () => true,
  extractUuid: () => null,
  import: () => Promise.reject(new Error('not used')),
  ...overrides
});

describe('getFileExtension', () => {
  it('should return the lowercase extension with its dot', () => {
    expect(getFileExtension('Section.JSON')).toBe('.json');
    expect(getFileExtension('a.b.stsec')).toBe('.stsec');
  });

  it('should return an empty string when there is no extension', () => {
    expect(getFileExtension('section')).toBe('');
  });
});

describe('isFileAccepted', () => {
  const adapters = [buildAdapter({ extensions: ['.stsec'] }), buildAdapter({ extensions: ['.json'] })];

  it('should accept a file whose extension is declared by any adapter', () => {
    expect(isFileAccepted(adapters, 'a.stsec')).toBe(true);
    expect(isFileAccepted(adapters, 'a.JSON')).toBe(true);
  });

  it('should reject other extensions', () => {
    expect(isFileAccepted(adapters, 'a.csv')).toBe(false);
    expect(isFileAccepted([], 'a.json')).toBe(false);
  });
});

describe('buildImportSource', () => {
  it('should expose the parsed JSON', () => {
    expect(buildImportSource('a.json', '{"a":1}')).toEqual({ fileName: 'a.json', text: '{"a":1}', json: { a: 1 } });
  });

  it('should leave json undefined when the text is not valid JSON', () => {
    expect(buildImportSource('a.json', '{oops').json).toBeUndefined();
  });
});

describe('selectAdapter', () => {
  const source = buildImportSource('a.json', '{}');

  it('should return the first adapter that declares the extension and handles the content', () => {
    const first = buildAdapter({ id: 'first', canHandle: () => false });
    const second = buildAdapter({ id: 'second' });
    const third = buildAdapter({ id: 'third' });

    expect(selectAdapter([first, second, third], source)?.id).toBe('second');
  });

  it('should skip adapters that do not declare the file extension', () => {
    const other = buildAdapter({ id: 'other', extensions: ['.stsec'] });

    expect(selectAdapter([other], source)).toBeNull();
  });

  it('should treat a throwing canHandle as "not handled"', () => {
    const faulty = buildAdapter({
      id: 'faulty',
      canHandle: () => {
        throw new Error('boom');
      }
    });
    const healthy = buildAdapter({ id: 'healthy' });

    expect(selectAdapter([faulty, healthy], source)?.id).toBe('healthy');
  });

  it('should return null when no adapter is registered', () => {
    expect(selectAdapter([], source)).toBeNull();
  });
});

describe('isImportError', () => {
  it('should accept ImportError-shaped objects', () => {
    expect(isImportError({ code: 'X', message: 'm', stage: 'MAPPING' })).toBe(true);
  });

  it('should reject other values', () => {
    expect(isImportError(new Error('x'))).toBe(false);
    expect(isImportError(null)).toBe(false);
    expect(isImportError('text')).toBe(false);
    expect(isImportError({ code: 'X', message: 'm' })).toBe(false);
  });
});

describe('provideSectionImportAdapter', () => {
  @Injectable()
  class FirstAdapter implements SectionImportAdapter {
    readonly id: string = 'first';
    readonly formatLabel = 'First';
    readonly extensions = ['.json'];
    canHandle = () => true;
    extractUuid = () => null;
    import = () => Promise.reject(new Error('not used'));
  }

  @Injectable()
  class SecondAdapter extends FirstAdapter {
    override readonly id = 'second';
  }

  it('should register adapters under the multi token in provider order', () => {
    TestBed.configureTestingModule({
      providers: [...provideSectionImportAdapter(FirstAdapter), ...provideSectionImportAdapter(SecondAdapter)]
    });

    const adapters = TestBed.inject(SECTION_IMPORT_ADAPTERS);

    expect(adapters.map((adapter) => adapter.id)).toEqual(['first', 'second']);
    expect(adapters[0]).toBe(TestBed.inject(FirstAdapter));
  });
});
