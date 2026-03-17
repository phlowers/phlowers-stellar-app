import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangelogComponent } from './changelog.component';
import { ChangelogService } from '@features/changelog/infrastructure/services/changelog.service';
import { OnlineService } from '@services/online/online.service';
import { BehaviorSubject, of } from 'rxjs';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('Changelog component', () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;
  let changelogServiceMock: jest.Mocked<ChangelogService>;
  let onlineServiceMock: jest.Mocked<OnlineService>;

  const mockChangelogs = [
    {
      name: 'v1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      body: '# Release 1.0.0'
    }
  ];

  beforeEach(async () => {
    changelogServiceMock = {
      getChangelogs: jest.fn().mockReturnValue(of(mockChangelogs))
    } as unknown as jest.Mocked<ChangelogService>;

    onlineServiceMock = {
      online$: new BehaviorSubject<boolean>(true)
    } as unknown as jest.Mocked<OnlineService>;

    await TestBed.configureTestingModule({
      imports: [ChangelogComponent],
      providers: [
        provideHttpClient(),
        provideMarkdown(),
        provideNoopAnimations(),
        { provide: ChangelogService, useValue: changelogServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load changelogs when online', async () => {
    await fixture.whenStable();

    expect(changelogServiceMock.getChangelogs).toHaveBeenCalled();
    expect(component.changelogs().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should not load changelogs when offline', () => {
    (onlineServiceMock.online$ as BehaviorSubject<boolean>).next(false);

    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;

    expect(changelogServiceMock.getChangelogs).toHaveBeenCalledTimes(1); // only from the first component
    expect(component.isOnline()).toBe(false);
    expect(component.isLoading()).toBe(false);
  });

  it('should set isOnline signal based on online status', () => {
    expect(component.isOnline()).toBe(true);
  });
});
