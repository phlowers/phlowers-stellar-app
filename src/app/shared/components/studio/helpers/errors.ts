import { DataError, PythonErrorCode, TaskError } from '@core/services/worker_python/tasks/types';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Formats a `TaskError` or `DataError` into a localized human-readable string.
 * If a `diagnosticCode` is provided and recognized, its message takes priority.
 * Falls back to the `ERROR_MESSAGES` map, then to a generic "Unknown error" message.
 */
export const formatStudioError = (
  error: TaskError | DataError | null,
  translocoService: TranslocoService,
  diagnosticCode: PythonErrorCode | null = null
): string => {
  const pythonMessage = formatPythonError(diagnosticCode, translocoService);
  if (pythonMessage !== null) {
    return pythonMessage;
  }
  const errorMessages: Record<string, string> = {
    [DataError.NO_CABLE_FOUND]: translocoService.translate('shared.studio.no-cable-found'),
    [DataError.NO_INITIAL_CONDITION]: translocoService.translate('shared.studio.no-initial-condition'),
    [TaskError.CALCULATION_ERROR]: translocoService.translate('shared.studio.calculation-error'),
    [TaskError.SOLVER_DID_NOT_CONVERGE]: translocoService.translate('shared.studio.solver-did-not-converge'),
    [TaskError.PYODIDE_LOAD_ERROR]: translocoService.translate('shared.studio.pyodide-load-error')
  };
  return (
    errorMessages[error as keyof typeof errorMessages] ?? translocoService.translate('shared.studio.unknown-error')
  );
};
