import { ObstaclePosition } from '@core/domain/models/obstacle.model';

export interface ObstacleFormData {
  uuid: string;
  name: string | null;
  type: string | null;
  supportUuid: string | null;
  referenceSupport: number | null;
  altitudeType: string | null;
  lateralDistanceType: string | null;
  positions: ObstaclePosition[];
}
