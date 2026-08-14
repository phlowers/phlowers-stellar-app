import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly _http = inject(HttpClient);

  getTranslation(lang: string) {
    return this._http.get<Translation>(`i18n/${lang}.json`);
  }
}
