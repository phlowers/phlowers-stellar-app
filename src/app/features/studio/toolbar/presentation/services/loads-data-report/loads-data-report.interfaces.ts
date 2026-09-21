/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CableModification } from '@shared/domain/models/cable-modification.model';
import { CableSpanManipulation } from '@shared/domain/models/cable-span-manipulation.model';
import { CableSupportManipItem } from '@shared/domain/models/cable-support-manipulation.model';
import { ClimateCharge, SpanLoad } from '@shared/domain/models/charge.model';
import { BaseReportLabels } from '@shared/pdf/pdf-report.interfaces';

/**
 * Span load row for the charges report — derived from the domain `SpanLoad`, resolved labels
 * added. `type` holds the already-translated label (not the raw domain code) since the
 * transposed-table renderer displays it as-is (no translation hook for cell values).
 */
export interface SpanLoadReportRow extends Omit<SpanLoad, 'supportUuid' | 'referenceSupport' | 'type'> {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Translated load type label (e.g. 'Punctual') */
  type: string;
}

/**
 * Cable modification row for the charges report — derived from the domain `CableModification`,
 * resolved labels added. `modificationType` holds the already-translated label (not the raw
 * domain code) since the transposed-table renderer displays it as-is.
 */
export interface CableModifReportRow
  extends Omit<CableModification, 'uuid' | 'spanUuid' | 'supportRef' | 'modificationType'> {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Translated modification type label (e.g. 'Lengthening') */
  modificationType: string;
}

/**
 * Support manipulation row for the charges report — derived from the domain
 * `CableSupportManipItem`. `type`/`anchoring` hold already-translated labels (not the raw domain
 * codes) since the transposed-table renderer displays them as-is.
 */
export interface SupportManipReportRow extends Omit<CableSupportManipItem, 'type' | 'anchoring'> {
  /** Display index (1-based; empty string for the second line of the same manipulation, if any) */
  displayIndex: string;
  /** Support label (e.g. 'S1') */
  supportLabel: string;
  /** Translated manipulation type label (e.g. 'Crane handling') */
  type: string;
  /** Translated anchoring label (crane only) */
  anchoring: string | null;
}

/**
 * Span manipulation row for the charges report — derived from the domain
 * `CableSpanManipulation`. `cableManipType`/`cableManipMethod`/`anchoring` hold already-translated
 * labels (not the raw domain codes) since the transposed-table renderer displays them as-is.
 */
export interface SpanManipReportRow
  extends Omit<
    CableSpanManipulation,
    'uuid' | 'spanUuid' | 'chargeUuid' | 'referenceSupport' | 'slingLength' | 'cableManipType' | 'cableManipMethod' | 'anchoring'
  > {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Translated cable manipulation type label (e.g. 'With a crane') */
  cableManipType: string;
  /** Translated cable manipulation method label (e.g. 'Clamp') */
  cableManipMethod: string;
  /** Translated anchoring label */
  anchoring: string;
  /** Sling length (m, with_sling only) */
  slingLength: number | null;
}

/** Data required to generate the loads table PDF report. */
export interface LoadsReportData {
  /** Report generation date/time (localized string, used for header and filename) */
  date: string;

  // Study & canton cartouche metadata
  author: string;
  studyTitle: string;
  studyDescription: string;
  cantonName: string;
  cantonComment: string;
  icName: string;

  // Charge case metadata
  chargeName: string;
  chargeDescription: string;
  personnelPresence: boolean;

  // Climate (always 1 row)
  climate: ClimateCharge;

  // Loads and markings (0+ rows)
  spanLoads: SpanLoadReportRow[];

  // Cable length modifications (0+ rows)
  cableModifications: CableModifReportRow[];

  // Support manipulations (0+ rows, may have 2 lines per entry)
  supportManipulations: SupportManipReportRow[];

  // Span manipulations (0+ rows)
  spanManipulations: SpanManipReportRow[];
}

/** Translation labels for the loads report. */
export interface LoadsReportLabels extends BaseReportLabels {
  reportTitle: string;
  cartoucheTitle: string;
  climateTitle: string;
  loadsTitle: string;
  cableModifTitle: string;
  supportManipTitle: string;
  spanManipTitle: string;
  pageLabel: string;

  chargeName: string;
  chargeDescription: string;
  canton: string;
  cantonComment: string;
  initialCondition: string;
  personnelPresence: string;
  yes: string;
  no: string;

  // Climate bullets
  windPressure: string;
  cableTemperature: string;
  iceIndicator: string;
  symmetric: string;
  disSymmetric: string;
  iceThickness: string;
  frontierSupport: string;
  iceThicknessBefore: string;
  iceThicknessAfter: string;

  // Shared column headers
  span: string;
  referenceSupport: string;
  distanceToRefSupport: string;
  lateralDistance: string;
  anchoring: string;
  chainName: string;
  chainLength: string;
  chainWeight: string;
  chainSurface: string;
  counterWeight: string;

  // Loads and markings table
  loadType: string;
  loadValue: string;

  // Cable length modifications table
  modificationType: string;
  modifiedLength: string;

  // Support manipulations table
  index: string;
  support: string;
  manipType: string;
  shiftingClampLength: string;
  vertDisplacement: string;
  ropeLength: string;

  // Span manipulations table
  cableManipType: string;
  cableManipMethod: string;
  longitudinalDistance: string;
  altitude: string;
  slingLength: string;
}
