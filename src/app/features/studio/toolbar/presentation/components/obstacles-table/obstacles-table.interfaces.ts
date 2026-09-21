/** A single label/value option used by the obstacles table select inputs. */
export interface ObstacleTableLabelOption {
  label: string;
  value: string;
}

/** One row of the obstacles table, representing a single point of a single obstacle. */
export interface ObstacleTableRow {
  obstacleName: string;
  obstacleType: string;
  spanLabel: string;
  referenceSupportLabel: string;
  altitudeTypeLabel: string;
  lateralDistanceTypeLabel: string;
  pointNumber: number;
  altitude: number | null;
  distanceToRefSupport: number | null;
  distanceToLineAxis: number | null;
  oblique: number | null;
  vertical: number | null;
  horizontal: number | null;
}
