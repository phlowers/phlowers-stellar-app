import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap, startWith } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service that tracks and exposes the current page title based on Angular router navigation events.
 * It listens for `NavigationEnd` events, resolves the deepest activated route's title,
 * and updates both the browser document title and an observable stream.
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  private readonly pageTitleSubject = new BehaviorSubject<string>('');

  /** Observable that emits the current page title whenever it changes. */
  public pageTitle$: Observable<string> = this.pageTitleSubject.asObservable();

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly titleService: Title
  ) {
    this.router.events
      .pipe(
        startWith({} as NavigationEnd),
        filter((event) => event instanceof NavigationEnd || Object.keys(event || {}).length === 0),
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
          const titleString = title;
          this.pageTitleSubject.next(titleString);
          this.titleService.setTitle(titleString);
        }
      });
  }

  /**
   * Returns the current page title synchronously.
   * @returns The current page title string.
   */
  getCurrentTitle(): string {
    return this.pageTitleSubject.value;
  }
}
