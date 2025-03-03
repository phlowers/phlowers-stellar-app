import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreePageComponent } from './three-page.component';

describe('ThreePageComponent', () => {
  let component: ThreePageComponent;
  let fixture: ComponentFixture<ThreePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
