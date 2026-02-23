export interface Obstacle {
  uuid: string;
  supportUuid: string;
  name: string;
  type: string;
  altitudeType: string;
  referenceSupport: ReferenceSupport;
  lateralDistanceType: LateralDistanceType;
  positions: Position3D[];
}

export interface Position3D {
  x: number | null;
  y: number | null;
  z: number | null;
}

export enum ReferenceSupport {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export enum LateralDistanceType {
  SPAN_AXIS = 'SPAN_AXIS',
  LINE_AXIS = 'LINE_AXIS'
}
