import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-404',
  imports: [ButtonComponent],
  templateUrl: './404.component.html'
})
/** Component displayed when a user navigates to a non-existent route (404 page). */
export class NotFoundComponent {
  constructor(private readonly router: Router) {}

  /** Navigates the user back to the home page. */
  goToHome() {
    this.router.navigate(['/']);
  }
}
