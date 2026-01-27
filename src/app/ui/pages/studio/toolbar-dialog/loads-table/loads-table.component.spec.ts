import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadsTableComponent } from './loads-table.component';

describe('LoadsTableComponent', () => {
  let component: LoadsTableComponent;
  let fixture: ComponentFixture<LoadsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
