import { DataError, PythonErrorCode, TaskError } from '@core/services/worker_python/tasks/types';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';

/** Map of known error codes to their localized display messages. */
const ERROR_MESSAGES = {
  [DataError.NO_CABLE_FOUND]: $localize`No cable found`,
  [DataError.NO_INITIAL_CONDITION]: $localize`No valid initial condition selected`,
  [TaskError.CALCULATION_ERROR]: $localize`Calculation error`,
  [TaskError.SOLVER_DID_NOT_CONVERGE]: $localize`Calculation error: 'Solver did not converge'`,
  [TaskError.PYODIDE_LOAD_ERROR]: $localize`Pyodide load error`
} as const;

/**
 * Formats a `TaskError` or `DataError` into a localized human-readable string.
 * If a `diagnosticCode` is provided and recognized, its message takes priority.
 * Falls back to the `ERROR_MESSAGES` map, then to a generic "Unknown error" message.
 */
export const formatStudioError = (
  error: TaskError | DataError | null,
  diagnosticCode: PythonErrorCode | null = null
): string => {
  const pythonMessage = formatPythonError(diagnosticCode);
  if (pythonMessage !== null) {
    return pythonMessage;
  }
  return ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ?? $localize`Unknown error`;
};
