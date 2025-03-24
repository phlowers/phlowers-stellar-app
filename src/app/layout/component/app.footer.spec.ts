import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppFooter } from './app.footer';
import { By } from '@angular/platform-browser';

describe('AppFooter Component', () => {
  let fixture: ComponentFixture<AppFooter>;
  let component: AppFooter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // declarations: [AppFooter]
    }).compileComponents();

    fixture = TestBed.createComponent(AppFooter);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial change detection
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the footer text correctly', () => {
    const footerElement = fixture.debugElement.query(By.css('.layout-footer')).nativeElement;
    expect(footerElement.textContent).toContain('STELLAR by RTE');
  });
});
