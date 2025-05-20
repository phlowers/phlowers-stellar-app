import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap, startWith } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  private pageTitleSubject = new BehaviorSubject<string>('');
  public pageTitle$: Observable<string> = this.pageTitleSubject.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title
  ) {
    this.router.events
      .pipe(
        startWith({} as NavigationEnd),
        filter(
          (event) =>
            event instanceof NavigationEnd || Object.keys(event).length === 0
        ),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.title)
      )
      .subscribe((title) => {
        if (title) {
          const titleString = title as string;
          this.pageTitleSubject.next(titleString);
          this.titleService.setTitle(titleString);
        }
      });
  }

  getCurrentTitle(): string {
    return this.pageTitleSubject.value;
  }
}
