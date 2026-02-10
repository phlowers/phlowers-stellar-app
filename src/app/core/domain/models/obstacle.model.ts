export interface Obstacle {
  uuid: string;
  supportUuid: string;
  name: string;
  type: string;
  altitudeType: string;
  referenceSupport: number | null;
  lateralDistanceType: string;
  positions: ObstaclePosition[];
}

export interface ObstaclePosition {
  x: number | null;
  y: number | null;
  z: number | null;
}
