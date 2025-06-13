import { Component } from '@angular/core';
import { IconComponent } from '../../shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../shared/components/atoms/card/card.component';

@Component({
  selector: 'app-home',
  imports: [ButtonComponent, IconComponent, CardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  alertClick() {
    alert('element clicked');
  }
}
