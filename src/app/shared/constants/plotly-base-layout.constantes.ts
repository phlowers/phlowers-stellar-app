/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Layout } from 'plotly.js-dist-min';
import { PlotlyDrawings } from './plotly-drawings.constantes';

/**
 * Base of every plot layout, spread first into each one.
 *
 * @remarks
 * Annotations, trace texts and axes take their font from `font`; hover labels do not (Plotly defaults them to Arial),
 * hence `hoverlabel.font`. Only the FontAwesome icons override the family.
 *
 * Built anew on every call: Plotly keeps the layout it is given and edits it in place (e.g. on relayout), so two
 * plots must never share its nested objects.
 */
export const getPlotlyBaseLayout = (): Partial<Layout> => ({
  autosize: true,
  showlegend: false,
  font: { family: PlotlyDrawings.plot.fontFamily },
  hoverlabel: { font: { family: PlotlyDrawings.plot.fontFamily } }
});
