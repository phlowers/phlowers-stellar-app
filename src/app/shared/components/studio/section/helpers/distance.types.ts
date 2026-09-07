import { DataObject } from './createPlotDataObject';

/** A 3D coordinate tuple [x, y, z]. */
export type Coord3 = [number, number, number];

/** Distance metric selectable in the quick-measures card and drawn on the plot. */
export type DistanceType = 'oblique' | 'vertical' | 'horizontal';

/** Traces and optional annotation produced for one obstacle distance point. */
export interface PointVisuals {
  traces: DataObject[];
  annotation: Partial<Plotly.Annotations> | null;
}
