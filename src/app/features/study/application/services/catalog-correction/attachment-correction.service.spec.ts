/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { AttachmentCorrectionService } from './attachment-correction.service';

describe('AttachmentCorrectionService', () => {
  let service: AttachmentCorrectionService;
  let attachmentServiceMock: { resolveCatalogAttachment: ReturnType<typeof vi.fn> };

  const buildSupport = (name: string | null, attachmentSet: number | null) => ({
    ...createEmptySupport(),
    name,
    attachmentSet,
    armLength: 3,
    heightBelowConsole: 2.5
  });

  beforeEach(() => {
    attachmentServiceMock = { resolveCatalogAttachment: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [{ provide: AttachmentService, useValue: attachmentServiceMock }]
    });
    service = TestBed.inject(AttachmentCorrectionService);
  });

  it('should look the support up by name and attachment set only', async () => {
    await service.correctSupports([buildSupport('FAKE-SUP-A', 19)]);

    expect(attachmentServiceMock.resolveCatalogAttachment).toHaveBeenCalledWith('FAKE-SUP-A', null, 19);
  });

  it('should take attachmentSet, armLength and heightBelowConsole from the catalog entry', async () => {
    attachmentServiceMock.resolveCatalogAttachment.mockResolvedValue({
      attachment_set: 7,
      cross_arm_length: -6,
      attachment_altitude: 20
    });

    const { supports, hasMissingCatalogEntries } = await service.correctSupports([buildSupport('FAKE-SUP-A', 19)]);

    expect(supports[0]).toMatchObject({ name: 'FAKE-SUP-A', attachmentSet: 7, armLength: -6, heightBelowConsole: 20 });
    expect(hasMissingCatalogEntries).toBe(false);
  });

  it('should accept zero values from the catalog', async () => {
    attachmentServiceMock.resolveCatalogAttachment.mockResolvedValue({
      attachment_set: 0,
      cross_arm_length: 0,
      attachment_altitude: 0
    });

    const { supports } = await service.correctSupports([buildSupport('FAKE-SUP-A', 19)]);

    expect(supports[0]).toMatchObject({ attachmentSet: 0, armLength: 0, heightBelowConsole: 0 });
  });

  it('should keep the imported values and flag a missing entry when the catalog has no complete match', async () => {
    const { supports, hasMissingCatalogEntries } = await service.correctSupports([buildSupport('FAKE-SUP-A', 19)]);

    expect(supports[0]).toMatchObject({ attachmentSet: 19, armLength: 3, heightBelowConsole: 2.5 });
    expect(hasMissingCatalogEntries).toBe(true);
  });

  it('should only correct the supports found in the catalog', async () => {
    attachmentServiceMock.resolveCatalogAttachment.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'FAKE-SUP-A' ? { attachment_set: 7, cross_arm_length: 1, attachment_altitude: 2 } : undefined
      )
    );

    const { supports, hasMissingCatalogEntries } = await service.correctSupports([
      buildSupport('FAKE-SUP-A', 19),
      buildSupport('FAKE-SUP-B', 19)
    ]);

    expect(supports.map((s) => s.attachmentSet)).toEqual([7, 19]);
    expect(hasMissingCatalogEntries).toBe(true);
  });

  it('should return an empty result for no support', async () => {
    expect(await service.correctSupports([])).toEqual({ supports: [], hasMissingCatalogEntries: false });
  });
});
