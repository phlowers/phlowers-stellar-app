import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PrimeDebugComponent } from './prime-debug.component';

describe('PrimeDebugComponent', () => {
  let component: PrimeDebugComponent;
  let fixture: ComponentFixture<PrimeDebugComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimeDebugComponent],
      providers: [provideNoopAnimations()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrimeDebugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
