import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Floor } from '@shared/domain/models/floor.model';
import { FLOOR_OBSTACLE_TYPE } from './floor-form.constantes';

/** Vertical clearance between the cable and the floor profile at its narrowest point. */
export interface FloorClearance {
  minVerticalDistance: number;
  floorAltitude: number;
  cableAltitude: number;
}

// A 3D polyline reduced to (abscissa along the span, altitude).
type Profile = { t: number; z: number }[];

// Projects 3D points onto the span's horizontal direction, so cable and floor share one abscissa.
const toProfile = (points: number[][], origin: number[], ux: number, uy: number): Profile =>
  points.map((point) => ({ t: (point[0] - origin[0]) * ux + (point[1] - origin[1]) * uy, z: point[2] }));

// Altitude of a profile at abscissa `t`, linearly interpolated, clamped to its ends.
const altitudeAt = (profile: Profile, t: number): number => {
  const next = profile.findIndex((point) => point.t >= t);
  if (next < 0) {
    return profile.at(-1)!.z;
  }
  if (next === 0) {
    return profile[0].z;
  }
  const [before, after] = [profile[next - 1], profile[next]];
  const width = after.t - before.t;
  return width === 0 ? after.z : before.z + ((after.z - before.z) * (t - before.t)) / width;
};

/**
 * Minimum vertical clearance between the cable and the floor profile over the whole span.
 *
 * The cable sags between the floor's points, so comparing altitudes at those points alone misses
 * the real minimum — a floor holding only its two support points would report the clearance at the
 * supports and nothing of the sag in between. Both curves are polylines, so their vertical gap is
 * piecewise linear and its minimum sits on a vertex of one of them: evaluating every floor point
 * plus every cable sample in between is exact for the sampled cable.
 *
 * Both polylines are absolute `[x, y, z]` coordinates from the engine (`litData.obstacles` for the
 * floor, `litData.coords.spans` for the cable), and the returned distance keeps the engine's sign
 * convention — negative when the cable passes below the floor.
 */
export function computeFloorClearance(floorPoints: number[][], cablePoints: number[][]): FloorClearance | null {
  if (floorPoints.length < 2 || cablePoints.length < 2) {
    return null;
  }
  const origin = floorPoints[0];
  const end = floorPoints.at(-1)!;
  const [dx, dy] = [end[0] - origin[0], end[1] - origin[1]];
  const spanLength = Math.hypot(dx, dy);
  if (spanLength === 0) {
    return null;
  }
  const floorProfile = toProfile(floorPoints, origin, dx / spanLength, dy / spanLength);
  const cableProfile = toProfile(cablePoints, origin, dx / spanLength, dy / spanLength);
  if (cableProfile[0].t > cableProfile.at(-1)!.t) {
    cableProfile.reverse();
  }

  const abscissae = [
    ...floorProfile.map((point) => point.t),
    ...cableProfile.map((point) => point.t).filter((t) => t > 0 && t < spanLength)
  ];
  let narrowest: FloorClearance | null = null;
  for (const t of abscissae) {
    const floorAltitude = altitudeAt(floorProfile, t);
    const cableAltitude = altitudeAt(cableProfile, t);
    const minVerticalDistance = cableAltitude - floorAltitude;
    if (!narrowest || minVerticalDistance < narrowest.minVerticalDistance) {
      narrowest = { minVerticalDistance, floorAltitude, cableAltitude };
    }
  }
  return narrowest;
}

/**
 * Re-expresses `[x, y, z]` polylines along one span's axis: the returned x is the distance from
 * `origin` measured towards `target` — the feet of the span's reference and closing supports — and
 * the lateral component is dropped, since only the profile is drawn.
 *
 * The engine frames its output on the current view (absolute section coordinates in 3D, the viewed
 * range's middle span in 2D), while floor points are distances to the reference support. Projecting
 * on that axis puts both in the same frame, and reverses it for a floor referenced from the right.
 */
export function projectOnSpanAxis(polylines: number[][][], origin: number[], target: number[]): number[][][] {
  const [dx, dy] = [target[0] - origin[0], target[1] - origin[1]];
  const spanLength = Math.hypot(dx, dy);
  if (spanLength === 0) {
    return polylines;
  }
  return polylines.map((points) =>
    toProfile(points, origin, dx / spanLength, dy / spanLength).map(({ t, z }) => [t, 0, z])
  );
}

/**
 * Maps a `Floor` to an `Obstacle`-shaped object so it can be registered through the existing
 * obstacle tasks (`addSingleObstacle`/`deleteObstacle`/`refreshProjection`) and reuse their
 * per-point vertical-distance-to-cable calculation, instead of duplicating it for floors.
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
