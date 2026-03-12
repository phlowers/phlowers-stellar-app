import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ChangelogService } from '@features/changelog/infrastructure/services/changelog.service';
import { ChangelogItem } from '@features/changelog/infrastructure/services/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MarkdownModule } from 'ngx-markdown';
import { DatePipe } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { OnlineService } from '@services/online/online.service';

/** Displays the application changelog entries fetched from the server. */
@Component({
  selector: 'app-changelog',
  imports: [ProgressSpinnerModule, MarkdownModule, DatePipe, PanelModule],
  templateUrl: './changelog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangelogComponent implements OnInit {
  readonly changelogs = signal<ChangelogItem[]>([]);
  isLoading = signal<boolean>(false);
  isOnline = signal<boolean>(false);
  private readonly changelogService = inject(ChangelogService);
  private readonly onlineService = inject(OnlineService);

  ngOnInit() {
    this.isLoading.set(true);
    this.onlineService.online$.subscribe((online) => {
      this.isOnline.set(online);
      if (online) {
        this.changelogService.getChangelogs().subscribe((changelog) => {
          this.changelogs.set(changelog);
          this.isLoading.set(false);
        });
      } else {
        this.isLoading.set(false);
      }
    });
  }
}
