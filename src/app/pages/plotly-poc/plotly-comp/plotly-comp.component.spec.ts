import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotlyComponent } from './plotly-comp.component';

describe('PlotlyComponent', () => {
  let component: PlotlyComponent;
  let fixture: ComponentFixture<PlotlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotlyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlotlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
