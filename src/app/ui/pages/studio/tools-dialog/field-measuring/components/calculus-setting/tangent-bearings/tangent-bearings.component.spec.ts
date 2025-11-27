import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TangentBearingsComponent } from './tangent-bearings.component';

describe('TangentBearings component', () => {
  let component: TangentBearingsComponent;
  let fixture: ComponentFixture<TangentBearingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TangentBearingsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TangentBearingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
