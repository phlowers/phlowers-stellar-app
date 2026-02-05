/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Section, Support } from '@core/domain';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper functions for creating section and support objects.
 *
 * @remarks
 * These factory functions provide default values for creating
 * new sections and supports with proper UUIDs.
 *
 * @packageDocumentation
 * @category Helpers
 */

/**
 * Creates an empty support with default values.
 *
 * @returns A new Support object with a generated UUID and null/default values
 *
 * @example
 * ```typescript
 * const support = createEmptySupport();
 * support.number = '42';
 * support.attachmentHeight = 25;
 * ```
 */
export const createEmptySupport = (): Support => {
  return {
    uuid: uuidv4(),
    number: null,
    name: null,
    spanLength: null,
    spanAngle: 0,
    attachmentSet: null,
    attachmentHeight: null,
    heightBelowConsole: null,
    towerModel: null,
    cableType: null,
    armLength: 0,
    chainName: null,
    chainLength: 0,
    chainWeight: 0,
    chainV: false,
    counterWeight: 0,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: 0
  };
};

/**
 * Creates a pair of supports for section boundaries.
 *
 * @returns Array containing first and last support
 * @internal
 */
const createFirstAndLastSupport = (): Support[] => {
  return [createEmptySupport(), { ...createEmptySupport(), spanLength: null }];
};

/**
 * Creates an empty section with default values.
 *
 * @returns A new Section object with a generated UUID, empty supports, and default values
 *
 * @example
 * ```typescript
 * const section = createEmptySection();
 * section.name = 'New Section';
 * section.cable_name = 'ASTER_570';
 * ```
 */
export const createEmptySection = (): Section => {
  return {
    uuid: uuidv4(),
    name: '',
    type: 'phase',
    electric_phase_number: 0,
    cables_amount: 1,
    cable_name: undefined,
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    supports: createFirstAndLastSupport(),
    internal_id: '',
    short_name: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    internal_catalog_id: '',
    cable_short_name: '',
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    voltage_idr: undefined,
    link_name: undefined,
    lit_code: undefined,
    lit_name: undefined,
    branch_name: undefined,
    branch_idr: undefined,
    comment: undefined,
    supports_comment: undefined,
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };
};
