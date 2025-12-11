import { PLOT_ID } from '@ui/pages/studio/services/plot.service';
import * as Plotly from 'plotly.js-dist-min';
import { Injectable } from '@angular/core';

const purple = '#4A355A';
const loadIcon = '&#xf5cd;';
const markingIcon = '&#xf08d;';

export enum LoadType {
  PUNCTUAL = 'punctual',
  MARKING = 'marking'
}

const annotation: Partial<Plotly.Annotations> = {
  xref: 'x' as any,
  yref: 'y' as any,
  ax: 0,
  ay: -100,
  showarrow: true,
  arrowhead: 0,
  startarrowhead: 6,
  arrowcolor: purple,
  captureevents: true,
  bordercolor: purple,
  borderpad: 6,
  bgcolor: 'rgba(0,0,0,0)',
  font: {
    family: 'FontAwesome',
    color: purple,
    size: 20
  }
  // data: 'data'
};

@Injectable({
  providedIn: 'root'
})
export class LoadsService {
  addLoadAnnotation = (coordinates: number[], loadType: LoadType) => {
    const annotations: Plotly.Annotations[] = [
      {
        ...annotation,
        x: coordinates[0],
        y: coordinates[1],
        // @ts-expect-error - zref is not typed
        z: coordinates[2],
        text: loadType === LoadType.PUNCTUAL ? loadIcon : markingIcon
      }
    ];
    Plotly.relayout(PLOT_ID, { annotations: annotations });
  };
}
