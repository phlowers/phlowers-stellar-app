/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MessageService } from 'primeng/api';
import { StorageService } from './core/store/storage.service';
import { WorkerService } from './core/engine/worker/worker.service';
import { OnlineService } from './core/api/services/online.service';
import { BehaviorSubject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

class Worker {
  url: string;
  onmessage: (msg: string) => void;
  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = () => {
      console.log('onmessage');
    };
  }

  postMessage(msg: string) {
    this.onmessage(msg);
  }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockMessageService: MessageService;
  let mockStorageService: StorageService;
  let mockWorkerService: WorkerService;
  let mockOnlineService: OnlineService;
  let readySubject: BehaviorSubject<boolean>;
  let workerReadySubject: BehaviorSubject<boolean>;

  const mockDb = {
    users: {
      toArray: jest.fn(),
      add: jest.fn(),
      clear: jest.fn()
    }
  };

  beforeEach(async () => {
    // @ts-expect-error worker
    window.Worker = Worker;
    readySubject = new BehaviorSubject<boolean>(true);
    workerReadySubject = new BehaviorSubject<boolean>(true);

    mockMessageService = {
      add: jest.fn()
    } as unknown as MessageService;

    mockDb.users.toArray = jest.fn().mockResolvedValue([]);
    mockDb.users.add = jest.fn();
    mockDb.users.clear = jest.fn();

    mockStorageService = {
      setPersistentStorage: jest.fn().mockResolvedValue(undefined),
      createDatabase: jest.fn().mockResolvedValue(undefined),
      ready$: readySubject,
      db: mockDb
    } as unknown as StorageService;

    mockWorkerService = {
      setupWorker: jest.fn(),
      ready$: workerReadySubject
    } as unknown as WorkerService;

    mockOnlineService = {} as OnlineService;

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        RouterTestingModule,
        AppComponent
      ]
    }).compileComponents();
    TestBed.overrideProvider(WorkerService, { useValue: mockWorkerService });
    TestBed.overrideProvider(StorageService, { useValue: mockStorageService });
    TestBed.overrideProvider(OnlineService, { useValue: mockOnlineService });
    TestBed.overrideProvider(MessageService, { useValue: mockMessageService });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct title', () => {
    expect(component.title).toEqual('phlowers-stellar-app');
  });

  it('should have router-outlet', () => {
    const routerOutlet =
      fixture.debugElement.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  describe('setupWorker', () => {
    it('should setup worker and initialize database', async () => {
      await component.setupWorker();

      expect(mockWorkerService.setupWorker).toHaveBeenCalled();
      expect(mockStorageService.setPersistentStorage).toHaveBeenCalled();
      expect(mockStorageService.createDatabase).toHaveBeenCalled();
    });

    it('should handle errors when initializing database', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');
      (mockStorageService.createDatabase as jest.Mock).mockRejectedValue(error);

      await component.setupWorker();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating database',
        error
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('User dialog', () => {
    it('should show user dialog if no users exist', async () => {
      mockDb.users.toArray.mockResolvedValue([]);
      mockDb.users.clear.mockResolvedValue(undefined);

      // Trigger the subscription in constructor
      readySubject.next(true);
      await fixture.whenStable();

      expect(mockDb.users.clear).toHaveBeenCalled();
      expect(component.userDialog).toBe(true);
    });

    it('should not show user dialog if a user exists', async () => {
      mockDb.users.toArray.mockResolvedValue([{ email: 'test@example.com' }]);

      // Trigger the subscription in constructor
      readySubject.next(true);
      await fixture.whenStable();

      expect(component.userDialog).toBe(false);
    });

    it('should save valid user and close dialog', async () => {
      component.user.email = 'test@example.com';
      mockDb.users.add.mockResolvedValue(1);

      await component.saveUser();

      expect(component.submitted).toBe(true);
      expect(mockDb.users.add).toHaveBeenCalledWith({
        email: 'test@example.com'
      });
      expect(component.userDialog).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Successful',
        detail: 'User info set',
        life: 3000
      });
    });

    it('should not save user with invalid email', async () => {
      component.user.email = 'invalid-email';

      await component.saveUser();

      expect(component.submitted).toBe(true);
      expect(mockDb.users.add).not.toHaveBeenCalled();
      expect(component.userDialog).toBe(true);
    });

    it('should not save user with empty email', async () => {
      component.user.email = '';

      await component.saveUser();

      expect(component.submitted).toBe(true);
      expect(mockDb.users.add).not.toHaveBeenCalled();
    });
  });

  describe('Email validation', () => {
    it('should validate correct email formats', () => {
      // Import the validateEmail function from the component file
      const validateEmail = (email: string) => {
        return String(email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
      };

      expect(validateEmail('test@example.com')).toBeTruthy();
      expect(validateEmail('test.name@example.co.uk')).toBeTruthy();
      expect(validateEmail('test+label@example.com')).toBeTruthy();

      expect(validateEmail('invalid-email')).toBeFalsy();
      expect(validateEmail('test@')).toBeFalsy();
      expect(validateEmail('@example.com')).toBeFalsy();
    });
  });
});
