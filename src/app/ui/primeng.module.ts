import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { NgModule } from '@angular/core';

const primeNgModules: any[] = [
  DialogModule,
  RippleModule,
  ButtonModule,
  ToastModule,
  ToolbarModule,
  RatingModule,
  InputTextModule,
  TextareaModule,
  SelectModule,
  RadioButtonModule,
  InputNumberModule,
  TagModule,
  InputIconModule,
  IconFieldModule,
  ConfirmDialogModule,
  MessageModule
];

@NgModule({
  imports: [...primeNgModules],
  exports: [...primeNgModules]
})
export class PrimeNgModules {}
