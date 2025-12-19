import { Cable } from '@core/data/database/interfaces/cable';
import { Section } from '@core/data/database/interfaces/section';
import { View } from '@ui/shared/components/studio/section/helpers/types';

export enum Task {
  runTests = 'runTests',
  getLit = 'getLit',
  changeClimateLoad = 'changeClimateLoad',
  refreshProjection = 'refreshProjection',
  getSupportCoordinates = 'getSupportCoordinates',
  addLoad = 'addLoad',
  calculatePapoto = 'calculatePapoto',
  calculateGuying = 'calculateGuying'
}

export enum DataError {
  NO_CABLE_FOUND = 'NO_CABLE_FOUND'
}

export enum TaskError {
  PYODIDE_LOAD_ERROR = 'PYODIDE_LOAD_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  SOLVER_DID_NOT_CONVERGE = 'SOLVER_DID_NOT_CONVERGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface GetSectionOutput {
  spans: number[][][];
  insulators: number[][][];
  supports: number[][][];
  L0: number[];
  elevation: number[];
  line_angle: number[];
  vhl_under_chain: number[][];
  vhl_under_console: number[][];
  r_under_chain: number[];
  r_under_console: number[];
  ground_altitude: number[];
  load_angle: number[];
  displacement: number[][];
  span_length: number[];
}

export interface TaskInputs {
  [Task.getLit]: { section: Section; cable: Cable };
  [Task.runTests]: undefined;
  [Task.changeClimateLoad]: {
    windPressure: number;
    cableTemperature: number;
    iceThickness: number;
  };
  [Task.refreshProjection]: {
    startSupport: number;
    endSupport: number;
    view: View;
  };
  [Task.getSupportCoordinates]: {
    coordinates: (number | undefined)[][];
    attachmentSetNumbers: number[];
  };
  [Task.addLoad]: {
    supportNumber: number;
    pointLoadDist: number;
    spanLoad: number;
  };
  [Task.calculatePapoto]: {
    spanLength: number;
    measuredElevationDifference: number;
    HL: number;
    H1: number;
    H2: number;
    H3: number;
    HR: number;
    VL: number;
    V1: number;
    V2: number;
    V3: number;
    VR: number;
  };
  [Task.calculateGuying]: {
    altitude: number;
    horizontalDistance: number;
    hasPulley: boolean;
  };
}

export interface TaskOutputs {
  [Task.getLit]: GetSectionOutput;
  [Task.runTests]: undefined;
  [Task.changeClimateLoad]: GetSectionOutput;
  [Task.refreshProjection]: GetSectionOutput;
  [Task.getSupportCoordinates]: {
    shape_points: number[][];
    text_display_points: number[][];
    text_to_display: string[];
  };
  [Task.addLoad]: {
    coordinates: number[];
  };
  [Task.calculatePapoto]: {
    parameter: number;
    // uncertainty_parameter: number;
    parameter_1_2: number;
    parameter_2_3: number;
    parameter_1_3: number;
    check_validity: boolean;
  };
  [Task.calculateGuying]: {
    tensionInGuy: number;
    guyAngle: number;
    chargeVUnderConsole: number;
    chargeHUnderConsole: number;
    chargeLIfPulley: number;
  };
}
