import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { CardInfoComponent } from '@shared/components/atoms/card-info/card-info.component';
import { UpdateService } from '@services/worker_update/worker_update.service';
import { OnlineService, ServerStatus } from '@services/online/online.service';
import { combineLatest } from 'rxjs';
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
  serverTitle: string;
  serverText: string;
}

/** Possible visual states for the server status card. */
type ServerStates = CardState;

/**
 * Home page component.
 *
 * Displays news, changelog info, server connectivity status,
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
  private readonly updateService = inject(UpdateService);
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
  public serverStatus = signal<ServerStates>('unknown');
  private isOffline(isOnline: boolean): boolean {
    return !isOnline;
  }

  private readonly pendingAction = this.updateService.pendingAction;
  private readonly connectivity = toSignal(
    combineLatest([this.onlineService.online$, this.onlineService.serverOnline$]),
    { initialValue: [false, ServerStatus.LOADING] as [boolean, ServerStatus] }
  );
  private readonly studiesReady = toSignal(this.studiesService.ready, { initialValue: false });

  constructor() {
    effect(() => {
      const updateAvailable = this.pendingAction() === 'update-available';
      // prettier-ignore
      if (updateAvailable) { //NOSONAR
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
      const [isOnline, serverStatus] = this.connectivity();
      const finalStatus = this.getConnectivityStatus(isOnline, serverStatus);
      this.serverStatus.set(finalStatus);
      this.updateServerText(finalStatus);
    });

    effect(() => {
      if (this.studiesReady()) {
        this.studiesService.getLatestStudies().then((studies) => {
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
      newsTitle: this.translocoService.translate('home.news-title'),
      newsText: this.translocoService.translate('home.news-text'),
      newsLinkText: this.translocoService.translate('home.news-link-text'),
      updateTitle: this.translocoService.translate('home.update-title'),
      updateText: this.translocoService.translate('home.update-text'),
      updateLinkText: this.translocoService.translate('home.update-link-text'),
      updateLinkExplicitText: this.translocoService.translate('home.update-link-explicit-text'),
      serverTitle: this.translocoService.translate('home.server-title'),
      serverText: this.translocoService.translate('home.server-text-default')
    };
  }

  private getConnectivityStatus(isOnline: boolean, serverStatus: ServerStatus): ServerStates {
    if (this.isOffline(isOnline)) {
      return 'offline';
    }

    return this.getOnlineStatus(serverStatus);
  }

  private getOnlineStatus(serverStatus: ServerStatus): ServerStates {
    switch (serverStatus) {
      case ServerStatus.LOADING:
        return 'warning';
      case ServerStatus.OFFLINE:
        return 'offline';
      case ServerStatus.ONLINE:
        return 'success';
      default:
        return 'unknown';
    }
  }

  private updateServerText(status: ServerStates): void {
    switch (status) {
      case 'offline':
        this.updateText('serverText', this.translocoService.translate('home.server-offline'));
        break;
      case 'unknown':
        this.updateText('serverText', this.translocoService.translate('home.server-unknown'));
        break;
      case 'warning':
        this.updateText('serverText', this.translocoService.translate('home.server-warning'));
        break;
      case 'error':
        this.updateText('serverText', this.translocoService.translate('home.server-error'));
        break;
      case 'success':
        this.updateText('serverText', this.translocoService.translate('home.server-success'));
        break;
    }
  }
}
