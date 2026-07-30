import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { TranslocoModule } from '@jsverse/transloco';

/** Page displayed when a route is not found (404). */
@Component({
  selector: 'app-404',
  imports: [ButtonComponent, TranslocoModule],
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  private readonly router = inject(Router);

  goToHome() {
    this.router.navigate(['/']);
  }
}
