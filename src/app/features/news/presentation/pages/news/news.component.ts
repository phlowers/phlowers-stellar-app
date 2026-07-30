import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NewsService } from '@features/news/infrastructure/services/news.service';
import { OnlineService } from '@services/online/online.service';
import { MarkdownModule } from 'ngx-markdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { catchError, EMPTY, switchMap, tap } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';

/** Displays news content fetched as markdown from the server. */
@Component({
  selector: 'app-news',
  imports: [MarkdownModule, ProgressSpinnerModule, TranslocoModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsComponent {
  news = signal<string>('');
  isLoading = signal<boolean>(false);
  private readonly onlineService = inject(OnlineService);
  private readonly newsService = inject(NewsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isOnline = toSignal(this.onlineService.online$, { initialValue: false });

  constructor() {
    this.isLoading.set(true);
    this.onlineService.online$
      .pipe(
        switchMap((online) => {
          if (online) {
            this.isLoading.set(true);
            return this.newsService.getNews().pipe(
              tap((news) => {
                this.news.set(news);
                this.isLoading.set(false);
              }),
              catchError(() => {
                this.isLoading.set(false);
                return EMPTY;
              })
            );
          }
          this.isLoading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
