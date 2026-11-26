/** A single label/value option used by the obstacles table select inputs. */
export interface ObstacleTableLabelOption {
  label: string;
  value: string;
}

/**
 * One row of the obstacles table, representing a single point of a single obstacle.
 * Also one column of the obstacles table report, so a column added here must be added to its metrics.
 */
export interface ObstacleTableRow {
  obstacleName: string;
  obstacleType: string;
  // Span label built from the start and end support numbers (e.g. 'AB12C - AB13C')
  spanLabel: string;
  // Support the distance to the reference support is measured from
  referenceSupportLabel: string;
  // How the altitude is referenced (absolute NGF, relative to the support or to the cable attachment)
  altitudeTypeLabel: string;
  // Axis the distance to the line axis is measured from (span axis or line axis)
  lateralDistanceTypeLabel: string;
  pointNumber: number;
  // Altitude (m)
  altitude: number | null;
  // Distance to the reference support (m)
  distanceToRefSupport: number | null;
  // Distance to the line axis (m)
  distanceToLineAxis: number | null;
  // Oblique, vertical and horizontal distances (m), null when the engine could not compute them
  oblique: number | null;
  vertical: number | null;
  horizontal: number | null;
}
