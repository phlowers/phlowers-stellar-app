/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CatalogCable, ClimateCharge, PapotoResult, Section, SpanLoad } from '@shared/domain';
import { View } from '@shared/types/plot.types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { PoseResults } from '@shared/domain/models/section.model';

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
  //  Initialize line geometry (LIT - Ligne Informatisée de Transport)
  initLit = 'initLit',
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
  // Add obstacles in bulk
  addBulkObstacles = 'addBulkObstacles',
  // Add a single obstacle
  addSingleObstacle = 'addSingleObstacle',
  // Delete a single obstacle from the middleware state by UUID
  deleteObstacle = 'deleteObstacle',
  // Clear all obstacles from the middleware state
  clearObstacles = 'clearObstacles',
  /** Apply a cable length modification (lengthen or shorten) on a span */
  shortenLengthenCable = 'shortenLengthenCable',
  // get aspect ratio for plotting scale
  getAspectRatio = 'getAspectRatio',
  // get wind incidence angle for cable temperature calculation
  getWindIncidence = 'getWindIncidence',
  // compute gps and lambert 93 coordinates using section data and starting gps point
  computeLocalization = 'computeLocalization',
  // compute gps coordinates using imported lambert data
  importLambert = 'importLambert',
  // lambert to gps and compare to gps coordinates using section data
  importLambertAndValidate = 'importLambertAndValidate',
  // get equivalent span/ruling span value
  getEquivalentSpan = 'getEquivalentSpan',
  // compute pose table at different temperatures
  getPoseTable = 'getPoseTable',
  // Remove all span loads from the engine
  deleteAllLoads = 'deleteAllLoads',
  // Remove a single span load from the engine by span index
  deleteLoad = 'deleteLoad',
  // Apply span loads to the engine (via apply_span_loads)
  setLoads = 'setLoads',
  // Measure distance and angle between 2 or 3 points
  measureDistance = 'measureDistance',
  // Add distance/angle measurement points to the study's position engine
  addMeasureDistanceAnglePoints = 'addMeasureDistanceAnglePoints',
  // Clear all distance/angle measurement points from the study's position engine
  clearMeasureDistanceAnglePoints = 'clearMeasureDistanceAnglePoints',
  // Compute obstacle conformity zones and points
  getConformity = 'getConformity'
}

/**
 * Error codes for data-related issues.
 *
 * @category Worker Types
 */
export enum DataError {
  /** Cable not found in catalog */
  NO_CABLE_FOUND = 'NO_CABLE_FOUND',
  /** No initial condition configured or selected for this section */
  NO_INITIAL_CONDITION = 'NO_INITIAL_CONDITION'
}

/**
 * Python exception class names raised by the mechaphlowers library.
 * Used to map Python-side errors to localized user-facing messages.
 *
 * @category Worker Types
 */
