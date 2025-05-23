import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModifyPositionComponent } from './modify-position';
import { WorkerService } from '../../../core/engine/worker/worker.service';
import { of } from 'rxjs';
import { Task } from '../../../core/engine/worker/tasks';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Mock Plotly properly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({})
}));

describe('ModifyPositionComponent', () => {
  let component: ModifyPositionComponent;
  let fixture: ComponentFixture<ModifyPositionComponent>;
  let workerServiceMock: Partial<WorkerService>;

  beforeEach(() => {
    // Create a mock for WorkerService
    workerServiceMock = {
      runTask: jest.fn(),
      ready$: of(true)
    };

    TestBed.configureTestingModule({
      imports: [ModifyPositionComponent],
      providers: [{ provide: WorkerService, useValue: workerServiceMock }],
      schemas: [NO_ERRORS_SCHEMA] // To avoid errors from missing child components
    });

    fixture = TestBed.createComponent(ModifyPositionComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.visible).toBe(false);
    expect(component.litData()).toBeNull();
    expect(component.position).toBe('');
  });

  it('should call runPython on initialization', () => {
    // Spy on runPython method
    jest.spyOn(component, 'runPython');

    // Trigger ngOnInit
    component.ngOnInit();

    // Expect runPython to be called
    expect(component.runPython).toHaveBeenCalled();
  });

  it('should call workerService.runTask when runPython is called', () => {
    // Call runPython
    component.runPython();

    // Verify that workerService.runTask was called with the correct parameters
    expect(workerServiceMock.runTask).toHaveBeenCalledWith(Task.runPython2, {});
  });

  it('should update visible property and emit event when onHide is called', () => {
    // Spy on the output event
    jest.spyOn(component.visibleChange, 'emit');

    // Set visible to true initially
    component.visible = true;

    // Call onHide
    component.onHide();

    // Verify visible was set to false
    expect(component.visible).toBe(false);

    // Verify event was emitted with false value
    expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
  });

  it('should subscribe to workerService.ready$ on initialization', () => {
    // Spy on runPython
    jest.spyOn(component, 'runPython');

    // Initialize component
    component.ngOnInit();

    // Verify runPython was called when ready$ emitted
    expect(component.runPython).toHaveBeenCalled();
  });

  it('should log to console when runPython is called', () => {
    // Spy on console.log
    jest.spyOn(console, 'log').mockImplementation();

    // Call runPython
    component.runPython();

    // Verify console.log was called with the correct message
    expect(console.log).toHaveBeenCalledWith(
      'runPython in modify position modal'
    );
  });
});
