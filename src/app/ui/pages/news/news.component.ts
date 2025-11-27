import { Component, OnInit, signal } from '@angular/core';
import { NewsService } from '@src/app/core/services/news/news.service';
import { OnlineService } from '@src/app/core/services/online/online.service';
import { MarkdownModule } from 'ngx-markdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-news',
  imports: [MarkdownModule, ProgressSpinnerModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss'
})
export class NewsComponent implements OnInit {
  isOnline = signal<boolean>(false);
  news = signal<string>('');
  isLoading = signal<boolean>(false);
  constructor(
    private readonly onlineService: OnlineService,
    private readonly newsService: NewsService
  ) {}

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
