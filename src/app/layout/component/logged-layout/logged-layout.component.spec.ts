import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnlineService } from '../../../core/api/services/online.service';
import { appRoutes } from '../../../app.routes';
import { LoggedLayoutComponent } from './logged-layout.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

// Create mock components to avoid loading the actual implementations
@Component({
  selector: 'app-topbar',
  template: ''
})
class MockTopbarComponent {}

@Component({
  selector: 'app-sidebar',
  template: ''
})
class MockSidebarComponent {}

describe('LoggedLayoutComponent', () => {
  let component: LoggedLayoutComponent;
  let fixture: ComponentFixture<LoggedLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggedLayoutComponent],
      providers: [
        OnlineService,
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TopbarComponent, useClass: MockTopbarComponent },
        { provide: SidebarComponent, useClass: MockSidebarComponent }
      ]
    })
      .overrideComponent(LoggedLayoutComponent, {
        set: {
          imports: [MockTopbarComponent, MockSidebarComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoggedLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have topbar, sidebar and router-outlet', () => {
    const topbar =
      fixture.debugElement.nativeElement.querySelector('app-topbar');
    const sidebar =
      fixture.debugElement.nativeElement.querySelector('app-sidebar');
    const routerOutlet =
      fixture.debugElement.nativeElement.querySelector('router-outlet');

    expect(topbar).toBeTruthy();
    expect(sidebar).toBeTruthy();
    expect(routerOutlet).toBeTruthy();
  });

  it('should initialize sidebar navigation items', () => {
    expect(component.sideBarNav()).toEqual({
      main: [
        {
          id: 'sideB-home',
          label: 'Home',
          route: '/',
          icon: 'home'
        },
        {
          id: 'sideB-studies',
          label: 'Studies',
          route: '/studies',
          icon: 'folder'
        },
        {
          id: 'sideB-section',
          label: 'Sections',
          route: '/sections',
          icon: 'timeline'
        },
        {
          id: 'sideB-plotlyJs',
          label: 'Plotly JS POC',
          shortLabel: 'plot poc',
          route: '/plotly',
          icon: 'ssid_chart'
        }
      ],
      footer: [
        {
          id: 'sideB-usrPref',
          label: 'User preference',
          shortLabel: 'usr pref',
          route: '/admin',
          icon: 'Account_circle_filled'
        }
      ]
    });
  });
});
