import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ChangelogComponent } from './changelog.component';

describe('Changelog component', () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
