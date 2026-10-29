/** Maps the active Transloco language (`en` | `fr`) to the Angular locale used to format dates. */
export function getDateLocale(lang: string): 'fr-FR' | 'en-US' {
  return lang === 'en' ? 'en-US' : 'fr-FR';
}
