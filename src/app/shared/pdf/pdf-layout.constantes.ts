/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { environment } from '@src/environments/environment';

/** Page margins in mm. */
export const PAGE_MARGIN = { top: 10, right: 15, bottom: 15, left: 15 } as const;

/** A4 page dimensions in mm. */
export const PAGE_SIZE = { width: 210, height: 297 } as const;

/** Content area width (page width minus left and right margins). */
export const CONTENT_WIDTH = PAGE_SIZE.width - PAGE_MARGIN.left - PAGE_MARGIN.right;

/** Line height in mm. */
export const LINE_HEIGHT = 5;

/** Thin line width in mm, used for title underlines and section separators. */
export const LINE_WIDTH_THIN = 0.05;

/** Paragraph indent in mm (11 pt × 0.35 mm/pt). Applied as left-column offset from PAGE_MARGIN.left. */
export const PARAGRAPH_INDENT = 3.85;

/** Font sizes in pt (spec values in px converted at 96 dpi → pt = px × 72/96). */
export const FONT_SIZES = {
  title: 11,
  sectionTitle: 10,
  label: 9,
  value: 9,
  footer: 8,
  appName: 8
} as const;

/** Application name displayed in the PDF header. */
export const APP_NAME = environment.appName;

/** Bullet point character used in lists. */
export const BULLET = '\u2022';

/** Number of decimal places for numeric values. */
export const DECIMAL_PLACES = 3;
