import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, filter, map, mergeMap, startWith } from 'rxjs/operators';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
/** Service that tracks the current page title based on Angular router events and updates the browser tab title. */
export class PageTitleService {
  private readonly pageTitleSubject = new BehaviorSubject<string>('');
  public pageTitle$: Observable<string> = this.pageTitleSubject.asObservable();

  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly transloco = inject(TranslocoService);

  constructor() {
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
        mergeMap((route) => route.title.pipe(catchError(() => EMPTY)))
      )
      .subscribe((title) => {
        if (title) {
          const titleString = this.transloco.translate(title);
          this.pageTitleSubject.next(titleString);
          this.titleService.setTitle(titleString);
        }
      });
  }

  /**
   * Returns the current page title synchronously.
   */
  getCurrentTitle(): string {
    return this.pageTitleSubject.value;
  }
}
