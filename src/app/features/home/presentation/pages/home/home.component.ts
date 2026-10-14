import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { AppUpdateService } from '@services/app-update/app-update.service';
import { APP_UPDATE_I18N } from '@services/app-update/app-update.constantes';
import { OfflineStatusKind } from '@services/app-update/app-update.interfaces';
import { offlineStatusKind } from '@services/app-update/app-update.helpers';
import { SwInstallRefusedMessage } from '@services/app-update/sw-messages.interfaces';
import { OnlineService } from '@services/online/online.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardState } from '@shared/model/card-info.model';
import { CardStudyComponent } from '@shared/components/atoms/card-study/card-study.component';
import { StudiesService } from '@services/studies/studies.service';
import { Study } from '@shared/domain';
import TimeAgo from 'javascript-time-ago';
import fr from 'javascript-time-ago/locale/fr';
import en from 'javascript-time-ago/locale/en';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

TimeAgo.addLocale(fr);
TimeAgo.addLocale(en);

/** Text content displayed on the home page cards and sections. */
interface HomeTexts {
  newsTitle: string;
  newsText: string;
  newsLinkText: string;
  updateTitle: string;
  updateText: string;
  updateLinkText: string;
  updateLinkExplicitText: string;
  offlineTitle: string;
  offlineText: string;
}

/**
 * Home page component.
 *
 * Displays news, changelog info, connection and offline-mode status,
 * and the user's most recently updated studies.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, ButtonComponent, IconComponent, CardInfoComponent, CardStudyComponent, TranslocoModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly appUpdateService = inject(AppUpdateService);
  private readonly onlineService = inject(OnlineService);
  private readonly studiesService = inject(StudiesService);
  private readonly translocoService = inject(TranslocoService);
  private readonly timeAgo = new TimeAgo(this.translocoService.getActiveLang());
  public latestStudies = signal<Study[]>([]);

  public homeText = signal<HomeTexts>(this.buildDefaultTexts());

  private updateText(key: keyof HomeTexts, value: string) {
    this.homeText.update((current) => ({
      ...current,
      [key]: value
    }));
  }

  public updateStatus = signal<'unknown' | 'warning'>('unknown');
  public offlineStatus = signal<CardState>('unknown');

  private readonly updateWaiting = computed(() => this.appUpdateService.state() === 'update-waiting');
  private readonly isOnline = toSignal(this.onlineService.online$, { initialValue: false });
  private readonly studiesReady = toSignal(this.studiesService.ready, { initialValue: false });

  constructor() {
    effect(() => {
      const updateWaiting = this.updateWaiting();
      // The news card repeats the "applied at next start" message while a downloaded version waits (offline too).
      this.updateText(
        'newsText',
        this.translocoService.translate(updateWaiting ? APP_UPDATE_I18N.updateWaitingDetail : 'home.news-text')
      );
      // prettier-ignore
      if (updateWaiting) { //NOSONAR
        this.updateStatus.set('warning');
        this.updateText('updateTitle', this.translocoService.translate('home.update-available'));
        this.updateText('updateText', this.translocoService.translate('home.update-new-available'));
      } else {
        this.updateStatus.set('unknown');
        this.updateText('updateTitle', this.translocoService.translate('home.update-title'));
        this.updateText('updateText', this.translocoService.translate('home.update-text'));
      }
    });

    effect(() => {
      const isOnline = this.isOnline();
      const kind = offlineStatusKind(this.appUpdateService.state());
      const refusal = this.appUpdateService.lastRefusal();
      this.offlineStatus.set(this.getOfflineStatus(isOnline, kind, refusal));
      this.updateText('offlineText', this.buildOfflineText(isOnline, kind, refusal));
    });

    effect(() => {
      if (this.studiesReady()) {
        void this.studiesService.getLatestStudies().then((studies) => {
          this.latestStudies.set(
            studies?.map((study) => ({
              ...study,
              updated_at_offline: this.timeAgo.format(new Date(study.updated_at_offline))
            }))
          );
        });
      }
    });
  }

  private buildDefaultTexts(): HomeTexts {
    return {
      newsTitle: this.translocoService.translate('common.news-label'),
      newsText: this.translocoService.translate('home.news-text'),
      newsLinkText: this.translocoService.translate('home.news-link-text'),
      updateTitle: this.translocoService.translate('home.update-title'),
      updateText: this.translocoService.translate('home.update-text'),
      updateLinkText: this.translocoService.translate('home.update-link-text'),
      updateLinkExplicitText: this.translocoService.translate('home.update-link-explicit-text'),
      offlineTitle: this.translocoService.translate('home.offline-card.title'),
      offlineText: ''
    };
  }

  private getOfflineStatus(
    isOnline: boolean,
    kind: OfflineStatusKind,
    refusal: SwInstallRefusedMessage | null
  ): CardState {
    switch (kind) {
      case 'ready':
        if (refusal) {
          return 'warning';
        }
        return isOnline ? 'success' : 'offline';
      case 'preparing':
      case 'waiting-network':
        return 'warning';
      case 'storage-insufficient':
        return 'error';
      default:
        // Not prepared: neutral while online (e.g. dev build without service worker), blocking once offline.
        return isOnline ? 'unknown' : 'error';
    }
  }

  private buildOfflineText(
    isOnline: boolean,
    kind: OfflineStatusKind,
    refusal: SwInstallRefusedMessage | null
  ): string {
    const parts = [
      this.translocoService.translate(`home.offline-card.connection-${isOnline ? 'online' : 'offline'}`),
      this.translocoService.translate(`home.offline-card.status-${kind}`)
    ];
    if (kind === 'ready' && refusal) {
      parts.push(
        this.translocoService.translate(
          refusal.reason === 'storage-insufficient'
            ? 'home.offline-card.update-blocked-storage'
            : 'home.offline-card.update-postponed-network'
        )
      );
    }
    return parts.join(' ');
  }
}
