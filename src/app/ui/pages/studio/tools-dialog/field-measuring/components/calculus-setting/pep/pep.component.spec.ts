import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PepComponent } from './pep.component';

describe('Pep component', () => {
  let component: PepComponent;
  let fixture: ComponentFixture<PepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PepComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
