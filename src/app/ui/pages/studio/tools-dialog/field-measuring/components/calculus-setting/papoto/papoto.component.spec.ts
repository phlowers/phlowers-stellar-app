import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PapotoComponent } from './papoto.component';

describe('Papoto component', () => {
  let component: PapotoComponent;
  let fixture: ComponentFixture<PapotoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PapotoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PapotoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
