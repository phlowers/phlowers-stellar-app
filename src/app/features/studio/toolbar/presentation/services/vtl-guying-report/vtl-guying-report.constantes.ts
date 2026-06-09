/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Diagram image width in mm (square ratio 1:1 — source is 2248×2248 px). */
export const DIAGRAM_WIDTH = 60;

/** PDF report labels (i18n via $localize). */
export const PDF_LABELS = {
  reportTitle: $localize`VTL & Guying report`,
  studySectionTitle: $localize`Study and section`,
  author: $localize`Author`,
  date: $localize`Date`,
  study: $localize`Study`,
  section: $localize`Section`,
  studyDescription: $localize`Description`,
  sectionComment: $localize`Comment`,
  chargeName: $localize`Load case`,
  chargeDescription: $localize`Description`,
  vtlWithoutGuyingTitle: $localize`VTL without guying`,
  chargeV: $localize`V load`,
  chargeH: $localize`H load`,
  chargeL: $localize`L load`,
  resultant: $localize`Resultant`,
  guyingTitle: $localize`Guying`,
  guyingSpan: $localize`Guyed span`,
  referenceSupport: $localize`Reference support`,
  supportType: $localize`Support type`,
  altitude: $localize`Altitude`,
  horizontalDistance: $localize`Horizontal distance`,
  hasPulley: $localize`With pulley`,
  yes: $localize`Yes`,
  no: $localize`No`,
  vtlWithGuyingTitle: $localize`VTL with guying`,
  tensionInGuy: $localize`Tension in the guy wire`,
  guyAngle: $localize`Guy wire angle / horizon`,
  chargeVUnderConsole: $localize`V load under cantilever`,
  chargeHUnderConsole: $localize`H load under cantilever`,
  chargeLIfPulley: $localize`L load (if pulley)`,
  comment: $localize`Comment`,
  vtlWithGuyingExplanation1: $localize`For a dead-end or a suspension without pulley, the tension in the guy wire balances longitudinal loads at cantilever level (no L).`,
  vtlWithGuyingExplanation2: $localize`For a suspension with pulley, the tension in the guy wire equals the maximum tension across all bundle cables and a longitudinal load appears.`,
  pageLabel: $localize`Page`
} as const;

/** Unit labels. */
export const UNITS = {
  daN: 'daN',
  meters: 'm',
  degrees: '°'
} as const;
