import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-404',
  imports: [ButtonComponent],
  templateUrl: './404.component.html'
})
export class NotFoundComponent {
  constructor(private readonly router: Router) {}

  goToHome() {
    this.router.navigate(['/']);
  }
}
