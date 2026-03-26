/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CatalogCable, ClimateCharge, Section, SpanLoad } from '@shared/domain';
import { View } from '@shared/types/plot.types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { Dictionary } from 'lodash';

/**
 * Available calculation tasks for the Python worker.
 *
 * @remarks
 * Each task corresponds to a specific calculation or operation
 * that can be performed by the mechaphlowers Python library.
 *
 * @category Worker Types
 */
export enum Task {
  //  Run unit tests in Python environment
  runTests = 'runTests',
  //  Calculate line geometry (LIT - Ligne Informatisée de Transport)
  getLit = 'getLit',
  // Change climate/load state and recalculate
  changeState = 'changeState',
  // Refresh the projection view
  refreshProjection = 'refreshProjection',
  // Get coordinates for support display
  getSupportCoordinates = 'getSupportCoordinates',
  // Calculate PAPOTO (field measurement) parameters
  calculatePapoto = 'calculatePapoto',
  // Calculate guying forces and angles
  calculateGuying = 'calculateGuying',
  // Set Python logging level
  setLogLevel = 'setLogLevel',
  // Calculate cable temperature from ambient conditions
  temperatureCalculation = 'temperatureCalculation',
  // Calculate parameter at 15°C without wind
  calculateParameter15CWithoutWind = 'calculateParameter15CWithoutWind',
  // Set the number of calculation points per span
  setResolution = 'setResolution',
  // Get Python-side configuration constants
  getConfig = 'getConfig',
  // Add obstacles coordinates
  addObstacle = 'addObstacles',
  // calculate obstacles distances
  calculateObstaclesDistances = 'calculateObstaclesDistances',
  /** Apply a cable length modification (lengthen or shorten) on a span */
  cableModification = 'cableModification'
}

/**
 * Error codes for data-related issues.
 *
 * @category Worker Types
 */
export enum DataError {
  /** Cable not found in catalog */
  NO_CABLE_FOUND = 'NO_CABLE_FOUND'
}

/**
 * Error codes for task execution failures.
 *
 * @category Worker Types
 */
