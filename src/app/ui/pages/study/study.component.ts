import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudyHeaderComponent } from '../../shared/components/layout/study-header/study-header.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { SectionsTabComponent } from './tabs/sections/sectionsTab.component';

@Component({
  selector: 'app-study',
  imports: [
    StudyHeaderComponent,
    TabsModule,
    AccordionModule,
    RadioButtonModule,
    FormsModule,
    ButtonModule,
    StepperModule,
    InputTextModule,
    SectionsTabComponent
  ],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss'
})
export class StudyComponent implements OnInit {
  study: Study | null = null;
  sectionSource = signal<string>('manual');
  sectionSources = signal<string[]>(['manual', 'import']);
  source!: string;
  sectionName = signal<string>('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly studiesService: StudiesService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    this.studiesService.ready.subscribe((ready) => {
      if (ready && uuid) {
        this.studiesService.getStudy(uuid).then((study) => {
          if (study) {
            this.study = study;
          }
        });
      }
    });
    this.route.params.subscribe((params) => {
      const uuid = params['uuid'];
      if (uuid) {
        this.studiesService.getStudy(uuid).then((study) => {
          if (study) {
            this.study = study;
          }
        });
      }
    });
  }

  duplicateStudy(uuid: string) {
    this.studiesService.duplicateStudy(uuid).then((study) => {
      if (study) {
        this.router.navigate(['/study', study.uuid]);
      }
    });
  }
}
