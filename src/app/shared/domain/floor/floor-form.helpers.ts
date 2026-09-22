import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Floor } from '@shared/domain/models/floor.model';
import type { DistancePoint } from '@services/worker_python/tasks/types';
import { FLOOR_OBSTACLE_TYPE } from './floor-form.constantes';

/** Vertical clearance between the cable and the floor profile at its narrowest point. */
export interface FloorClearance {
  minVerticalDistance: number;
  floorAltitude: number;
  cableAltitude: number;
  /** Abscissa of that narrowest point along the span, from the floor's own reference support (meters). */
  minVerticalPosition: number;
}

// A 3D polyline reduced to (abscissa along the span, altitude).
type Profile = { t: number; z: number }[];

// Projects 3D points onto the span's horizontal direction, so cable and floor share one abscissa.
const toProfile = (points: number[][], origin: number[], ux: number, uy: number): Profile =>
  points.map((point) => ({ t: (point[0] - origin[0]) * ux + (point[1] - origin[1]) * uy, z: point[2] }));

// Altitude of a profile at abscissa `t`, linearly interpolated, clamped to its ends.
//
// A vertical segment (points sharing the same abscissa — the form clamps free points inclusively to
// the endpoints, so a floor may hold two points at the same distance) has no single altitude there:
// `worst` picks the one giving the narrowest clearance, the highest floor against the lowest cable.
const altitudeAt = (profile: Profile, t: number, worst: (...z: number[]) => number): number => {
  const coincident = profile.filter((point) => point.t === t);
  if (coincident.length > 0) {
    return worst(...coincident.map((point) => point.z));
  }
  const next = profile.findIndex((point) => point.t >= t);
  if (next < 0) {
    return profile.at(-1)!.z;
  }
  if (next === 0) {
    return profile[0].z;
  }
  // `t` falls strictly between the two: coincident points are handled above, so the width is never 0.
  const [before, after] = [profile[next - 1], profile[next]];
  return before.z + ((after.z - before.z) * (t - before.t)) / (after.t - before.t);
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
    const floorAltitude = altitudeAt(floorProfile, t, Math.max);
    const cableAltitude = altitudeAt(cableProfile, t, Math.min);
    const minVerticalDistance = cableAltitude - floorAltitude;
    if (!narrowest || minVerticalDistance < narrowest.minVerticalDistance) {
      narrowest = { minVerticalDistance, floorAltitude, cableAltitude, minVerticalPosition: t };
    }
  }
  return narrowest;
}

// Point of a 3D polyline at abscissa `t` of its profile, linearly interpolated, clamped to its ends.
const pointAt = (points: number[][], profile: Profile, t: number): number[] => {
  const next = profile.findIndex((point) => point.t >= t);
  if (next < 0) {
    return points.at(-1)!;
  }
  if (next === 0 || profile[next].t === t) {
    return points[next];
  }
  const ratio = (t - profile[next - 1].t) / (profile[next].t - profile[next - 1].t);
  return points[next].map((value, axis) => points[next - 1][axis] + (value - points[next - 1][axis]) * ratio);
};

/**
 * Distances for the floor points the engine could not measure, from the rendered cable instead.
 *
 * The engine measures a point in the plane crossing the span right there. A point sitting on a
 * support — a floor's first and last points always do — gets nothing back: the cable starts at the
 * insulator attachment, which does not reach past that plane (a tension chain even ends metres inside
 * the span), so the engine skips it. Here the cable altitude is read on the rendered catenary at the
 * point's abscissa, clamped to the attachment beyond its end, as `computeFloorClearance` does.
 *
 * `measured` lists the point indexes the engine already covered; the result only holds the others,
 * in the engine's `DistancePoint` shape and frame so the plot and quick measures treat them alike.
 */
export function computeMissingFloorDistances(
  floorPoints: number[][],
  cablePoints: number[][],
  measured: Set<number>
): DistancePoint[] {
  if (floorPoints.length < 2 || cablePoints.length < 2) {
    return [];
  }
  const origin = floorPoints[0];
  const end = floorPoints.at(-1)!;
  const [dx, dy] = [end[0] - origin[0], end[1] - origin[1]];
  const spanLength = Math.hypot(dx, dy);
  if (spanLength === 0) {
    return [];
  }
  const floorProfile = toProfile(floorPoints, origin, dx / spanLength, dy / spanLength);
  const cableProfile = toProfile(cablePoints, origin, dx / spanLength, dy / spanLength);
  const orderedCable = cableProfile[0].t > cableProfile.at(-1)!.t ? [...cablePoints].reverse() : cablePoints;
  if (orderedCable !== cablePoints) {
    cableProfile.reverse();
  }

  return floorPoints.flatMap((point, pointIndex) => {
    if (measured.has(pointIndex)) {
      return [];
    }
    const [x, y, z] = point;
    const linePoint = pointAt(orderedCable, cableProfile, floorProfile[pointIndex].t);
    const signedDistanceVertical = linePoint[2] - z;
    const distanceHorizontal = Math.hypot(linePoint[0] - x, linePoint[1] - y);
    return [
      {
        pointIndex,
        linePoint: [linePoint[0], linePoint[1], linePoint[2]],
        virtualPointHorizontal: [linePoint[0], linePoint[1], z],
        virtualPointVertical: [x, y, linePoint[2]],
        distanceDiagonal: Math.hypot(distanceHorizontal, signedDistanceVertical),
        distanceHorizontal,
        distanceVertical: Math.abs(signedDistanceVertical),
        signedDistanceVertical
      }
    ];
  });
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