export enum PythonErrorCode {
  /** Generic solver error */
  SolverError = 'SolverError',
  /** Insulator chain suspected to have reversed above horizontal position */
  SuspectedChainReversal = 'SuspectedChainReversal',
  /** Numerical solver failed to converge */
  ConvergenceError = 'ConvergenceError',
  /** Shape mismatch detected in arrays */
  ShapeError = 'ShapeError',
  /** Data-related warning */
  DataWarning = 'DataWarning',
  /** Balance engine warning */
  BalanceEngineWarning = 'BalanceEngineWarning',
  /** RTS catalog data missing or contains NaN values */
  RtsDataNotAvailable = 'RtsDataNotAvailable',
  /** Specific Python warning raised by mechaphlowers DistanceEngine */
  NoIntersectionPlaneWarning = 'NoIntersectionPlaneWarning',
  /** Raised when measurement data are not available for computation */
  MeasurementDataNotAvailable = 'MeasurementDataNotAvailable',
  /** Raised when attempting to read uncertainty while it hasn't been computed */
  UncertaintyNotAvailable = 'UncertaintyNotAvailable',
  /** Raised when an invalid index is used in manipulation */
  InvalidManipulationIndex = 'InvalidManipulationIndex',
  /** Raised when invalid keys are used in manipulation */
  InvalidManipulationKeys = 'InvalidManipulationKeys',
  /** Raised when a value is out of the allowed range in manipulation */
  InvalidManipulationRange = 'InvalidManipulationRange',
  /** Raised when no intersection plane can be found for distance computation */
  NoIntersectionPlaneForDistanceError = 'NoIntersectionPlaneForDistanceError',
  /** Raised when a support index is out of range for the number of spans. */
  SupportOutOfRangeError = 'SupportOutOfRangeError',
  /** Raised when generated points (spans, supports, insulators, others) are None after computation. */
  GeneratedPointsNoneError = 'GeneratedPointsNoneError'
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
 * Coordinate data from the position engine's get_coordinates output.
 *
 * @category Worker Types
 */
export interface SectionCoords {
  /** 3D coordinates of span catenary curves */
  spans: number[][][];
  /** 3D coordinates of support structures */
  supports: number[][][];
  /** 3D coordinates of insulator chains */
  insulators: number[][][];
  /** Obstacle coordinate arrays keyed by UUID from position engine (null if none registered) */
  obstacles: Record<string, number[][]> | null;
  /** Distance data from position engine keyed by obstacle UUID (null if none computed) */
  distances: Record<string, unknown> | null;
  /** Coordinates of applied loads by support UUID */
  loads: Record<string, number[]>;
}

/**
 * Computed output parameters from the balance engine.
 *
 * @category Worker Types
 */
export interface SectionOutputParameters {
  /** Line angle at each support (grad) */
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
  /** Cable displacement values */
  displacement: number[][];
  /** Load angle at each support */
  load_angle: number[];
  /** Span lengths */
  span_length: number[];
  /** Coordinates of applied loads by support UUID */
  loads_coords: Record<string, number[]>;
  /** Utilization rate per span (descending order) */
  utilization_rate: number[];
  /** Elevation values at each support */
  elevation: number[];
  /** Cable sag parameter (unitless) at each span */
  parameter: number[];
  /** Slope angle of the left support of the span */
  slope_left: number[];
  /** Slope angle of the right support of the span */
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
  /** Sag S1 */
  sag: number[];
  /** Sag S2 */
  sag_s2: number[];
}

/**
 * Output structure from section geometry calculations (get_coordinates).
 *
 * @remarks
 * Contains nested coords (geometry) and output_parameters (computed values).
 * The optional `obstacles` field holds structured annotation data merged by
 * TypeScript from refreshProjection — it is NOT part of the Python output.
 *
 * @category Worker Types
 */
export interface GetSectionOutput {
  /** Coordinate arrays for rendering section geometry */
  coords: SectionCoords;
  /** Computed parameters from the balance/span engine */
  output_parameters: SectionOutputParameters;
  /** Structured obstacle annotations (merged from refreshProjection, not from Python directly) */
  obstacles?: {
    uuid: string;
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
  /** Inputs for initLit task: initialize the section study in the engine */
  [Task.initLit]: { section: Section; cable: CatalogCable; obstacles?: Obstacle[] };
  /** Inputs for changeState task */
  [Task.changeState]: {
    climate: ClimateCharge;
    reload?: boolean;
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
  // Inputs for addBulkObstacles task: all current obstacles to register at once
  [Task.addBulkObstacles]: {
    obstacles: Obstacle[];
    startSupport: number;
    endSupport: number;
    view: View;
  };
  // Inputs for addSingleObstacle task: one obstacle from the form
  [Task.addSingleObstacle]: {
    obstacle: Obstacle;
    startSupport: number;
    endSupport: number;
    view: View;
  };
  // Inputs for deleteObstacle task
  [Task.deleteObstacle]: {
    uuid: string;
    startSupport: number;
    endSupport: number;
    view: View;
  };
  // Inputs for clearObstacles task: no inputs
  [Task.clearObstacles]: undefined;
  /** Inputs for shortenLengthenCable task */
  [Task.shortenLengthenCable]: {
    spanIndex: number;
    modificationType: 'lengthening' | 'shortening';
    modifiedLengthCable: number;
    distanceSupportRef: number;
    supportRef: 'LEFT' | 'RIGHT';
  };
  [Task.getWindIncidence]: {
    azimuth: number;
    windDirection: string;
  };
  [Task.getAspectRatio]: {
    x: number;
    y: number;
    z: number;
    startSupport: number;
    endSupport: number;
    view: View;
  };
  [Task.computeLocalization]: {
    startLatitude: number;
    startLongitude: number;
    startAzimuth: number;
    spanLength: number[];
    lineAngle: number[];
  };
  [Task.importLambert]: {
    lambert_x: number[];
    lambert_y: number[];
  };
  [Task.importLambertAndValidate]: {
    lambert_x: number[];
    lambert_y: number[];
    startLatitude: number;
    startLongitude: number;
    startAzimuth: number;
    spanLength: number[];
    lineAngle: number[];
  };
  // Inputs for getEquivalentSpan task: no inputs
  [Task.getEquivalentSpan]: undefined;
  [Task.getPoseTable]: {
    stepTemperature: number;
    baseTemperature: number;
    numberValues: number;
  };
  /** Inputs for deleteAllLoads task: no inputs */
  [Task.deleteAllLoads]: undefined;
  /** Inputs for deleteLoad task */
  [Task.deleteLoad]: {
    supportIndex: number;
  };
  /** Inputs for setLoads task: apply span loads via apply_span_loads */
  [Task.setLoads]: {
    spanLoads: SpanLoad[];
  };
  /** Inputs for measureDistance task: compute distance/angle between 2 or 3 points */
  [Task.measureDistance]: {
    points: [MeasurePointGroup];
    supportIndex: number;
    startSupport: number;
    endSupport: number;
    view: View;
  };
  /** Inputs for addMeasureDistanceAnglePoints task: register measurement points in the position engine */
  [Task.addMeasureDistanceAnglePoints]: {
    points: [MeasurePointGroup];
    supportIndex: number;
    startSupport: number;
    endSupport: number;
    view: View;
  };
  /** Inputs for clearMeasureDistanceAnglePoints task: no inputs */
  [Task.clearMeasureDistanceAnglePoints]: undefined;
  /** Inputs for getConformity task */
  [Task.getConformity]: ConformityTaskInput;
}

/**
 * Obstacle-specific output from Python obstacle registration tasks.
 *
 * @remarks
 * Returned by `refreshProjection` task.
 * Contains only the rendered 3D positions of the registered obstacles — not the full
 * section geometry. Use `initLit` + `refreshProjection` when full `GetSectionOutput` is needed.
 *
 * @category Worker Types
 */
export interface ObstacleOutput {
  /** Rendered 3D coordinates for each registered obstacle */
  obstacles: {
    uuid: string;
    points: [number, number, number][];
  }[];
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

export interface Localization {
  latitude: number[];
  longitude: number[];
  lambert_x: number[];
  lambert_y: number[];
  azimuth: number[];
}

/**
 * A group of 2 or 3 points used for distance/angle measurement, expressed relative to a support.
 *
 * @remarks
 * The Python side (`get_points_from_context`) expects a `points` array containing exactly
 * one `MeasurePointGroup`, whose `positions` holds the 2 or 3 measured points themselves.
 *
 * @category Worker Types
 */
export interface MeasurePointGroup {
  uuid: string;
  supportUuid: string;
  supportIndex: number;
  name: string;
  type: 'distance_measurement_points';
  altitudeType: 'absolute' | 'relative' | 'relative_cable';
  lateralDistanceType: 'SPAN_AXIS' | 'LINE_AXIS';
  referenceSupport: 'LEFT' | 'RIGHT';
  positions: { x: number; y: number; z: number }[];
}

/**
 * Result of a distance/angle measurement between 2 or 3 points.
 *
 * @category Worker Types
 */
export interface MeasureDistanceAngleResult {
  distance_1_2: number;
  distance_2_3: number | null;
  angle_1_2_3: number | null;
}

export interface ConformityPointInput {
  temperature: number | null;
  pressure: number | 'WindZoneInput';
}

export interface ConformityRuleClimaticConditionInput {
  ruleType: string;
  ruleName: string;
  lateralPoint: ConformityPointInput;
  overhangPoint: ConformityPointInput;
}

export interface ConformityRuleDistanceInput {
  ruleType: string;
  lateral: Record<string, number> | null;
  overhang: Record<string, number> | null;
}

export interface ConformityFormInput {
  windZone: string | null;
  windPressure: number | null;
  windMinus: boolean;
  redZonePresence: boolean;
  repartitionTemperature: number | null;
  lateralDistanceTemperature: number | null;
  selectedConformityRules: string[];
  conformity: string[] | null;
  conformityPlot: 'vegetation' | 'cable_track' | 'overhang';
  intermediatePoints: number[];
}

export interface ConformityTaskInput {
  obstacle: Obstacle;
  electricTension: string;
  form: ConformityFormInput;
  rulesClimaticConditions: ConformityRuleClimaticConditionInput[];
  rulesDistances: ConformityRuleDistanceInput[];
}

/** A point in the 2D conformity cross-section: x = lateral distance (m), y = altitude (m). */
export interface ConformityPointOutput {
  x: number;
  y: number;
}

/** A cable candidate point, carrying the disk radius (m) used by `cable_track`. */
export interface ConformityCablePointOutput extends ConformityPointOutput {
  radius: number;
}

/** Name of a zone corner. */
export type ConformityCornerName = 'UpperLeft' | 'UpperRight' | 'LowerRight' | 'LowerLeft';

/** One zone corner, delivered as a single-key object e.g. `{ LowerLeft: { x, y } }`. */
export type ConformityZoneCorner = Partial<Record<ConformityCornerName, ConformityPointOutput>>;

/** Geometry of a rule's conformity zone. */
export interface ConformityZonePlot {
  /** Ordered polygon corners (fill outline). */
  zonePoints: ConformityZoneCorner[];
  /** Bright-border polyline, already trimmed by the task to the edges to highlight. */
  zoneBorder: ConformityPointOutput[];
}

/** One conformity rule: its zone geometry and candidate cable points. */
export interface ConformityRulePlot {
  zonePlot: ConformityZonePlot;
  points: ConformityCablePointOutput[];
}

/** The obstacle and its own point(s), always drawn regardless of conformity type. */
export interface ConformityObstacleOutput {
  name: string;
  points: ConformityPointOutput[];
}

/** Detailed numerical results for a single conformity rule (overhang and lateral sides). */
export interface ConformityRuleResult {
  overhangCableAltitude: number;
  lateralCableAltitude: number;
  overhangCableLineAxisDistance: number;
  lateralCableLineAxisDistance: number;
  overhangDistanceToComply: number;
  lateralDistanceToComply: number;
  overhangComplianceAltitude: number;
  lateralComplianceLineAxisDistance: number;
  conformityCompliance: boolean;
  overhangTemperature?: number;
  lateralTemperature?: number;
  overhangWindPressure?: number;
  lateralWindPressure?: number;
  overhangMinimalDistance?: number;
  lateralMinimalDistance?: number;
}

/** Full response the conformity calculation returns for the graph. */
export interface ConformityTaskOutput {
  obstacle: ConformityObstacleOutput;
  /** Rules keyed by `rule_type` (e.g. `'AT'`, `'CCG-LA'`). Key order is the stacking priority. */
  conformity: Record<string, ConformityRulePlot>;
  /** Detailed numerical results per rule, keyed by `rule_type`. */
  results: Record<string, ConformityRuleResult>;
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
  /** Output from initLit task: initialization acknowledgement */
  [Task.initLit]: { success: boolean };
  /** Output from changeState task: acknowledgement that state was changed in the engine */
  [Task.changeState]: { success: boolean };
  /** Output from refreshProjection task: reprojected geometry with optional base state */
  [Task.refreshProjection]: {
    sectionOutput: GetSectionWithBaseOutput;
    obstacles: ObstacleOutput['obstacles'];
    distances: Distance[];
    /** Registered distance/angle measurement point groups, rendered like obstacles. */
    distanceMeasuringPoints: ObstacleOutput['obstacles'];
  };

  /** Output from getSupportCoordinates task: 2D display coordinates for supports */
  [Task.getSupportCoordinates]: {
    shape_points: number[][];
    text_display_points: number[][];
    text_to_display: number[];
  };
  /** Output from calculatePapoto task */
  [Task.calculatePapoto]: PapotoResult;
  /** Output from calculateGuying task */
  [Task.calculateGuying]: {
    tensionInGuy: number;
    guyAngle: number;
    chargeVUnderConsole: number;
    chargeHUnderConsole: number;
    chargeLIfPulley: number;
  };
  /** Output from setLogLevel task */
  [Task.setLogLevel]: { success: boolean };
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
  // Output from addBulkObstacles task: registration acknowledgement
  [Task.addBulkObstacles]: { success: boolean };
  // Output from addSingleObstacle task: registration acknowledgement
  [Task.addSingleObstacle]: { success: boolean };
  // Output from deleteObstacle task: registration acknowledgement
  [Task.deleteObstacle]: { success: boolean };
  // Output from clearObstacles task: registration acknowledgement
  [Task.clearObstacles]: { success: boolean };
  // Output from shortenLengthenCable task: registration acknowledgement
  [Task.shortenLengthenCable]: { success: boolean };
  [Task.getAspectRatio]: {
    x: number;
    y: number;
    z: number;
  };
  [Task.getWindIncidence]: {
    windIncidence: number;
  };
  [Task.computeLocalization]: Localization;
  [Task.importLambert]: Localization;
  [Task.importLambertAndValidate]: {
    localization: Localization;
    meanGpsDiff: number;
  };
  [Task.getEquivalentSpan]: { equivalentSpan: number };
  [Task.getPoseTable]: PoseResults;
  /** Output from deleteAllLoads task */
  [Task.deleteAllLoads]: { success: boolean };
  /** Output from deleteLoad task */
  [Task.deleteLoad]: { success: boolean };
  /** Output from setLoads task */
  [Task.setLoads]: { success: boolean };
  /** Output from measureDistance task */
  [Task.measureDistance]: MeasureDistanceAngleResult;
  /** Output from addMeasureDistanceAnglePoints task */
  [Task.addMeasureDistanceAnglePoints]: { success: boolean };
  /** Output from clearMeasureDistanceAnglePoints task */
  [Task.clearMeasureDistanceAnglePoints]: { success: boolean };
  /** Output from getConformity task */
  [Task.getConformity]: ConformityTaskOutput;
}
