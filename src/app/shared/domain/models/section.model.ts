/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from './field-measure.model';
import { Charge } from './charge.model';
import { InitialCondition } from './initial-condition.model';
import { Support } from './support.model';
import { VtlAndGuying } from './vtl-and-guying.model';
import { Obstacle } from './obstacle.model';
import { CableModification } from './cable-modification.model';
import { CableSpanManipulation } from './cable-span-manipulation.model';

/**
 * Section domain model - represents a power line section.
 *
 * @remarks
 * A section is a contiguous portion of a power line between two anchor supports.
 * It contains all the technical data required for mechanical calculations
 * including supports, cables, initial conditions, and charges.
 *
 * @example
 * ```typescript
 * const section: Section = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   internal_id: 'SEC-001',
 *   name: 'Section A-B',
 *   short_name: 'A-B',
 *   type: 'phase',
 *   supports: [],
 *   initial_conditions: [],
 *   charges: [],
 *   // ... other properties
 * };
 * ```
 *
 * @category Domain Models
 */
export interface Section {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Internal identifier for the section */
  internal_id: string;
  /** Full name of the section */
  name: string;
  /** Short display name */
  short_name: string;
  /** ISO 8601 timestamp of creation */
  created_at: string;
  /** ISO 8601 timestamp of last update */
  updated_at: string;
  /** Reference to catalog entry */
  internal_catalog_id: string;
  /** Type of section (e.g., 'phase', 'guard') */
  type: string;
  /** Number of electric phases */
  electric_phase_number: number | undefined;
  /** Name of the cable used */
  cable_name: string | undefined;
  /** Short name of the cable */
  cable_short_name: string;
  /** Number of cables in the section */
  cables_amount: number;
  /** Number of optical fibers */
  optical_fibers_amount: number;
  /** Number of spans in the section */
  spans_amount: number;
  /** Name of the first span */
  begin_span_name: string;
  /** Name of the last span */
  last_span_name: string;
  /** Number of the first support */
  first_support_number: number;
  /** Number of the last support */
  last_support_number: number;
  /** First attachment set identifier */
  first_attachment_set: string;
  /** Last attachment set identifier */
  last_attachment_set: string;
  /** Regional maintenance center names */
  regional_maintenance_center_names: string[];
  /** Maintenance center names */
  maintenance_center_names: string[];
  /** Regional team identifier */
  regional_team_id: string | undefined;
  /** Maintenance team identifier */
  maintenance_team_id: string | undefined;
  /** Maintenance center identifier */
  maintenance_center_id: string | undefined;
  /** Link name reference */
  link_name: string | undefined;
  /** LIT code identifier */
  lit_code: string | undefined;
  /** LIT name */
  lit_name: string | undefined;
  /** Branch name */
  branch_name: string | undefined;
  /** Branch IDR reference */
  branch_idr: string | undefined;
  /** Voltage IDR reference */
  voltage_idr: string | undefined;
  /** General comment */
  comment: string | undefined;
  /** Comment about supports */
  supports_comment: string | undefined;
  /** Array of support structures in the section */
  supports: Support[];
  /** Array of obstacles near the section */
  obstacles: Obstacle[];
  /** Array of initial conditions for calculations */
  initial_conditions: InitialCondition[];
  /** UUID of the currently selected initial condition */
  selected_initial_condition_uuid: string | undefined;
  /** Array of charge/load conditions */
  charges: Charge[];
  /** UUID of the currently selected charge */
  selected_charge_uuid: string | null;
  /** Array of field measurements */
  field_measures: FieldMeasure[];
  /** UUID of the currently selected field measure */
  selected_field_measure_uuid: string | undefined;
  /** VTL and guying calculation data */
  vtl_and_guying: VtlAndGuying | undefined;
  /** Array of cable length modifications on this section's spans */
  cable_modifications: CableModification[];
  /** UUID of the currently selected cable modification */
  selected_cable_modification_uuid: string | null;
  /** Array of cable span manipulations on this section's spans */
  cable_span_manipulations: CableSpanManipulation[];
  /** UUID of the currently selected cable span manipulation */
  selected_cable_span_manipulation_uuid: string | null;
  /** Latitude of the first support */
  startLatitude: number | null;
  /** Longitude of the first support */
  startLongitude: number | null;
  /** Azimuth of the first support */
  startAzimuth: number | null;
}
