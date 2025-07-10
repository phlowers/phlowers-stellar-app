import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyHeader } from './study-header.component';

describe('StudyHeader', () => {
  let component: StudyHeader;
  let fixture: ComponentFixture<StudyHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyHeader]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
