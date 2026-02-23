import { Component, OnInit, signal } from '@angular/core';
import { ChangelogService } from '@services/changelog/changelog.service';
import { ChangelogItem } from '@services/changelog/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MarkdownModule } from 'ngx-markdown';
import { DatePipe } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { OnlineService } from '@services/online/online.service';

@Component({
  selector: 'app-changelog',
  imports: [ProgressSpinnerModule, MarkdownModule, DatePipe, PanelModule],
  templateUrl: './changelog.component.html'
})
/**
 * Component that displays application changelog entries.
 * Fetches changelog data when online and shows a loading spinner during retrieval.
 */
export class ChangelogComponent implements OnInit {
  /** List of changelog entries to display. */
  changelogs: ChangelogItem[] = [];
  /** Signal indicating whether changelog data is currently being loaded. */
  isLoading = signal<boolean>(false);
  /** Signal indicating whether the application is currently online. */
  isOnline = signal<boolean>(false);
  constructor(
    private readonly changelogService: ChangelogService,
    private readonly onlineService: OnlineService
  ) {}

  /** Subscribes to the online status and fetches changelogs when online. */
  ngOnInit() {
    this.isLoading.set(true);
    this.onlineService.online$.subscribe((online) => {
      this.isOnline.set(online);
      if (online) {
        this.changelogService.getChangelogs().subscribe((changelog) => {
          this.changelogs = changelog;
          this.isLoading.set(false);
        });
      } else {
        this.isLoading.set(false);
      }
    });
  }
}
