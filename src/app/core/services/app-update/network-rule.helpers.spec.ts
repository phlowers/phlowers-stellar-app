import { BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS } from './network-rule.constantes';
import { evaluateBackgroundDownload } from './network-rule.helpers';

describe('evaluateBackgroundDownload', () => {
  it.each([
    [{ downlink: 10 }, true, 'allowed'],
    [{ downlink: 5 }, true, 'allowed'],
    [{ downlink: 4.9 }, false, 'downlink-below-threshold'],
    [undefined, false, 'api-unavailable'],
    [null, false, 'api-unavailable'],
    [{ downlink: undefined }, false, 'downlink-unknown'],
    [{ downlink: Number.NaN }, false, 'downlink-unknown'],
    [{ downlink: 50, saveData: true }, false, 'save-data']
  ])('with threshold 5, %o gives allowed=%s (%s)', (connection, allowed, reason) => {
    const decision = evaluateBackgroundDownload(connection, 5);

    expect(decision.allowed).toBe(allowed);
    expect(decision.reason).toBe(reason);
  });

  it('reports the measured downlink', () => {
    expect(evaluateBackgroundDownload({ downlink: 3 }, 5).downlinkMbps).toBe(3);
    expect(evaluateBackgroundDownload({ downlink: 50, saveData: true }, 5).downlinkMbps).toBe(50);
    expect(evaluateBackgroundDownload({}, 5).downlinkMbps).toBeNull();
  });

  it('uses the shared threshold by default', () => {
    expect(evaluateBackgroundDownload({ downlink: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS }).allowed).toBe(true);
    expect(evaluateBackgroundDownload({ downlink: BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS - 0.025 }).allowed).toBe(false);
  });

  it('keeps the threshold within the browser downlink cap', () => {
    expect(BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS).toBeGreaterThan(0);
    expect(BACKGROUND_DOWNLOAD_MIN_DOWNLINK_MBPS).toBeLessThanOrEqual(10);
  });
});
