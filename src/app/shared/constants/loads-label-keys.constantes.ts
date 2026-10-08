/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  AnchoringType,
  CableManipMethod,
  CableManipType,
  CableModification,
  SupportAnchoringType,
  SupportManipType
} from '@shared/domain';
import { LoadType, SymmetryType } from '@shared/domain/models/charge.model';

/**
 * Transloco key maps for the loads domain enumerations.
 * Declared once here so every consumer (tables, reports, forms) translates a given
 * domain value with the same key instead of duplicating a `switch` statement.
 */

/** Load type → translation key. */
export const LOAD_TYPE_LABEL_KEYS: Record<LoadType, string> = {
  [LoadType.PUNCTUAL]: 'common.punctual-load-label',
  [LoadType.MARKING]: 'common.marking-label'
};

/** Climate symmetry type → translation key. */
export const SYMMETRY_TYPE_LABEL_KEYS: Record<SymmetryType, string> = {
  [SymmetryType.SYMMETRIC]: 'common.symmetric',
  [SymmetryType.DIS_SYMMETRIC]: 'common.dis-symmetric'
};

/** Cable length modification type → translation key. */
export const CABLE_MODIF_TYPE_LABEL_KEYS: Record<CableModification['modificationType'], string> = {
  lengthening: 'shared.studio.cable-mod-lengthening',
  shortening: 'shared.studio.cable-mod-shortening'
};

/** Support manipulation type → translation key. */
export const SUPPORT_MANIP_TYPE_LABEL_KEYS: Record<SupportManipType, string> = {
  crane: 'loads.cable-support-manip.crane-handling-option',
  rope: 'loads.cable-support-manip.rope-handling-option',
  shifting: 'loads.cable-support-manip.shifting-option'
};

/** Support manipulation anchoring → translation key. */
export const SUPPORT_ANCHORING_LABEL_KEYS: Record<SupportAnchoringType, string> = {
  without_chain: 'loads.cable-support-manip.without-chain-option',
  with_chain: 'loads.shared.with-chain-option'
};

/** Span cable manipulation type → translation key. */
export const CABLE_MANIP_TYPE_LABEL_KEYS: Record<CableManipType, string> = {
  with_a_crane: 'loads.cable-span-manip.with-a-crane-option',
  temporary_support: 'loads.cable-span-manip.temporary-support-option'
};

/** Span cable manipulation method → translation key. */
export const CABLE_MANIP_METHOD_LABEL_KEYS: Record<CableManipMethod, string> = {
  clamp: 'loads.cable-span-manip.clamp-option',
  pulley: 'loads.cable-span-manip.pulley-option'
};

/** Span manipulation anchoring → translation key. */
export const SPAN_ANCHORING_LABEL_KEYS: Record<AnchoringType, string> = {
  with_sling: 'loads.cable-span-manip.with-sling-option',
  with_chain: 'loads.shared.with-chain-option'
};
