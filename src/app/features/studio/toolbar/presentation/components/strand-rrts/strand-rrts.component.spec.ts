import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrandRrtsComponent } from './strand-rrts.component';

describe('StrandRrtsComponent', () => {
  let component: StrandRrtsComponent;
  let fixture: ComponentFixture<StrandRrtsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrandRrtsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StrandRrtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
