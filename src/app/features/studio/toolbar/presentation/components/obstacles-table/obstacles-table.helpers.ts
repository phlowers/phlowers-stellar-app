import { Distance } from '@services/worker_python/tasks/types';
import { Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { ObstacleTableLabelOption, ObstacleTableRow } from './obstacles-table.interfaces';

const findLabel = (options: ObstacleTableLabelOption[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

/**
 * Builds one table row per obstacle point (position) for the given obstacles, resolving
 * catalog/enum values to their display labels and joining pre-computed distances by point index.
 * Span label and reference support options are resolved per obstacle (keyed by its own span/support
 * uuid) so obstacles from several spans can be listed together (e.g. the "all spans" filter).
 */
export function buildObstacleTableRows(
  obstacles: Obstacle[],
  distances: Distance[],
  spanLabelByUuid: Map<string, string>,
  referenceSupportOptionsByUuid: Map<string, { label: string; value: ReferenceSupport }[]>,
  obstacleTypeOptions: ObstacleTableLabelOption[],
  altitudeTypeOptions: ObstacleTableLabelOption[],
  lateralDistanceTypeOptions: ObstacleTableLabelOption[]
): ObstacleTableRow[] {
  const rows: ObstacleTableRow[] = [];

  obstacles.forEach((obstacle) => {
    // Distances can hold several entries per obstacle uuid; flatten all their points before matching.
    const distancePoints = distances.filter((d) => d.obstacleUuid === obstacle.uuid).flatMap((d) => d.points);
    const spanLabel = spanLabelByUuid.get(obstacle.supportUuid) ?? '-';
    const referenceSupportOptions = referenceSupportOptionsByUuid.get(obstacle.supportUuid) ?? [];
    const referenceSupportLabel =
      referenceSupportOptions.find((option) => option.value === obstacle.referenceSupport)?.label ?? '-';
    const obstacleType = findLabel(obstacleTypeOptions, obstacle.type);
    const altitudeType = findLabel(altitudeTypeOptions, obstacle.altitudeType);
    const lateralDistanceType = findLabel(lateralDistanceTypeOptions, obstacle.lateralDistanceType);

    obstacle.positions.forEach((position, pointIndex) => {
      const distancePoint = distancePoints.find((point) => point.pointIndex === pointIndex);

      rows.push({
        obstacleName: obstacle.name,
        obstacleType,
        spanLabel,
        referenceSupportLabel,
        altitudeTypeLabel: altitudeType,
        lateralDistanceTypeLabel: lateralDistanceType,
        pointNumber: pointIndex + 1,
        altitude: position.z,
        distanceToRefSupport: position.x,
        distanceToLineAxis: position.y,
        oblique: distancePoint?.distanceDiagonal ?? null,
        vertical: distancePoint?.distanceVertical ?? null,
        horizontal: distancePoint?.distanceHorizontal ?? null
      });
    });
  });

  return rows;
}
