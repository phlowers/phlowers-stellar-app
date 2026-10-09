/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { SectionExportService } from './section-export.service';

/** jsdom does not implement Blob.prototype.text. */
const readBlobAsText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe('SectionExportService', () => {
  let service: SectionExportService;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createdLink: HTMLAnchorElement | undefined;
  let blobs: Blob[];

  beforeEach(() => {
    blobs = [];
    createdLink = undefined;
    clickSpy = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return 'blob:section';
      }),
      revokeObjectURL: vi.fn()
    });
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = realCreateElement(tag);
      if (tag === 'a') {
        createdLink = element as HTMLAnchorElement;
        createdLink.click = clickSpy as unknown as () => void;
      }
      return element;
    });

    service = TestBed.inject(SectionExportService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should download the section as a .stsec file named after the section', () => {
    service.exportSection({ ...createEmptySection(), name: 'Section A' });

    expect(createdLink?.download).toBe('Section A.stsec');
    expect(createdLink?.href).toBe('blob:section');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:section');
  });

  it('should write the versioned Stellar envelope as JSON', async () => {
    const section = { ...createEmptySection(), name: 'Section A' };

    service.exportSection(section);

    const written = JSON.parse(await readBlobAsText(blobs[0])) as Record<string, unknown>;
    expect(written['format']).toBe('stellar-section');
    expect(written['version']).toBe(1);
    expect((written['section'] as { name: string }).name).toBe('Section A');
  });
});
