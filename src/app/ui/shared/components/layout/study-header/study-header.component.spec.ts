import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { StudyHeaderComponent } from './study-header.component';

describe('StudyHeader', () => {
  let component: StudyHeaderComponent;
  let fixture: ComponentFixture<StudyHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyHeaderComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyHeaderComponent);
    component = fixture.componentInstance;
    // Provide required input value
    fixture.componentRef.setInput('study', null);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
