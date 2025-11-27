import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { CardInfoComponent } from '@src/app/ui/shared/components/atoms/card-info/card-info.component';
import { UpdateService } from '@src/app/core/services/worker_update/worker_update.service';
import {
  OnlineService,
  ServerStatus
} from '@src/app/core/services/online/online.service';
import { Subscription, combineLatest } from 'rxjs';
import { CardState } from '@ui/shared/model/card-info.model';
import { CardStudyComponent } from '@ui/shared/components/atoms/card-study/card-study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { StudyModel } from '@src/app/core/data/models/study.model';
import TimeAgo from 'javascript-time-ago';
import fr from 'javascript-time-ago/locale/fr';
import en from 'javascript-time-ago/locale/en';
import { CommonModule } from '@angular/common';

if (navigator.language.includes('fr')) {
  TimeAgo.addLocale(fr);
} else {
  TimeAgo.addLocale(en);
}

const timeAgo = new TimeAgo(navigator.language);

const defaultTexts = {
  newsTitle: $localize`News`, // i18n Actualités
  newsText: $localize`Welcome to Celeste! We are glad to present this new tool made with you.
  Please contact us to share your ideas and feedbacks to help us upgrade this application!`,
  /*
  i18n
  Bienvenue sur Céleste ! Nous sommes ravis de vous présenter cette nouvelle
  version de l'outil co-construite avec vous. N'hésitez pas à contacter l'équipe Céleste pour nous
  faire part de vos idées d'améliorations !
  */
  newsLinkText: $localize`View all news`, // i18n Consulter toutes les actualités

  updateTitle: $localize`Changelogs`, // i18n Notes de mise à jour
  updateText: $localize`View latest updates.`, // i18n Consulter les dernières mises à jour de l'application.
  updateLinkText: $localize`Learn more`, // i18n Découvrir
  updateLinkExplicitText: $localize`Learn more about latest updates`, // i18n Découvrir les dernières notes de mise à jour

  serverTitle: $localize`Server state`, // i18n État des serveurs
  serverText: $localize`Trying to reach the servers!` // i18n Nous essayons de contacter les serveurs
};

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

type ServerStates = CardState;

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ButtonComponent,
    IconComponent,
    CardInfoComponent,
    CardStudyComponent,
    CommonModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  public latestStudies = signal<StudyModel[]>([]);

  public homeText = signal<HomeTexts>(defaultTexts);

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

  constructor(
    private readonly updateService: UpdateService,
    private readonly onlineService: OnlineService,
    private readonly studiesService: StudiesService
  ) {
    this.updateService.needUpdate$.subscribe((needUpdate) => {
      // prettier-ignore
      if (needUpdate) { //NOSONAR
        this.updateStatus.set('warning');
        this.updateText('updateTitle', $localize`Update available`); // i18n Mise à jour disponible !
        this.updateText(
          'updateText',
          $localize`A new application update is available!`
        ); // i18n Une nouvelle mise à jour de votre application est disponible !
      } else {
        this.updateStatus.set('unknown');
        this.updateText('updateTitle', defaultTexts.updateTitle);
        this.updateText('updateText', defaultTexts.updateText);
      }
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.onlineService.online$,
        this.onlineService.serverOnline$
      ]).subscribe(([isOnline, serverStatus]) => {
        const finalStatus = this.getConnectivityStatus(isOnline, serverStatus);
        this.serverStatus.set(finalStatus);
        this.updateServerText(finalStatus);
      })
    );
    this.studiesService.ready.subscribe(async (value) => {
      if (value) {
        const studies = await this.studiesService.getLatestStudies();
        this.latestStudies.set(
          studies?.map((study) => ({
            ...study,
            updated_at_offline: timeAgo.format(
              new Date(study.updated_at_offline)
            )
          }))
        );
      }
    });
  }

  private getConnectivityStatus(
    isOnline: boolean,
    serverStatus: ServerStatus
  ): ServerStates {
    if (this.isOffline(isOnline)) {
      return 'unknown';
    }

    return this.getOnlineStatus(serverStatus);
  }

  private getOnlineStatus(serverStatus: ServerStatus): ServerStates {
    switch (serverStatus) {
      case ServerStatus.LOADING:
        return 'warning';
      case ServerStatus.OFFLINE:
        return 'error';
      case ServerStatus.ONLINE:
        return 'success';
      default:
        return 'unknown';
    }
  }

  private updateServerText(status: ServerStates): void {
    switch (status) {
      case 'unknown':
        this.updateText(
          'serverText',
          $localize`Cannot reach data. Please check your internet connectivity.`
        ); // i18n Impossible d'accéder aux données. Vérifiez votre connexion à internet.
        break;
      case 'warning':
        this.updateText('serverText', $localize`Trying to reach the servers.`); // i18n Nous essayons de contacter les serveurs.
        break;
      case 'error':
        this.updateText(
          'serverText',
          $localize`An error occured while trying to reach servers.`
        ); // i18n Une erreur a été rencontré lors de la connexion aux serveurs.
        break;
      case 'success':
        this.updateText('serverText', $localize`Server connexion success!`); // i18n Connexion aux serveurs réussi !
        break;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
