import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideTab } from './side-tab';

describe('SideTab', () => {
  let component: SideTab;
  let fixture: ComponentFixture<SideTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideTab]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SideTab);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
