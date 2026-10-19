import { buildManualPdfFileName } from './instruction-manual.helpers';

describe('buildManualPdfFileName', () => {
  it('should lowercase the app name and append the version', () => {
    expect(buildManualPdfFileName('Stellar', '1.9.2')).toBe('stellar_documentation_1.9.2.pdf');
  });

  it('should replace the characters that are not alphanumeric with underscores', () => {
    expect(buildManualPdfFileName(' My App! ', '0.0.0')).toBe('my_app_documentation_0.0.0.pdf');
  });
});
