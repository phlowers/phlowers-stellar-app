import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { LoggerService } from '@services/logger/logger.service';
import { AppConfig } from './app-config.interfaces';

const APP_CONFIG_URL = 'assets/config/app-config.json';
const FALLBACK_LANG = 'fr';
// Awaited by the APP_INITIALIZER (blocking initial navigation): must be
// bounded or a hung request blanks the whole first render (incident
// 2026-08-10). Short on purpose — the fallback language is harmless and the
// file is served publicly (no OIDC) so it normally answers instantly.
const LOAD_TIMEOUT_MS = 3000;

/**
 * Loads runtime application configuration from `assets/config/app-config.json`,
 * written post-deploy (Docker/Jenkins) so the default UI language can be
 * changed without a rebuild.
 *
 * Falls back silently to `'fr'` if the file is absent or malformed (e.g. in
 * local development, where the file is not generated).
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  /** Resolves the default language to activate at startup. */
  async loadDefaultLang(): Promise<string> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>(APP_CONFIG_URL).pipe(timeout({ first: LOAD_TIMEOUT_MS }))
      );
      return config?.defaultLang ?? FALLBACK_LANG;
    } catch (error) {
      this.logger.warn('Failed to load app-config.json, falling back to default language', error);
      return FALLBACK_LANG;
    }
  }
}
