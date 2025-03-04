import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotlyTestLineComponent } from './plotly-test-line.component';

describe('PlotlyTestLineComponent', () => {
  let component: PlotlyTestLineComponent;
  let fixture: ComponentFixture<PlotlyTestLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlotlyTestLineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlotlyTestLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
