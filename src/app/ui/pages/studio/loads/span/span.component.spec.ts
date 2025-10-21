import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpanComponent } from './span.component';

describe('Span component', () => {
  let component: SpanComponent;
  let fixture: ComponentFixture<SpanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpanComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SpanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
