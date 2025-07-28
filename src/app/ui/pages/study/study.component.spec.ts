import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StudyComponent } from './study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';

describe('Study', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;

  beforeEach(async () => {
    const activatedRouteSpy = {
      snapshot: { paramMap: { get: jest.fn(() => 'test-uuid') } },
      params: of({ uuid: 'test-uuid' })
    };

    const studiesServiceSpy = {
      getStudy: jest.fn(),
      duplicateStudy: jest.fn(),
      ready: of(true)
    };

    const routerSpy = {
      navigate: jest.fn()
    };

    const messageServiceSpy = {
      add: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [StudyComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: StudiesService, useValue: studiesServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
