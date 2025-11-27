import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculusSettingComponent } from './calculus-setting.component';

describe('CalculusSetting component', () => {
  let component: CalculusSettingComponent;
  let fixture: ComponentFixture<CalculusSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculusSettingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculusSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
