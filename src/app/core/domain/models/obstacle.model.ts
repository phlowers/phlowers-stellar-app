/**
 * Obstacle domain model - represents a physical obstacle near a power line section.
 *
 * @remarks
 * Obstacles are objects (buildings, trees, rivers, etc.) located near the power line
 * that must be taken into account during mechanical calculations and clearance checks.
 * Each obstacle is referenced from a specific support and defined by a set of 3D positions.
 *
 * @category Domain Models
 */
export interface Obstacle {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the support this obstacle is referenced from */
  supportUuid: string;
  /** Display name of the obstacle */
  name: string;
  /** Type of obstacle (e.g., building, tree, river) */
  type: string;
  /** Altitude reference type */
  altitudeType: string;
  /** Which support is used as position reference */
  referenceSupport: ReferenceSupport;
  /** Reference axis for lateral distance measurement */
  lateralDistanceType: LateralDistanceType;
  /** Array of 3D positions defining the obstacle geometry */
  positions: Position3D[];
}

/**
 * 3D coordinate point used to define obstacle geometry.
 *
 * @remarks
 * Coordinates can be null when not yet specified by the user.
 *
 * @category Domain Models
 */
export interface Position3D {
  /** X coordinate (meters) */
  x: number | null;
  /** Y coordinate (meters) */
  y: number | null;
  /** Z coordinate / altitude (meters) */
  z: number | null;
}

/**
 * Reference support direction for obstacle positioning.
 *
 * @category Domain Models
 */
export enum ReferenceSupport {
  /** Left support as reference */
  LEFT = 'LEFT',
  /** Right support as reference */
  RIGHT = 'RIGHT'
}

/**
 * Axis used for lateral distance measurement of obstacles.
 *
 * @category Domain Models
 */
export enum LateralDistanceType {
  /** Distance measured along the span axis */
  SPAN_AXIS = 'SPAN_AXIS',
  /** Distance measured along the line axis */
  LINE_AXIS = 'LINE_AXIS'
}
