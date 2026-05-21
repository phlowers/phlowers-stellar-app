/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Page margins in mm. */
export const PAGE_MARGIN = { top: 15, right: 15, bottom: 15, left: 15 } as const;

/** A4 page dimensions in mm. */
export const PAGE_SIZE = { width: 210, height: 297 } as const;

/** Content area width (page width minus left and right margins). */
export const CONTENT_WIDTH = PAGE_SIZE.width - PAGE_MARGIN.left - PAGE_MARGIN.right;

/** Line height in mm. */
export const LINE_HEIGHT = 6;

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
export const APP_NAME = 'Stellar';

/** Bullet point character used in lists. */
export const BULLET = '\u2022';

/** Number of decimal places for numeric values. */
export const DECIMAL_PLACES = 3;

/** PDF report labels (i18n via $localize). */
export const PDF_LABELS = {
  reportTitle: $localize`Rapport VHL & Haubanage`,
  studySectionTitle: $localize`Etude et canton`,
  author: $localize`Auteur`,
  date: $localize`Date`,
  study: $localize`Etude`,
  section: $localize`Canton`,
  studyDescription: $localize`Description`,
  sectionComment: $localize`Commentaire`,
  chargeName: $localize`Cas de charge`,
  chargeDescription: $localize`Description`,
  vtlWithoutGuyingTitle: $localize`VHL sans haubanage`,
  chargeV: $localize`Charge V`,
  chargeH: $localize`Charge H`,
  chargeL: $localize`Charge L`,
  resultant: $localize`Résultante`,
  guyingTitle: $localize`Haubanage`,
  guyingSpan: $localize`Portée haubanée`,
  referenceSupport: $localize`Support de référence`,
  supportType: $localize`Type de support`,
  altitude: $localize`Altitude`,
  horizontalDistance: $localize`Distance horizontale`,
  hasPulley: $localize`Avec poulie`,
  yes: $localize`Oui`,
  no: $localize`Non`,
  vtlWithGuyingTitle: $localize`VHL avec haubanage`,
  tensionInGuy: $localize`Tension dans le hauban`,
  guyAngle: $localize`Angle hauban / horizon`,
  chargeVUnderConsole: $localize`Charge V sous console`,
  chargeHUnderConsole: $localize`Charge H sous console`,
  chargeLIfPulley: $localize`Charge L (si poulie)`,
  comment: $localize`Commentaire`,
  vtlWithGuyingExplanation1: $localize`Pour un arrêt ou une suspension sans poulie, la tension dans le hauban permet d'équilibrer les charges longitudinales au niveau de la console (pas de L).`,
  vtlWithGuyingExplanation2: $localize`Pour une suspension avec poulie, la tension dans le hauban vaut la tension max dans tous les câbles du faisceau et une charge longitudinale apparaît.`,
  pageFooter: $localize`Page 1 / 1`
} as const;

/** Unit labels. */
export const UNITS = {
  daN: 'daN',
  meters: 'm',
  degrees: '°'
} as const;
