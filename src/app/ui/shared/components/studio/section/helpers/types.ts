export type PlotObjectType = 'support' | 'insulator' | 'span';

type View = '2d' | '3d';
type Side = 'profile' | 'face';

interface BaseParams {
  litXs: (number | null)[];
  litYs: (number | null)[];
  litZs: (number | null)[];
  litSection: string[];
  litTypes: string[];
  litSupports: string[];
}
export interface CreateDataObjectPlotParams extends BaseParams {
  name: string;
  type: PlotObjectType;
  uniqueSupports: string[];
  side: Side;
  view: View;
}

export type CreateDataForPlotParams = BaseParams;

export interface PlotOptions {
  view: View;
  side: Side;
  startSupport: number;
  endSupport: number;
}
