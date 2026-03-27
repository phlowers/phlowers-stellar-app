import { DataObject } from './createPlotDataObject';

/** A 3D coordinate tuple [x, y, z]. */
export type Coord3 = [number, number, number];

/** Traces and optional annotation produced for one obstacle distance point. */
export interface PointVisuals {
  traces: DataObject[];
  annotation: Partial<Plotly.Annotations> | null;
}
