import { DataError, PythonErrorCode, TaskError } from '@core/services/worker_python/tasks/types';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';

/** Map of known error codes to their localized display messages. */
const ERROR_MESSAGES = {
  [DataError.NO_CABLE_FOUND]: $localize`No cable found`,
  [TaskError.CALCULATION_ERROR]: $localize`Calculation error`,
  [TaskError.SOLVER_DID_NOT_CONVERGE]: $localize`Calculation error: 'Solver did not converge'`,
  [TaskError.PYODIDE_LOAD_ERROR]: $localize`Pyodide load error`
} as const;

/**
 * Formats a `TaskError` or `DataError` into a localized human-readable string.
 * If a `pythonErrorCode` is provided and recognized, its message takes priority.
 * Falls back to the `ERROR_MESSAGES` map, then to a generic "Unknown error" message.
 */
export const formatStudioError = (
  error: TaskError | DataError | null,
  pythonErrorCode: PythonErrorCode | null = null
): string => {
  const pythonMessage = formatPythonError(pythonErrorCode);
  if (pythonMessage !== null) {
    return pythonMessage;
  }
  return ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ?? $localize`Unknown error`;
};
