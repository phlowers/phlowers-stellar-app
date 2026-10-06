import type { UpdateLogEntry, UpdateRunProgress } from './service-worker.interfaces';

/** Formats a SW log entry exactly like the SW console line: `[UPDATE <runId>] <step> +<ms>ms`. */
export function formatSwLogLine(entry: UpdateLogEntry): string {
  return `[UPDATE ${entry.runId}] ${entry.step} +${entry.elapsedMs}ms`;
}

/** True when the page fetch was aborted by its timeout (vs. a network failure). */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

/** Rejects with a `TimeoutError` when `promise` has not settled after `timeoutMs`. */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException(`${description} timeout`, 'TimeoutError')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Whole percentage (0-100) of the files cached so far; 0 while the file count is still unknown. */
export function computeUpdateProgressPercent(run: Pick<UpdateRunProgress, 'filesDone' | 'filesTotal'>): number {
  return run.filesTotal > 0 ? Math.min(100, Math.floor((run.filesDone * 100) / run.filesTotal)) : 0;
}
