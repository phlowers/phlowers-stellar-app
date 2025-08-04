export type PlotObjectType = 'support' | 'insulator' | 'span';

export interface GetAllPhasesParams {
  litXs: (number | null)[];
  litYs: (number | null)[];
  litZs: (number | null)[];
  litSection: string[];
  litType: string[];
  litSupports: string[];
  uniqueSupports: string[];
  name: string;
  side: 'face' | 'profile';
  type: PlotObjectType;
}

export interface CreateDataForPlotParams {
  litXs: (number | null)[];
  litYs: (number | null)[];
  litZs: (number | null)[];
  litSection: string[];
  litTypes: string[];
  litSupports: string[];
  uniqueSupports: string[];
  uniqueSupportsForSupports: string[];
  side: 'face' | 'profile';
}
