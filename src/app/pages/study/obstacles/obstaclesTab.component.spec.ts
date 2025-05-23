import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObstaclesTabComponent } from './obstaclesTab.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ModifyPositionModalComponent } from './modify-position-modal';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Obstacle } from '../types';
import { By } from '@angular/platform-browser';

jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({})
}));

describe('ObstaclesTabComponent', () => {
  let component: ObstaclesTabComponent;
  let fixture: ComponentFixture<ObstaclesTabComponent>;

  const mockObstacles: Obstacle[] = [
    {
      uuid: 'test-uuid-1',
      name: 'Test Obstacle 1',
      type: 'barrier',
      positions: [{ x: 10, y: 20, z: 30 }],
      support: 'floor'
    },
    {
      uuid: 'test-uuid-2',
      name: 'Test Obstacle 2',
      type: 'wall',
      positions: [{ x: 15, y: 25, z: 35 }],
      support: 'ceiling'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TableModule,
        InputTextModule,
        CheckboxModule,
        TabsModule,
        CardModule,
        DividerModule,
        DialogModule,
        FontAwesomeModule,
        ProgressSpinnerModule,
        ObstaclesTabComponent,
        ModifyPositionModalComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObstaclesTabComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided obstacles', () => {
    component.obstacles = [...mockObstacles];
    fixture.detectChanges();
    expect(component.obstacles).toEqual(mockObstacles);
  });

  it('should initialize with initialObstaclesObjects if obstacles is empty', () => {
    component.obstacles = [];
    component.initialObstaclesObjects = [...mockObstacles];
    component.ngOnInit();
    expect(component.obstacles).toEqual(mockObstacles);
  });

  it('should add a new obstacle', () => {
    // Setup
    component.obstacles = [...mockObstacles];
    const initialLength = component.obstacles.length;
    const obstaclesChangeSpy = jest.spyOn(component.obstaclesChange, 'emit');

    // Execute
    component.addObstacle();

    // Verify
    expect(component.obstacles.length).toBe(initialLength + 1);
    expect(component.obstacles[initialLength].name).toBe(
      `obstacle ${initialLength + 1}`
    );
    expect(component.obstacles[initialLength].positions[0]).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
    expect(obstaclesChangeSpy).toHaveBeenCalledWith(component.obstacles);
  });

  it('should open the modify position modal with correct uuid', () => {
    // Setup
    const testUuid = 'test-uuid-123';

    // Execute
    component.openModifyPositionModal(testUuid);

    // Verify
    expect(component.modifyPositionModal()).toBe(true);
    expect(component.uuid()).toBe(testUuid);
  });

  it('should modify obstacle position when modifyObstacle is called', () => {
    // Setup
    component.obstacles = [...mockObstacles];
    const testObstacle = component.obstacles[0];
    const newPosition = { uuid: testObstacle.uuid, x: 100, y: 200, z: 300 };

    // Execute
    component.modifyObstacle(newPosition);

    // Verify
    expect(testObstacle.positions[0].x).toBe(100);
    expect(testObstacle.positions[0].y).toBe(200);
    expect(testObstacle.positions[0].z).toBe(300);
  });

  it('should do nothing when modifyObstacle is called with unknown uuid', () => {
    // Setup
    component.obstacles = [...mockObstacles];
    const originalObstacles = JSON.parse(JSON.stringify(component.obstacles));
    const nonExistentUuid = 'non-existent-uuid';

    // Execute
    component.modifyObstacle({ uuid: nonExistentUuid, x: 100, y: 200, z: 300 });

    // Verify obstacles remain unchanged
    expect(component.obstacles).toEqual(originalObstacles);
  });

  it('should round position values to 2 decimal places when modifying obstacle', () => {
    // Setup
    component.obstacles = [...mockObstacles];
    const testObstacle = component.obstacles[0];
    const newPosition = {
      uuid: testObstacle.uuid,
      x: 100.123456,
      y: 200.987654,
      z: 300.555555
    };

    // Execute
    component.modifyObstacle(newPosition);

    // Verify
    expect(testObstacle.positions[0].x).toBe(100.12);
    expect(testObstacle.positions[0].y).toBe(200.99);
    expect(testObstacle.positions[0].z).toBe(300.56);
  });

  it('should render the "Add Obstacle" button', () => {
    fixture.detectChanges();
    const button = fixture.debugElement.query(
      By.css('p-button[severity="info"]')
    );
    expect(button).toBeTruthy();
  });

  it('should render the obstacles table', () => {
    component.obstacles = [...mockObstacles];
    fixture.detectChanges();
    const table = fixture.debugElement.query(By.css('p-table'));
    expect(table).toBeTruthy();
  });

  // it('should pass correct properties to modify position modal', () => {
  //   // Setup
  //   const testUuid = 'test-uuid-modal';
  //   component.uuid.set(testUuid);
  //   component.modifyPositionModal.set(true);

  //   fixture.detectChanges();

  //   // Verify
  //   const modal = fixture.debugElement.query(
  //     By.css('app-modify-position-modal')
  //   );
  //   expect(modal).toBeTruthy();
  //   expect(modal.properties.visible).toBe(true);
  //   expect(modal.properties.uuid).toBe(testUuid);
  // });
});
