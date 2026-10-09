/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoggerService } from '@core/services/logger/logger.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { ChainCorrectionService } from './chain-correction.service';

describe('ChainCorrectionService', () => {
  let service: ChainCorrectionService;
  let chainsServiceMock: { getChains: ReturnType<typeof vi.fn> };
  let loggerMock: { warn: ReturnType<typeof vi.fn> };

  const buildSupport = (chainName: string | null) => ({
    ...createEmptySupport(),
    chainName,
    chainLength: 5,
    chainWeight: 50,
    chainV: false,
    chainSurface: 0.5,
    counterWeight: 42
  });

  const catalogChain = {
    chain_name: 'FAKE-CHAIN-A',
    mean_length: 1.25,
    mean_mass: 41.44,
    v_chain: true,
    chain_surface: 0
  };

  beforeEach(() => {
    chainsServiceMock = { getChains: vi.fn().mockResolvedValue([catalogChain]) };
    loggerMock = { warn: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ChainsService, useValue: chainsServiceMock },
        { provide: LoggerService, useValue: loggerMock }
      ]
    });
    service = TestBed.inject(ChainCorrectionService);
  });

  it('should take the chain details from the catalog, including zero values, and keep the counterWeight', async () => {
    const [support] = await service.correctSupports([buildSupport('FAKE-CHAIN-A')]);

    expect(support).toMatchObject({
      chainName: 'FAKE-CHAIN-A',
      chainLength: 1.25,
      chainWeight: 41.44,
      chainV: true,
      chainSurface: 0,
      counterWeight: 42
    });
  });

  it('should match the chain name ignoring surrounding whitespace', async () => {
    const [support] = await service.correctSupports([buildSupport('  FAKE-CHAIN-A ')]);

    expect(support.chainName).toBe('FAKE-CHAIN-A');
    expect(support.chainLength).toBe(1.25);
  });

  it('should keep the imported values and warn when the chain is absent from the catalog', async () => {
    const [support] = await service.correctSupports([buildSupport('FAKE-CHAIN-X')]);

    expect(support).toMatchObject({ chainName: 'FAKE-CHAIN-X', chainLength: 5, chainWeight: 50, chainSurface: 0.5 });
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('should keep the imported values and warn when the support has no chain name', async () => {
    const [support] = await service.correctSupports([buildSupport(null)]);

    expect(support.chainLength).toBe(5);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('should keep the supports unchanged when the chain catalog is empty', async () => {
    chainsServiceMock.getChains.mockResolvedValue([]);
    const supports = [buildSupport('FAKE-CHAIN-A')];

    expect(await service.correctSupports(supports)).toEqual(supports);
  });

  it('should keep the supports unchanged and warn when the chain catalog cannot be read', async () => {
    chainsServiceMock.getChains.mockRejectedValue(new Error('db down'));
    const supports = [buildSupport('FAKE-CHAIN-A')];

    expect(await service.correctSupports(supports)).toEqual(supports);
    expect(loggerMock.warn).toHaveBeenCalled();
  });
});
