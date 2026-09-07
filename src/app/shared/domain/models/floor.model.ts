/**
 * Floor domain model - represents the ground/floor profile of a span.
 *
 * @remarks
 * A floor describes the ground elevation along a span, as a series of points
 * (altitude and distance to the reference support) between the reference and
 * closing supports.
 *
 * @category Domain Models
 */

/** A single point of a floor profile. */
export interface FloorPoint {
  /** Altitude of the point (meters) */
  altitude: number | null;
  /** Distance to the reference support (meters) */
  distanceToRefSupport: number | null;
}

export interface Floor {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the span's left support (identifies the span) */
  supportUuid: string;
  /** Which support of the span is used as position reference */
  referenceSupport: 'LEFT' | 'RIGHT';
  /** Ordered points defining the floor profile, from reference to closing support */
  points: FloorPoint[];
}
