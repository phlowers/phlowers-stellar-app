import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotlyCompComponent } from './plotly-comp.component';

describe('PlotlyCompComponent', () => {
  let component: PlotlyCompComponent;
  let fixture: ComponentFixture<PlotlyCompComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotlyCompComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlotlyCompComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
