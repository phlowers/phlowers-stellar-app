export type PlotObjectsType =
  | 'supports'
  | 'insulators'
  | 'spans'
  | 'span'
  | 'support'
  | 'insulator';

export type View = '2d' | '3d';
export type Side = 'profile' | 'face';

export interface PlotOptions {
  view: View;
  side: Side;
  startSupport: number;
  endSupport: number;
  invert: boolean;
}
