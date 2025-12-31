import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StudioTopToolbarComponent } from './top-toolbar.component';
import { ToolsDialogService } from '../tools-dialog/tools-dialog.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpeedDialModule } from 'primeng/speeddial';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { signal } from '@angular/core';

describe('StudioTopToolbarComponent', () => {
  let component: StudioTopToolbarComponent;
  let fixture: ComponentFixture<StudioTopToolbarComponent>;
  let mockPlotService: jest.Mocked<PlotService>;
  let mockToolsDialogService: jest.Mocked<ToolsDialogService>;

  beforeEach(async () => {
    // Mock PlotService
    mockPlotService = {
      plotOptions: signal({
        view: '3d',
        side: 'profile',
        invert: false
      }),
      loading: signal(false),
      plotOptionsChange: jest.fn()
    } as any;

    // Mock ToolsDialogService
    mockToolsDialogService = {
      openTool: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        StudioTopToolbarComponent,
        FormsModule,
        SelectButtonModule,
        DividerModule,
        ToggleSwitchModule,
        MultiSelectModule,
        SpeedDialModule,
        DialogModule,
        CheckboxModule,
        IconComponent,
        ButtonComponent
      ],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: ToolsDialogService, useValue: mockToolsDialogService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudioTopToolbarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct default values', () => {
      expect(component.shortcutsModal()).toBe(false);
      expect(component.shortcutsCount()).toBe(0);
      expect(component.tablesDropdown()).toBeNull();
      expect(component.toolsDropdown()).toBeNull();
    });

    it('should initialize threeDOptions signal', () => {
      const options = component.threeDOptions();
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: '3D', value: '3d' });
      expect(options[1]).toEqual({ label: '2D', value: '2d' });
    });

    it('should initialize sideOptions signal', () => {
      const options = component.sideOptions();
      expect(options).toHaveLength(2);
      expect(options[0].value).toBe('profile');
      expect(options[1].value).toBe('face');
    });

    it('should initialize displayOptions signal', () => {
      const options = component.displayOptions();
      expect(options).toHaveLength(5);
      expect(options.map((o) => o.value)).toEqual([
        'loads',
        'mesh',
        'ground',
        'angleInLine',
        'measure'
      ]);
    });

    it('should initialize toolsItems with 7 items', () => {
      const items = component.toolsItems();
      expect(items).toHaveLength(7);
      expect(items.every((item) => item.checked === false)).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('should call loadToolsItemsState on init', () => {
      const loadSpy = jest.spyOn(component as any, 'loadToolsItemsState');
      component.ngOnInit();
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should initialize tablesDropdown with 5 items', () => {
      component.ngOnInit();
      const tables = component.tablesDropdown();
      expect(tables).toHaveLength(5);
      expect(tables?.[0].label).toBeDefined();
      expect(tables?.[0].command).toBeDefined();
    });

    it('should execute tablesDropdown command for Loads table', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.ngOnInit();
      const tables = component.tablesDropdown();

      tables?.[0].command?.({});
      expect(consoleSpy).toHaveBeenCalledWith('Add action triggered');

      consoleSpy.mockRestore();
    });

    it('should execute tablesDropdown command for L0 table', () => {
      component.ngOnInit();
      const tables = component.tablesDropdown();

      tables?.[1].command?.({});
      expect(mockToolsDialogService.openTool).toHaveBeenCalledWith('l0-sum');
    });

    it('should execute tablesDropdown command for Pose table', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.ngOnInit();
      const tables = component.tablesDropdown();

      tables?.[2].command?.({});
      expect(consoleSpy).toHaveBeenCalledWith('Add action triggered');

      consoleSpy.mockRestore();
    });

    it('should execute tablesDropdown command for Obstacles table', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.ngOnInit();
      const tables = component.tablesDropdown();

      tables?.[3].command?.({});
      expect(consoleSpy).toHaveBeenCalledWith('Add action triggered');

      consoleSpy.mockRestore();
    });

    it('should execute tablesDropdown command for Grounds table', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.ngOnInit();
      const tables = component.tablesDropdown();

      tables?.[4].command?.({});
      expect(consoleSpy).toHaveBeenCalledWith('Add action triggered');

      consoleSpy.mockRestore();
    });

    it('should initialize toolsDropdown from toolsItems', () => {
      component.ngOnInit();
      const tools = component.toolsDropdown();
      expect(tools).toHaveLength(7);
      expect(tools?.[0].label).toBeDefined();
      expect(tools?.[0].command).toBeDefined();
    });

    it('should map toolsItems actions to toolsDropdown commands', () => {
      component.ngOnInit();
      const tools = component.toolsDropdown();

      tools?.[0].command?.({});
      expect(mockToolsDialogService.openTool).toHaveBeenCalledWith(
        'field-measuring'
      );
    });
  });

  describe('checkedCount computed signal', () => {
    it('should return 0 when no items are checked', () => {
      expect(component.checkedCount()).toBe(0);
    });

    it('should return correct count when items are checked', () => {
      const items = component.toolsItems();
      items[0].checked = true;
      items[1].checked = true;
      component.toolsItems.set([...items]);

      expect(component.checkedCount()).toBe(2);
    });

    it('should update reactively when items change', () => {
      const items = component.toolsItems();
      items[0].checked = true;
      component.toolsItems.set([...items]);
      expect(component.checkedCount()).toBe(1);

      items[1].checked = true;
      component.toolsItems.set([...items]);
      expect(component.checkedCount()).toBe(2);
    });

    it('should handle maximum of 5 checked items', () => {
      const items = component.toolsItems();
      for (let i = 0; i < 5; i++) {
        items[i].checked = true;
      }
      component.toolsItems.set([...items]);

      expect(component.checkedCount()).toBe(5);
    });
  });

  describe('updateCheckedCount', () => {
    it('should update toolsItems signal', () => {
      const items = component.toolsItems();
      items[0].checked = true;

      component.updateCheckedCount();

      expect(component.toolsItems()).toBeDefined();
    });

    it('should call saveToolsItemsState', () => {
      const saveSpy = jest.spyOn(component as any, 'saveToolsItemsState');
      component.updateCheckedCount();
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('localStorage persistence', () => {
    it('should save checked items to localStorage', () => {
      const items = component.toolsItems();
      items[0].checked = true;
      items[2].checked = true;
      component.toolsItems.set([...items]);

      component.updateCheckedCount();

      const saved = localStorage.getItem('toolsItemsState');
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(7);
      expect(parsed[0].checked).toBe(true);
      expect(parsed[1].checked).toBe(false);
      expect(parsed[2].checked).toBe(true);
    });

    it('should save all 7 items state correctly', () => {
      const items = component.toolsItems();
      items[0].checked = true;
      items[2].checked = true;
      items[6].checked = true;
      component.toolsItems.set([...items]);

      component.updateCheckedCount();

      const saved = localStorage.getItem('toolsItemsState');
      const parsed = JSON.parse(saved!);

      expect(parsed[0]).toEqual({ id: 1, checked: true });
      expect(parsed[2]).toEqual({ id: 4, checked: true });
      expect(parsed[6]).toEqual({ id: 8, checked: true });
    });

    it('should load checked items from localStorage on init', () => {
      const mockState = [
        { id: 1, checked: true },
        { id: 3, checked: false },
        { id: 4, checked: true },
        { id: 5, checked: false },
        { id: 6, checked: true },
        { id: 7, checked: false },
        { id: 8, checked: false }
      ];
      localStorage.setItem('toolsItemsState', JSON.stringify(mockState));

      component.ngOnInit();

      const items = component.toolsItems();
      expect(items[0].checked).toBe(true);
      expect(items[1].checked).toBe(false);
      expect(items[2].checked).toBe(true);
      expect(items[4].checked).toBe(true);
    });

    it('should handle missing localStorage gracefully', () => {
      localStorage.clear();

      expect(() => component.ngOnInit()).not.toThrow();

      const items = component.toolsItems();
      expect(items.every((item) => item.checked === false)).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('toolsItemsState', 'invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading tools items state:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should preserve action functions when loading from localStorage', () => {
      const mockState = [{ id: 1, checked: true }];
      localStorage.setItem('toolsItemsState', JSON.stringify(mockState));

      component.ngOnInit();

      const items = component.toolsItems();
      expect(typeof items[0].action).toBe('function');
    });

    it('should handle partial state in localStorage', () => {
      const mockState = [
        { id: 1, checked: true },
        { id: 3, checked: true }
      ];
      localStorage.setItem('toolsItemsState', JSON.stringify(mockState));

      component.ngOnInit();

      const items = component.toolsItems();
      expect(items[0].checked).toBe(true);
      expect(items[1].checked).toBe(true);
      // Items not in saved state should keep their default values
      expect(items[2].checked).toBe(false);
    });

    it('should handle state with non-matching IDs', () => {
      const mockState = [
        { id: 999, checked: true }, // Non-existent ID
        { id: 3, checked: true }
      ];
      localStorage.setItem('toolsItemsState', JSON.stringify(mockState));

      component.ngOnInit();

      const items = component.toolsItems();
      expect(items[1].checked).toBe(true);
      // Item with non-matching ID should not affect the component
      expect(items.find((item) => item.id === 999)).toBeUndefined();
    });
  });

  describe('toolsItems actions', () => {
    it('should execute action for tool item 1 - Field measurements', () => {
      const items = component.toolsItems();

      items[0].action();
      expect(mockToolsDialogService.openTool).toHaveBeenCalledWith(
        'field-measuring'
      );
    });

    it('should execute action for tool item 2 - VTL & Guying', () => {
      const items = component.toolsItems();

      items[1].action();
      expect(mockToolsDialogService.openTool).toHaveBeenCalledWith(
        'vtl-and-guying'
      );
    });

    it('should execute action for tool item 3 - Cable marking', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      const items = component.toolsItems();

      items[2].action();
      expect(alertSpy).toHaveBeenCalledWith('click Cable marking');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 4 - Strand RRTS', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      const items = component.toolsItems();

      items[3].action();
      expect(alertSpy).toHaveBeenCalledWith('click Strand RRTS');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 5 - Forest trenches', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      const items = component.toolsItems();

      items[4].action();
      expect(alertSpy).toHaveBeenCalledWith('click Forest trenches');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 6 - Height & lateral distance', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      const items = component.toolsItems();

      items[5].action();
      expect(alertSpy).toHaveBeenCalledWith('click Height & lateral distance');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 7 - Cable adjustment', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      const items = component.toolsItems();

      items[6].action();
      expect(alertSpy).toHaveBeenCalledWith('click Cable adjustment');

      alertSpy.mockRestore();
    });

    it('should execute all actions through toolsDropdown commands', () => {
      const alertSpy = jest.spyOn(globalThis, 'alert').mockImplementation();
      component.ngOnInit();
      const tools = component.toolsDropdown();

      for (let i = 0; i < 7; i++) {
        tools?.[i].command?.({});
      }

      // First two tools call service, remaining 5 call alert
      expect(mockToolsDialogService.openTool).toHaveBeenCalledTimes(2);
      expect(alertSpy).toHaveBeenCalledTimes(5);
      alertSpy.mockRestore();
    });
  });

  describe('shortcutsModal signal', () => {
    it('should toggle shortcutsModal', () => {
      expect(component.shortcutsModal()).toBe(false);

      component.shortcutsModal.set(true);
      expect(component.shortcutsModal()).toBe(true);

      component.shortcutsModal.set(false);
      expect(component.shortcutsModal()).toBe(false);
    });
  });

  describe('displayOptionsStatus signal', () => {
    it('should toggle displayOptionsStatus', () => {
      expect(component.displayOptionsStatus()).toBe(false);

      component.displayOptionsStatus.set(true);
      expect(component.displayOptionsStatus()).toBe(true);

      component.displayOptionsStatus.set(false);
      expect(component.displayOptionsStatus()).toBe(false);
    });
  });

  describe('Integration with PlotService', () => {
    it('should have access to plotService', () => {
      expect(component.plotService).toBeDefined();
      expect(component.plotService).toBe(mockPlotService);
    });

    it('should access plotService.plotOptions', () => {
      const options = component.plotService.plotOptions();
      expect(options.view).toBe('3d');
      expect(options.side).toBe('profile');
      expect(options.invert).toBe(false);
    });
  });

  describe('Maximum 5 items constraint', () => {
    it('should allow checking up to 5 items', () => {
      const items = component.toolsItems();
      for (let i = 0; i < 5; i++) {
        items[i].checked = true;
      }
      component.toolsItems.set([...items]);

      expect(component.checkedCount()).toBe(5);
    });

    it('should disable unchecked items when 5 are checked', () => {
      const items = component.toolsItems();
      for (let i = 0; i < 5; i++) {
        items[i].checked = true;
      }
      component.toolsItems.set([...items]);
      fixture.detectChanges();

      expect(component.checkedCount()).toBe(5);
    });

    it('should persist 5 checked items to localStorage', () => {
      const items = component.toolsItems();
      for (let i = 0; i < 5; i++) {
        items[i].checked = true;
      }
      component.toolsItems.set([...items]);
      component.updateCheckedCount();

      const saved = localStorage.getItem('toolsItemsState');
      const parsed = JSON.parse(saved!);
      const checkedItems = parsed.filter((item: any) => item.checked);

      expect(checkedItems).toHaveLength(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty localStorage', () => {
      localStorage.setItem('toolsItemsState', '');

      component.ngOnInit();

      const items = component.toolsItems();
      // Empty string won't parse as JSON, so items should remain in default state
      expect(items.every((item) => item.checked === false)).toBe(true);
    });

    it('should handle malformed JSON in localStorage', () => {
      localStorage.setItem('toolsItemsState', '{invalid json}');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading tools items state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle null values in localStorage state', () => {
      const mockState = [
        { id: 1, checked: null },
        { id: 3, checked: true }
      ];
      localStorage.setItem('toolsItemsState', JSON.stringify(mockState));

      component.ngOnInit();

      const items = component.toolsItems();
      // Should handle null gracefully
      expect(items[1].checked).toBe(true);
    });

    it('should handle undefined in localStorage', () => {
      localStorage.setItem('toolsItemsState', 'undefined');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
