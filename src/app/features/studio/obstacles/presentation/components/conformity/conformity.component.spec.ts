import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConformityComponent } from './conformity.component';

describe('ConformityComponent', () => {
  let component: ConformityComponent;
  let fixture: ComponentFixture<ConformityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConformityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConformityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
