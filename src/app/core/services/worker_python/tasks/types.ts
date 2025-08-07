export enum Task {
  runTests = 'runTests',
  getLit = 'getLit'
}

export enum TaskError {
  PYODIDE_LOAD_ERROR = 'PYODIDE_LOAD_ERROR'
}

export interface GetSectionOutput {
  x: Record<string, number | null>;
  y: Record<string, number | null>;
  z: Record<string, number | null>;
  support: Record<string, string>;
  type: Record<string, string>;
  section: Record<string, string>;
  color_select: Record<string, string>;
}

export interface TaskInputs {
  [Task.getLit]: undefined;
  [Task.runTests]: undefined;
}

export interface TaskOutputs {
  [Task.getLit]: GetSectionOutput;
  [Task.runTests]: undefined;
}
