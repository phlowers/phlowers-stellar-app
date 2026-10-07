import {
  computeUpdateProgressPercent,
  formatSwLogLine,
  isTimeoutError,
  isValidGitHash,
  withTimeout
} from './worker_update.service.helpers';

describe('worker_update.service.helpers', () => {
  it('formatSwLogLine should mirror the SW console line', () => {
    expect(formatSwLogLine({ runId: 'abc12345', level: 'info', step: 'progress', elapsedMs: 120 })).toBe(
      '[UPDATE abc12345] progress +120ms'
    );
  });

  it('isTimeoutError should be true only for a TimeoutError DOMException', () => {
    expect(isTimeoutError(new DOMException('t', 'TimeoutError'))).toBe(true);
    expect(isTimeoutError(new DOMException('a', 'AbortError'))).toBe(false);
    expect(isTimeoutError(new Error('x'))).toBe(false);
  });

  describe('withTimeout', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve with the value when the promise settles in time', async () => {
      await expect(withTimeout(Promise.resolve(42), 1000, 'thing')).resolves.toBe(42);
    });

    it('should propagate the rejection of the promise', async () => {
      await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'thing')).rejects.toThrow('boom');
    });

    it('should reject with a TimeoutError naming the operation when the promise never settles', async () => {
      vi.useFakeTimers();
      const result = withTimeout(new Promise<never>(() => undefined), 1000, 'thing');
      const assertion = expect(result).rejects.toSatisfy(
        (error: unknown) => isTimeoutError(error) && (error as DOMException).message === 'thing timeout'
      );

      await vi.advanceTimersByTimeAsync(1000);

      await assertion;
    });
  });

  describe('isValidGitHash', () => {
    it.each(['abc1234', 'a'.repeat(40)])('should accept the commit SHA %s', (hash) => {
      expect(isValidGitHash(hash)).toBe(true);
    });

    it.each([undefined, null, '', 'unknown', '{GIT_HASH}', 'abc123', 'ABC1234', 'a'.repeat(41)])(
      'should reject %s',
      (hash) => {
        expect(isValidGitHash(hash)).toBe(false);
      }
    );
  });

  describe('computeUpdateProgressPercent', () => {
    it('should floor the share of files done', () => {
      expect(computeUpdateProgressPercent({ filesDone: 1, filesTotal: 3 })).toBe(33);
      expect(computeUpdateProgressPercent({ filesDone: 3, filesTotal: 3 })).toBe(100);
    });

    it('should be 0 while the file count is unknown', () => {
      expect(computeUpdateProgressPercent({ filesDone: 0, filesTotal: 0 })).toBe(0);
    });

    it('should never exceed 100', () => {
      expect(computeUpdateProgressPercent({ filesDone: 5, filesTotal: 4 })).toBe(100);
    });
  });
});
