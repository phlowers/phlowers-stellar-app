import { Component, OnInit, signal } from '@angular/core';
import { NewsService } from '@services/news/news.service';
import { OnlineService } from '@services/online/online.service';
import { MarkdownModule } from 'ngx-markdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-news',
  imports: [MarkdownModule, ProgressSpinnerModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss'
})
/**
 * Component that displays the application news content fetched as markdown.
 * Shows a loading spinner while content is being retrieved and handles offline state.
 */
export class NewsComponent implements OnInit {
  /** Signal indicating whether the application is currently online. */
  isOnline = signal<boolean>(false);
  /** Signal holding the markdown news content. */
  news = signal<string>('');
  /** Signal indicating whether the news content is currently being loaded. */
  isLoading = signal<boolean>(false);
  constructor(
    private readonly onlineService: OnlineService,
    private readonly newsService: NewsService
  ) {}

  /** Subscribes to the online status and fetches news content when online. */
  ngOnInit() {
    this.isLoading.set(true);
    this.onlineService.online$.subscribe((online) => {
      this.isOnline.set(online);
      if (online) {
        this.newsService.getNews().subscribe(
          (news) => {
            console.log(news);
            this.news.set(news);
            this.isLoading.set(false);
          },
          () => {
            this.isLoading.set(false);
          }
        );
      } else {
        this.isLoading.set(false);
      }
    });
  }
}
