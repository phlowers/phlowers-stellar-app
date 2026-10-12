import { checkResultKey, refusalReasonKey, toMegabytes } from './admin.helpers';

describe('admin helpers', () => {
  it('formats bytes as megabytes with one decimal', () => {
    expect(toMegabytes(1536 * 1024)).toBe('1.5');
    expect(toMegabytes(0)).toBe('0.0');
    expect(toMegabytes(null)).toBeNull();
  });

  it('maps a refusal reason to its i18n key', () => {
    expect(refusalReasonKey('save-data')).toBe('admin.refusal.save-data');
  });

  it('maps a check decision to its feedback key', () => {
    expect(checkResultKey({ allowed: true, reason: null })).toBe('shared.app-update-service.check-started');
    expect(checkResultKey({ allowed: false, reason: 'deferred-network' })).toBe(
      'shared.app-update-service.update-deferred-network'
    );
    expect(checkResultKey({ allowed: false, reason: 'storage-insufficient' })).toBe(
      'shared.app-update-service.storage-insufficient-detail'
    );
  });
});
