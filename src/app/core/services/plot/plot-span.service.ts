/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, Injectable, signal } from '@angular/core';
import { SpanOption } from '@shared/types/plot.types';
import { Section } from '@shared/domain';

@Injectable({
  providedIn: 'root'
})
/** Service managing span navigation state and support-index computations for the section view. */
export class PlotSpanService {
  /** Current section displayed in the studio. Kept here so span computeds have a single reactive source. */
  readonly section = signal<Section | null>(null);

  /** Current span range selection mode. */
  readonly spanAmountChoice = signal<'single' | 'double' | 'all'>('all');

  /** Computed list of span options derived from the section's supports. */
  readonly getSpanOptions = computed<SpanOption[]>(() => {
    const supports = this.section()?.supports ?? [];
    const spanCount = this.getSpanCount(supports);

    return Array.from({ length: spanCount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: supports[index]?.uuid ?? null
    }));
  });

  /**
   * Computed list of span options with both index and UUID, for consumers that need the span index.
   */
  readonly getSpanOptionsWithIndex = computed<{ label: string; value: { index: number; uuid: string } | null }[]>(
    () => {
      const supports = this.section()?.supports ?? [];
      const spanCount = this.getSpanCount(supports);

      return Array.from({ length: spanCount }, (_, index) => ({
        label: `${index + 1} - ${index + 2}`,
        value: supports[index]?.uuid && supports[index].uuid !== '' ? { index, uuid: supports[index].uuid } : null
      }));
    }
  );

  /** Return the 0-based index of the support matching the given UUID, or -1 if not found. */
  getSupportIndex(supportUuid: string): number {
    return this.section()?.supports?.findIndex((s) => s.uuid === supportUuid) ?? -1;
  }

  /** Return LEFT/RIGHT options for the span adjacent to the given support UUID. */
  getSupportOptions(supportUuid: string | null): { label: number; value: 'LEFT' | 'RIGHT' }[] {
    if (supportUuid === null) {
      return [];
    }
    const spanIndex = this.section()?.supports?.findIndex((s) => s.uuid === supportUuid);
    if (spanIndex !== undefined && spanIndex >= 0) {
      return [
        { label: spanIndex + 1, value: 'LEFT' },
        { label: spanIndex + 2, value: 'RIGHT' }
      ];
    }
    return [];
  }

  /** Reset span navigation state to initial defaults. */
  reset(): void {
    this.spanAmountChoice.set('all');
  }

  /**
   * Helper to compute the number of spans from supports count.
   * A span exists between each adjacent pair of supports, so N supports = N-1 spans.
   */
  private getSpanCount(supports: Section['supports']): number {
    return Math.max(supports.length - 1, 0);
  }
}
