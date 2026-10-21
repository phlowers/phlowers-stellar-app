import { buildManualPdfDownloadName, buildManualPdfServedName } from './instruction-manual.helpers';

describe('buildManualPdfServedName', () => {
  it('should lowercase the app name and leave the version out', () => {
    expect(buildManualPdfServedName('Stellar')).toBe('stellar_documentation.pdf');
  });

  it('should replace the characters that are not alphanumeric with underscores', () => {
    expect(buildManualPdfServedName(' My App! ')).toBe('my_app_documentation.pdf');
  });
});

describe('buildManualPdfDownloadName', () => {
  it('should lowercase the app name and append the version', () => {
    expect(buildManualPdfDownloadName('Stellar', '1.9.2')).toBe('stellar_documentation_1.9.2.pdf');
  });

  it('should replace the characters that are not alphanumeric with underscores', () => {
    expect(buildManualPdfDownloadName(' My App! ', '0.0.0')).toBe('my_app_documentation_0.0.0.pdf');
  });
});
