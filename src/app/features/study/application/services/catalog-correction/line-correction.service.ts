/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';
import { LinesService } from '@shared/catalog/services/lines.service';
import { normalizeVoltage } from './catalog-correction.helpers';

/**
 * Corrects the voltage of an imported section against the local line catalog.
 *
 * `voltage_idr` then `voltage_adr` are compared, in order, to each catalog line's `voltage_idr`
 * after normalization (see `normalizeVoltage`). The catalog's own `voltage_idr` value is stored so it
 * matches the voltage `p-select` option exactly; `voltage_idr` is left `undefined` when nothing matches.
 */
@Injectable({ providedIn: 'root' })
export class LineCorrectionService {
  private readonly linesService = inject(LinesService);
  private readonly logger = inject(LoggerService);

  async correctVoltage(section: Section): Promise<Section> {
    const candidates = [section.voltage_idr, section.voltage_adr].filter((value): value is string => !!value);
    if (candidates.length === 0) return section;

    let catalogLines: Awaited<ReturnType<LinesService['getLines']>>;
    try {
      catalogLines = await this.linesService.getLines();
    } catch (err) {
      this.logger.warn('Error reading line catalog, cannot resolve voltage_idr', err);
      return { ...section, voltage_idr: undefined };
    }

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeVoltage(candidate);
      const match = catalogLines?.find((line) => normalizeVoltage(line.voltage_idr) === normalizedCandidate);
      if (match) return { ...section, voltage_idr: match.voltage_idr };
    }

    this.logger.warn(
      `Voltage candidates "${candidates.join('", "')}" not found in the line catalog, voltage_idr left unresolved`
    );
    return { ...section, voltage_idr: undefined };
  }
}
