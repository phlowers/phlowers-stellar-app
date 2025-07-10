import { Component } from '@angular/core';
import { StudyHeader } from '../../shared/components/layout/study-header/study-header.component';

@Component({
  selector: 'app-study',
  imports: [StudyHeader],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss'
})
export class StudyComponent {}
