import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ChangelogService } from '@features/changelog/infrastructure/services/changelog.service';
import { ChangelogItem } from '@features/changelog/infrastructure/services/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MarkdownModule } from 'ngx-markdown';
import { DatePipe } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { OnlineService } from '@services/online/online.service';
import { EMPTY, switchMap, tap } from 'rxjs';

/** Displays the application changelog entries fetched from the server. */
@Component({
  selector: 'app-changelog',
  imports: [ProgressSpinnerModule, MarkdownModule, DatePipe, PanelModule],
  templateUrl: './changelog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangelogComponent {
  readonly changelogs = signal<ChangelogItem[]>([]);
  isLoading = signal<boolean>(false);
  private readonly changelogService = inject(ChangelogService);
  private readonly onlineService = inject(OnlineService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isOnline = toSignal(this.onlineService.online$, { initialValue: false });

  constructor() {
    this.isLoading.set(true);
    this.onlineService.online$
      .pipe(
        switchMap((online) => {
          if (online) {
            this.isLoading.set(true);
            return this.changelogService.getChangelogs().pipe(
              tap((changelog) => {
                this.changelogs.set(changelog);
                this.isLoading.set(false);
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
