export type PlotObjectType = 'support' | 'insulator' | 'span';

interface BaseParams {
  litXs: (number | null)[];
  litYs: (number | null)[];
  litZs: (number | null)[];
  litSection: string[];
  litTypes: string[];
  litSupports: string[];
  uniqueSupports: string[];
  side: 'face' | 'profile';
}
export interface GetAllPhasesParams extends BaseParams {
  name: string;
  type: PlotObjectType;
}
export interface CreateDataForPlotParams extends BaseParams {
  uniqueSupportsForSupports: string[];
}
