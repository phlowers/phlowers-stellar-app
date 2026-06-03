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
