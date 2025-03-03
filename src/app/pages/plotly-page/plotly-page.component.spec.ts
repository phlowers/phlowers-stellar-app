import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotlyPageComponent } from './plotly-page.component';

describe('PlotlyPageComponent', () => {
  let component: PlotlyPageComponent;
  let fixture: ComponentFixture<PlotlyPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotlyPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlotlyPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
