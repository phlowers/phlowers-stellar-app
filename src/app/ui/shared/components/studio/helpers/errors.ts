import { TaskError, DataError } from '@core/services/worker_python/tasks/types';

const ERROR_MESSAGES = {
  [DataError.NO_CABLE_FOUND]: $localize`No cable found`,
  [TaskError.CALCULATION_ERROR]: $localize`Calculation error`,
  [TaskError.SOLVER_DID_NOT_CONVERGE]: $localize`Calculation error: 'Solver did not converge'`,
  [TaskError.PYODIDE_LOAD_ERROR]: $localize`Pyodide load error`
} as const;

export const formatStudioError = (error: TaskError | DataError | null) => {
  return ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ?? $localize`Unknown error`;
};
