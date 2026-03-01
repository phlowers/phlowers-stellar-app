/**
 * Ground domain model - represents a ground/terrain profile point near a power line section.
 *
 * @remarks
 * Ground profiles define the terrain surface below the electrical line.
 * Unlike obstacles, ground points only have X (distance) and Z (altitude) coordinates
 * since the ground is directly below the line (no lateral Y offset).
 *
 * @category Domain Models
 */
export interface Ground {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the support this ground point is referenced from */
  supportUuid: string;
  /** Altitude reference type */
  altitudeType: string;
  /** Which support is used as position reference */
  referenceSupport: GroundReferenceSupport;
  /** Array of 2D positions defining the ground profile */
  positions: GroundPosition[];
}

/**
 * 2D coordinate point used to define ground profile geometry.
 *
 * @remarks
 * Only X (distance along span) and Z (altitude) are needed since ground
 * is directly below the electrical line.
 * Coordinates can be null when not yet specified by the user.
 *
 * @category Domain Models
 */
export interface GroundPosition {
  /** X coordinate — distance from reference support (meters) */
  x: number | null;
  /** Z coordinate — altitude (meters) */
  z: number | null;
}

/**
 * Reference support direction for ground positioning.
 *
 * @category Domain Models
 */
export enum GroundReferenceSupport {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}
