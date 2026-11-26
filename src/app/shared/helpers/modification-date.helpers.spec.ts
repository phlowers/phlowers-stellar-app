import { describe, expect, it } from 'vitest';
import { getDateLocale } from '@shared/helpers/modification-date.helpers';

describe('getDateLocale', () => {
  it('maps en to en-US', () => {
    expect(getDateLocale('en')).toBe('en-US');
  });

  it('maps fr and any other language to fr-FR', () => {
    expect(getDateLocale('fr')).toBe('fr-FR');
    expect(getDateLocale('')).toBe('fr-FR');
  });
});
