/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Cable manipulation type — defines how the cable is lifted.
 *
 * @category Domain Models
 */
export type CableManipType = 'with_a_crane' | 'temporary_support';

/**
 * Cable manipulation method — defines how the cable is attached during manipulation.
 *
 * @category Domain Models
 */
export type CableManipMethod = 'clamp' | 'pulley';

/**
 * Anchoring type — defines how the cable is anchored during manipulation.
 *
 * @category Domain Models
 */
export type AnchoringType = 'with_sling' | 'with_chain';

/**
 * Represents a cable span manipulation on a span.
 *
 * @remarks
 * Stores all parameters needed to describe how a cable is physically
 * manipulated on a given span: crane or temporary support, anchoring
 * type (sling or chain), fixed-point position, and related accessories.
 *
 * @category Domain Models
 */
export interface CableSpanManipulation {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the span this manipulation applies to */
  spanUuid: string;
  /** Reference support used as origin for position measurements */
  referenceSupport: 'LEFT' | 'RIGHT';
  /** Distance from the reference support to the manipulated point on the cable (meters) */
  distanceToRefSupport: number;
  /** Type of cable manipulation */
  cableManipType: CableManipType;
  /** Method of cable manipulation */
  cableManipMethod: CableManipMethod;
  /** Longitudinal distance of the fixed point in meters (only for 'with_a_crane') */
  longitudinalDistance: number | null;
  /** Lateral distance of the fixed point in meters */
  lateralDistance: number;
  /** Altitude of the fixed point in meters */
  altitude: number;
  /** Anchoring type */
  anchoring: AnchoringType;
  /** Chain name (for 'with_chain' anchoring) */
  chainName: string | null;
  /** Chain length in meters (for 'with_chain' anchoring) */
  chainLength: number | null;
  /** Chain weight in kg (for 'with_chain' anchoring) */
  chainWeight: number | null;
  /** Chain surface in m² (for 'with_chain' anchoring) */
  chainSurface: number | null;
  /** Counter weight in kg (for 'with_chain' anchoring) */
  counterWeight: number | null;
  /** Sling length in meters (for 'with_sling' anchoring), default 5 */
  slingLength: number;
}
