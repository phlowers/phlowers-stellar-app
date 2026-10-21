import { catalogDataUrl } from './csv-import.client.helpers';

describe('catalogDataUrl', () => {
  it('versions the URL with the expected hash', () => {
    expect(catalogDataUrl('https://stellar.test', 'cables.csv', 'abc123')).toBe(
      'https://stellar.test/data/cables.csv?v=abc123'
    );
  });

  it('keeps a plain URL without hash', () => {
    expect(catalogDataUrl('https://stellar.test', 'cables.csv')).toBe('https://stellar.test/data/cables.csv');
    expect(catalogDataUrl('https://stellar.test', 'cables.csv', '')).toBe('https://stellar.test/data/cables.csv');
  });

  it('encodes the hash', () => {
    expect(catalogDataUrl('https://stellar.test', 'a.csv', 'a b')).toBe('https://stellar.test/data/a.csv?v=a%20b');
  });
});
