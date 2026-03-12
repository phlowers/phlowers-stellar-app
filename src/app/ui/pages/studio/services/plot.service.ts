/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Re-export bridge — consumers in ui/shared/ still import from this path.
// Will be removed when ui/shared/components/studio/ is migrated (Phase 3F).
export {
  PlotService,
  PLOT_ID,
  checkIfProjectionNeedRefresh,
  defaultPlotOptions
} from '@features/studio/core/services/plot.service';

export type { SelectedDisplayOptions, SpanOption } from '@features/studio/core/services/plot.service';