export enum TaskError {
  /** Failed to load Pyodide runtime */
  PYODIDE_LOAD_ERROR = 'PYODIDE_LOAD_ERROR',
  /** Error during calculation execution */
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  /** Numerical solver did not converge */
  SOLVER_DID_NOT_CONVERGE = 'SOLVER_DID_NOT_CONVERGE',
  /** Unspecified error occurred */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Output structure from section geometry calculations.
 *
 * @remarks
 * Contains all geometric data needed to display the power line section,
 * including span curves, support positions, and calculated forces.
 *
 * @category Worker Types
 */
export interface GetSectionOutput {
  /** 3D coordinates of span catenary curves */
  spans: number[][][];
  /** 3D coordinates of insulator chains */
  insulators: number[][][];
  /** 3D coordinates of support structures */
  supports: number[][][];
  /** Line angle at each support (degrees) */
  line_angle: number[];
  /** VTL under chain for each support */
  vtl_under_chain: number[][];
  /** VTL under console for each support */
  vtl_under_console: number[][];
  /** Resultant force under chain */
  r_under_chain: number[];
  /** Resultant force under console */
  r_under_console: number[];
  /** Ground altitude at each support */
  ground_altitude: number[];
  /** Load angle at each support */
  load_angle: number[];
  /** Cable displacement values */
  displacement: number[][];
  /** Coordinates of applied loads by support UUID */
  loads_coords: Dictionary<number[]>;
  /** Span lengths */
  span_length: number[];
  /** Elevation values at each support */
  elevation: number[];
  /** Cable sag parameter (unitless) at each span */
  parameter: number[];
  // Slope angle of the left support of the span
  slope_left: number[];
  // Slope angle of the right support of the span
  slope_right: number[];
  /** Superior (upper) tension at each support (daN) */
  tension_sup: number[];
  /** Inferior (lower) tension at each support (daN) */
  tension_inf: number[];
  /** L0 parameter values for each span */
  L0: number[];
  /** Horizontal distance at each span (m) */
  horizontal_distance: number[];
  /** Arc length of cable in each span (m) */
  arc_length: number[];
  /** Horizontal component of cable tension at each span (daN) */
  T_h: number[];
  // sag S1 and S2
  sag: number[];
  sag_s2: number[];
  // obstacles coordinates
  obstacles?: {
    name: string;
    points: [number, number, number][];
  }[];
}

/**
 * Output structure containing both current and base state calculation results.
 *
 * @remarks
 * Used by tasks that compare a modified state against a reference (base) state.
 * The base output is null when no base state comparison is requested.
 *
 * @category Worker Types
 */
export interface GetSectionWithBaseOutput {
  current: GetSectionOutput;
  base: GetSectionOutput | null;
}

/**
 * Log level values for Python logging.
 *
 * @category Worker Types
 */
export enum LogLevel {
  /** Detailed debug information */
  DEBUG = 10,
  /** General information messages */
  INFO = 20,
  /** Warning messages */
  WARNING = 30,
  /** Error messages */
  ERROR = 40,
  /** Critical error messages */
  CRITICAL = 50
}

/**
 * Input type mapping for each task.
 *
 * @remarks
 * Defines the expected input structure for each calculation task.
 *
 * @category Worker Types
 */
export interface TaskInputs {
  /** Inputs for getLit task */
  [Task.getLit]: { section: Section; cable: CatalogCable };
  /** Inputs for runTests task */
  [Task.runTests]: undefined;
  /** Inputs for changeState task */
  [Task.changeState]: {
    climate: ClimateCharge;
    spanLoads: SpanLoad[];
  };
  /** Inputs for refreshProjection task */
  [Task.refreshProjection]: {
    startSupport: number;
    endSupport: number;
    view: View;
  };
  /** Inputs for getSupportCoordinates task */
  [Task.getSupportCoordinates]: {
    coordinates: (number | undefined)[][];
    attachmentSetNumbers: number[];
  };
  /** Inputs for calculatePapoto task */
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
  /** Inputs for calculateGuying task */
  [Task.calculateGuying]: {
    altitude: number;
    horizontalDistance: number;
    hasPulley: boolean;
    selectedSpanIndex: number;
    selectedSupport: 'LEFT' | 'RIGHT' | null;
  };
  /** Inputs for setLogLevel task */
  [Task.setLogLevel]: {
    activateDebugLogs: boolean;
  };
  /** Inputs for temperatureCalculation task */
  [Task.temperatureCalculation]: {
    cableName: string;
    ambientTemperature: number;
    longitude: number;
    latitude: number;
    altitude: number;
    azimuth: number;
    transit: number;
    date: Date | null;
    time: Date | null;
    windSpeed: number;
    windSpeedUnit: 'kmh' | 'ms';
    windDirection: string;
    skyCover: string;
  };
  /** Inputs for calculateParameter15CWithoutWind task */
  [Task.calculateParameter15CWithoutWind]: {
    parameterPapoto: number | null;
    parameterUncertaintyPapoto: number | null;
    cableTemperatureCalibration: number | null;
    cableTemperatureCalibrationUncertainty: number | null;
    span_index: number | null;
  };
  /** Inputs for setResolution task */
  [Task.setResolution]: {
    resolution: number;
  };
  /** Inputs for getConfig task: no inputs */
  [Task.getConfig]: undefined;
  // Inputs for addObstacles task
  [Task.addObstacle]: Obstacle;
  // Inputs for calculateObstaclesDistances task
  [Task.calculateObstaclesDistances]: {
    startSupport: number;
    endSupport: number;
    view: View;
  };
  /** Inputs for cableModification task */
  [Task.cableModification]: {
    spanIndex: number;
    widthCable: 'lengthening' | 'shortening';
    sizeCable: number;
    distanceSupportRef: number;
    supportRef: 'LEFT' | 'RIGHT';
  };
}

export interface DistancePoint {
  pointIndex: number;
  linePoint: [number, number, number];
  virtualPointHorizontal: [number, number, number];
  virtualPointVertical: [number, number, number];
  distanceDiagonal: number;
  distanceHorizontal: number;
  distanceVertical: number;
}

export interface Distance {
  obstacleUuid?: string;
  points: DistancePoint[];
}

/**
 * Output type mapping for each task.
 *
 * @remarks
 * Defines the expected output structure for each calculation task.
 *
 * @category Worker Types
 */
export interface TaskOutputs {
  /** Output from getLit task: section geometry with optional base state comparison */
  [Task.getLit]: GetSectionWithBaseOutput;
  /** Output from runTests task: no output data */
  [Task.runTests]: undefined;
  /** Output from changeState task: recalculated geometry with optional base state */
  [Task.changeState]: GetSectionWithBaseOutput;
  /** Output from refreshProjection task: reprojected geometry with optional base state */
  [Task.refreshProjection]: {
    sectionOutput: GetSectionWithBaseOutput;
    distances: Distance[];
  };

  /** Output from getSupportCoordinates task: 2D display coordinates for supports */
  [Task.getSupportCoordinates]: {
    shape_points: number[][];
    text_display_points: number[][];
    text_to_display: number[];
  };
  /** Output from calculatePapoto task */
  [Task.calculatePapoto]: {
    parameter: number;
    // uncertainty_parameter: number;
    parameter_1_2: number;
    parameter_2_3: number;
    parameter_1_3: number;
    check_validity: boolean;
  };
  /** Output from calculateGuying task */
  [Task.calculateGuying]: {
    tensionInGuy: number;
    guyAngle: number;
    chargeVUnderConsole: number;
    chargeHUnderConsole: number;
    chargeLIfPulley: number;
  };
  /** Output from setLogLevel task */
  [Task.setLogLevel]: undefined;
  /** Output from temperatureCalculation task */
  [Task.temperatureCalculation]: {
    cableSolarFlux: number;
    cableTemperature: number;
    cableTemperatureUncertainty: number;
  };
  /** Output from calculateParameter15CWithoutWind task */
  [Task.calculateParameter15CWithoutWind]: {
    parameter15CMinusUncertainty: number;
    parameter15C: number;
    parameter15CPlusUncertainty: number;
  };
  /** Output from setResolution task */
  [Task.setResolution]: {
    success: boolean;
    resolution: number;
  };
  /** Output from getConfig task */
  [Task.getConfig]: {
    resolution: number;
  };
  // Output from addObstacles task
  [Task.addObstacle]: GetSectionWithBaseOutput;
  // Output from calculateObstaclesDistances task
  [Task.calculateObstaclesDistances]: Distance[];
  /** Output from cableModification task: recalculated geometry with optional base state */
  [Task.cableModification]: GetSectionWithBaseOutput;
}
