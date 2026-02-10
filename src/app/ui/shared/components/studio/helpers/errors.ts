import { TaskError, DataError } from '@core/services/worker_python/tasks/types';

export const formatStudioError = (error: TaskError | DataError | null) => {
  switch (error) {
    case DataError.NO_CABLE_FOUND:
      return $localize`No cable found`;
    case TaskError.CALCULATION_ERROR:
      return $localize`Calculation error`;
    case TaskError.SOLVER_DID_NOT_CONVERGE:
      return $localize`Calculation error: 'Solver did not converge'`;
    case TaskError.PYODIDE_LOAD_ERROR:
      return $localize`Pyodide load error`;
    default:
      return $localize`Unknown error`;
  }
};
