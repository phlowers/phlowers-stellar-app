import { TestBed } from '@angular/core/testing';

import { PlotlyService } from './plotly.service';

describe('PlotlyService', () => {
  let service: PlotlyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlotlyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
