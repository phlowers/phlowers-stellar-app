/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { Support } from '@shared/domain';
import { ChainsService } from '@shared/catalog/services/chains.service';

/**
 * Corrects the chain details of imported supports against the local chain catalog.
 *
 * The catalog is authoritative whenever it holds `support.chainName`: `chainLength`, `chainWeight`,
 * `chainV` and `chainSurface` are all taken from the catalog entry, including when a value is `0`.
 * Chains absent from the catalog keep the imported values. `counterWeight` has no catalog
 * counterpart and is always kept.
 */
@Injectable({ providedIn: 'root' })
export class ChainCorrectionService {
  private readonly chainsService = inject(ChainsService);
  private readonly logger = inject(LoggerService);

  async correctSupports(supports: readonly Support[]): Promise<Support[]> {
    let catalogChains: Awaited<ReturnType<ChainsService['getChains']>>;
    try {
      catalogChains = await this.chainsService.getChains();
    } catch (err) {
      this.logger.warn('Error reading chain catalog, keeping imported chain values', err);
      return [...supports];
    }
    if (!catalogChains || catalogChains.length === 0) {
      return [...supports];
    }

    const catalogChainsByName = new Map(catalogChains.map((chain) => [chain.chain_name, chain]));

    return supports.map((support, index) => {
      const chainName = support.chainName?.trim();
      if (!chainName) {
        this.logger.warn(`Support #${index}: missing chain name, keeping imported chain values`);
        return support;
      }

      const catalogChain = catalogChainsByName.get(chainName);
      if (!catalogChain) {
        this.logger.warn(
          `Support #${index}: chain "${chainName}" not found in the chain catalog, keeping imported values`
        );
        return support;
      }

      return {
        ...support,
        chainName: catalogChain.chain_name,
        chainLength: catalogChain.mean_length,
        chainWeight: catalogChain.mean_mass,
        chainV: catalogChain.v_chain,
        chainSurface: catalogChain.chain_surface
      };
    });
  }
}
