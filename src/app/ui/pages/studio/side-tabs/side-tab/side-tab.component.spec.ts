import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideTabComponent } from './side-tab.component';

describe('SideTab', () => {
  let component: SideTabComponent;
  let fixture: ComponentFixture<SideTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideTabComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SideTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
