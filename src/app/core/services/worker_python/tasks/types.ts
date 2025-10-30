import { Cable } from '@core/data/database/interfaces/cable';
import { Section } from '@core/data/database/interfaces/section';
import { PlotObjectsType } from '@ui/shared/components/studio/section/helpers/types';

export enum Task {
  runTests = 'runTests',
  getLit = 'getLit'
}

export enum DataError {
  NO_CABLE_FOUND = 'NO_CABLE_FOUND'
}

export enum TaskError {
  PYODIDE_LOAD_ERROR = 'PYODIDE_LOAD_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export type GetSectionOutput = Record<PlotObjectsType, number[][][]>;

export interface TaskInputs {
  [Task.getLit]: { section: Section; cable: Cable };
  [Task.runTests]: undefined;
}

export interface TaskOutputs {
  [Task.getLit]: GetSectionOutput;
  [Task.runTests]: undefined;
}
