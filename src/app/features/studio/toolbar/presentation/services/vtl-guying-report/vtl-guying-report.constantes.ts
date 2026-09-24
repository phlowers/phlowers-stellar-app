/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PdfLabels } from './vtl-guying-report.interfaces';

/** Diagram image width in mm (square ratio 1:1 — source is 2248×2248 px). */
export const DIAGRAM_WIDTH = 60;

/** Transloco translation keys for each PDF report label, resolved at report-generation time. */
export const PDF_LABEL_KEYS: PdfLabels = {
  reportTitle: 'studio.vtl-guying-report.title',
  studySectionTitle: 'common.study-and-section-label',
  author: 'common.author-label',
  date: 'common.date-label',
  study: 'common.study-label',
  section: 'common.section-label',
  studyDescription: 'common.description-label',
  sectionComment: 'common.comment-label',
  chargeName: 'common.load-name-label',
  chargeDescription: 'common.description-label',
  vtlWithoutGuyingTitle: 'studio.vtl-and-guying.vtl-without-guying-title',
  chargeV: 'studio.vtl-guying-report.load-v-label',
  chargeH: 'studio.vtl-guying-report.load-h-label',
  chargeL: 'studio.vtl-guying-report.load-l-label',
  resultant: 'studio.vtl-and-guying.resultant-label',
  guyingTitle: 'studio.vtl-and-guying.guying-title',
  guyingSpan: 'studio.vtl-guying-report.guying-span-label',
  referenceSupport: 'common.reference-support-label',
  supportType: 'studio.vtl-guying-report.support-type-label',
  altitude: 'common.altitude-label',
  horizontalDistance: 'studio.vtl-and-guying.horizontal-distance-label',
  hasPulley: 'studio.vtl-and-guying.with-pulley-label',
  yes: 'common.yes',
  no: 'common.no',
  vtlWithGuyingTitle: 'studio.vtl-guying-report.vtl-with-guying-title',
  tensionInGuy: 'studio.vtl-guying-report.tension-in-guy-wire-label',
  guyAngle: 'studio.vtl-guying-report.guy-angle-label',
  chargeVUnderConsole: 'studio.vtl-guying-report.load-v-under-console-label',
  chargeHUnderConsole: 'studio.vtl-guying-report.load-h-under-console-label',
  chargeLIfPulley: 'studio.vtl-guying-report.load-l-if-pulley-label',
  comment: 'common.comment-label',
  vtlWithGuyingExplanation1: 'studio.vtl-guying-report.explanation-1',
  vtlWithGuyingExplanation2: 'studio.vtl-guying-report.explanation-2',
  pageLabel: 'common.page-label'
};
