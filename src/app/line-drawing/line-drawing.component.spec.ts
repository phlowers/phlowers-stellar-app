import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineDrawingComponent } from './line-drawing.component';

describe('LineDrawingComponent', () => {
  let component: LineDrawingComponent;
  let fixture: ComponentFixture<LineDrawingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineDrawingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineDrawingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
