import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TangentAimingComponent } from './tangent-aiming.component';

describe('TangentAiming component', () => {
  let component: TangentAimingComponent;
  let fixture: ComponentFixture<TangentAimingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TangentAimingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentAimingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
