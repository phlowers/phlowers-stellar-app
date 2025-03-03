import { TestBed } from '@angular/core/testing';

import { ThreeLineService } from './three-line.service';

describe('ThreeService', () => {
  let service: ThreeLineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeLineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
