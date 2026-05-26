import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CableSupportManipComponent } from './cable-support-manip.component';

describe('CableSupportManipComponent', () => {
  let component: CableSupportManipComponent;
  let fixture: ComponentFixture<CableSupportManipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CableSupportManipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CableSupportManipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
