import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Floor } from '@shared/domain/models/floor.model';
import { FLOOR_OBSTACLE_TYPE } from './floor-form.constantes';

/**
 * Maps a `Floor` to an `Obstacle`-shaped object so it can be registered through the existing
 * obstacle tasks (`addSingleObstacle`/`deleteObstacle`/`refreshProjection`) and reuse their
 * vertical-distance-to-cable calculation, instead of duplicating it for floors.
 *
 * Each floor point is placed on the span axis (`y: 0`) at its distance to the reference support
 * (`x`) and altitude (`z`).
 */
export function mapFloorToObstacle(floor: Floor, supportIndex: number): Obstacle {
  return {
    uuid: floor.uuid,
    supportUuid: floor.supportUuid,
    supportIndex,
    name: `Floor ${floor.uuid.substring(0, 8)}`,
    type: FLOOR_OBSTACLE_TYPE,
    altitudeType: 'absolute',
    referenceSupport: floor.referenceSupport as ReferenceSupport,
    lateralDistanceType: LateralDistanceType.SPAN_AXIS,
    positions: floor.points.map((point) => ({ x: point.distanceToRefSupport, y: 0, z: point.altitude }))
  };
}
