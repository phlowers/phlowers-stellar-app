import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TangentAimingHeaderComponent } from './tangent-aiming-header.component';

describe('TangentAimingHeader component', () => {
  let fixture: ComponentFixture<TangentAimingHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'common.tangent-aiming-mandatory-msg': 'All data are mandatory' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        TangentAimingHeaderComponent
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TangentAimingHeaderComponent);
    fixture.componentRef.setInput('mandatoryId', 'mandatory-test');
    fixture.detectChanges();
  });

  it('should render a disabled help button', () => {
    const button = fixture.nativeElement.querySelector('[data-testid="help-btn"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should render the mandatory message with the given id', () => {
    const message = fixture.nativeElement.querySelector('#mandatory-test') as HTMLElement;
    expect(message.textContent).toContain('All data are mandatory');
  });
});
