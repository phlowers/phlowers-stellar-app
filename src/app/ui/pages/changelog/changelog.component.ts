import { Component, OnInit, signal } from '@angular/core';
import { ChangelogService } from '@src/app/core/services/changelog/changelog.service';
import { ChangelogItem } from '@src/app/core/services/changelog/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MarkdownModule } from 'ngx-markdown';
import { DatePipe } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { OnlineService } from '@src/app/core/services/online/online.service';

@Component({
  selector: 'app-changelog',
  imports: [ProgressSpinnerModule, MarkdownModule, DatePipe, PanelModule],
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss'
})
export class ChangelogComponent implements OnInit {
  changelogs: ChangelogItem[] = [];
  isLoading = signal<boolean>(false);
  isOnline = signal<boolean>(false);
  constructor(
    private readonly changelogService: ChangelogService,
    private readonly onlineService: OnlineService
  ) {}

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
