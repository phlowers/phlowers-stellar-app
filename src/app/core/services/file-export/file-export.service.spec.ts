/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { FileExportService } from './file-export.service';
import { FileExportOptions } from './file-export.interfaces';

type PickerFn = NonNullable<typeof globalThis.showSaveFilePicker>;

const OPTIONS: FileExportOptions = {
  mimeType: 'text/csv;charset=utf-8',
  pickerTypes: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }]
};

describe('FileExportService', () => {
  const originalPicker = globalThis.showSaveFilePicker;
  let service: FileExportService;
  let logger: { error: ReturnType<typeof vi.fn> };
  let link: HTMLAnchorElement;
  let click: ReturnType<typeof vi.spyOn>;
  let createUrl: ReturnType<typeof vi.spyOn>;
  let revokeUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = { error: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LoggerService, useValue: logger }] });
    service = TestBed.inject(FileExportService);

    const document = TestBed.inject(DOCUMENT);
    link = document.createElement('a');
    click = vi.spyOn(link, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.showSaveFilePicker = originalPicker;
    vi.restoreAllMocks();
  });

  const expectDownloaded = async (): Promise<void> => {
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toBe(OPTIONS.mimeType);
    expect(await blob.text()).toBe('a;b');
    expect(link.href).toBe('blob:file');
    expect(link.download).toBe('export.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:file');
  };

  it('should write the content through the save file picker', async () => {
    const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    const picker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue(writable) });
    globalThis.showSaveFilePicker = picker as unknown as PickerFn;

    await expect(service.save('a;b', 'export.csv', OPTIONS)).resolves.toBe('saved');

    expect(picker).toHaveBeenCalledWith({ suggestedName: 'export.csv', types: OPTIONS.pickerTypes });
    expect(writable.write).toHaveBeenCalledWith('a;b');
    expect(writable.close).toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('should write nothing when the user cancels the picker', async () => {
    globalThis.showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError')) as unknown as PickerFn;

    await expect(service.save('a;b', 'export.csv', OPTIONS)).resolves.toBe('cancelled');

    expect(logger.error).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('should log the error and download the file when the picker fails', async () => {
    const error = new Error('denied');
    globalThis.showSaveFilePicker = vi.fn().mockRejectedValue(error) as unknown as PickerFn;

    await expect(service.save('a;b', 'export.csv', OPTIONS)).resolves.toBe('downloaded');

    expect(logger.error).toHaveBeenCalledWith(expect.any(String), error);
    await expectDownloaded();
  });

  it('should download the file when the picker is unavailable', async () => {
    globalThis.showSaveFilePicker = undefined;

    await expect(service.save('a;b', 'export.csv', OPTIONS)).resolves.toBe('downloaded');

    expect(logger.error).not.toHaveBeenCalled();
    await expectDownloaded();
  });
});
