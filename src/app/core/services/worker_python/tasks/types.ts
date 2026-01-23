import { CatalogCable, ClimateCharge, Section, SpanLoad } from '@core/domain';
import { View } from '@ui/shared/components/studio/section/helpers/types';

export enum Task {
  runTests = 'runTests',
  getLit = 'getLit',
  changeState = 'changeState',
  refreshProjection = 'refreshProjection',
  getSupportCoordinates = 'getSupportCoordinates',
  calculatePapoto = 'calculatePapoto',
  calculateGuying = 'calculateGuying',
  setLogLevel = 'setLogLevel',
  temperatureCalculation = 'temperatureCalculation',
  calculateParameter15CWithoutWind = 'calculateParameter15CWithoutWind'
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
  vtl_under_chain: number[][];
  vtl_under_console: number[][];
  r_under_chain: number[];
  r_under_console: number[];
  ground_altitude: number[];
  load_angle: number[];
  displacement: number[][];
  span_length: number[];
}

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARNING = 30,
  ERROR = 40,
  CRITICAL = 50
}

export interface TaskInputs {
  [Task.getLit]: { section: Section; cable: CatalogCable };
  [Task.runTests]: undefined;
  [Task.changeState]: {
    climate: ClimateCharge;
    spanLoads: SpanLoad[];
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
  [Task.setLogLevel]: {
    activateDebugLogs: boolean;
  };
  [Task.temperatureCalculation]: {
    cableName: string;
    ambientTemperature: number;
    longitude: number;
    latitude: number;
    transit: number;
    skyCover: string;
  };
  [Task.calculateParameter15CWithoutWind]: {
    parameterPapoto: number | null;
    parameterUncertaintyPapoto: number | null;
    cableTemperatureCalibration: number | null;
    cableTemperatureCalibrationUncertainty: number | null;
    span_index: number | null
  };
}

export interface TaskOutputs {
  [Task.getLit]: GetSectionOutput;
  [Task.runTests]: undefined;
  [Task.changeState]: GetSectionOutput;
  [Task.refreshProjection]: GetSectionOutput;
  [Task.getSupportCoordinates]: {
    shape_points: number[][];
    text_display_points: number[][];
    text_to_display: number[];
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
  [Task.setLogLevel]: undefined;
  [Task.temperatureCalculation]: {
    cableSolarFlux: number;
    cableTemperature: number;
    cableTemperatureUncertainty: number;
  };
  [Task.calculateParameter15CWithoutWind]: {
    parameter15CMinusUncertainty: number;
    parameter15C: number;
    parameter15CPlusUncertainty: number;
  };
}
