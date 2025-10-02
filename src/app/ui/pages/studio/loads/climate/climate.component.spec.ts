import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimateComponent } from './climate.component';

describe('Climate', () => {
  let component: ClimateComponent;
  let fixture: ComponentFixture<ClimateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ClimateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
