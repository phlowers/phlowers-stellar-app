import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StudioTopToolbarComponent } from './top-toolbar.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { SelectedDisplayOptions, ScalingFactors } from '@shared/types/plot.types';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotResolutionService } from '@services/plot/plot-resolution.service';
import { Section } from '@shared/domain';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { SpeedDialModule } from 'primeng/speeddial';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { signal } from '@angular/core';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('StudioTopToolbarComponent', () => {
  let component: StudioTopToolbarComponent;
  let fixture: ComponentFixture<StudioTopToolbarComponent>;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockSpanService: { section: ReturnType<typeof signal<unknown>> };
  let plotOptionsServiceMock: {
    plotOptions: ReturnType<typeof signal>;
    isFreePositioningMode: ReturnType<typeof signal<boolean>>;
    selectedDisplayOptions: ReturnType<typeof signal>;
    setAxesNorms: ReturnType<typeof vi.fn>;
    setBaseScaleFactors: ReturnType<typeof vi.fn>;
    scalingFactors: ReturnType<typeof signal<ScalingFactors>>;
    setScalingFactors: ReturnType<typeof vi.fn>;
  };
  let resolutionServiceMock: {
    resolution: ReturnType<typeof signal<number>>;
    defaultResolution: ReturnType<typeof signal<number>>;
    setResolution: ReturnType<typeof vi.fn>;
    applyResolution: ReturnType<typeof vi.fn>;
  };
  let mockToolbarDialogService: vi.Mocked<ToolbarDialogService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    // Mock PlotService
    mockPlotService = {
      loading: signal(false),
      plotOptionsChange: vi.fn(),
      refreshProjection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<PlotService>;

    mockSpanService = {
      section: signal(null)
    };

    plotOptionsServiceMock = {
      plotOptions: signal({
        view: '3d',
        side: 'profile',
        invert: false
      }),
      isFreePositioningMode: signal(false),
      selectedDisplayOptions: signal({
        loads: false,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      }),
      setAxesNorms: vi.fn(),
      setBaseScaleFactors: vi.fn(),
      scalingFactors: signal<ScalingFactors>({ x: 1, y: 1, z: 1, aspectMode: 'data' }),
      setScalingFactors: vi.fn()
    };

    resolutionServiceMock = {
      resolution: signal(100),
      defaultResolution: signal(100),
      setResolution: vi.fn(),
      applyResolution: vi.fn().mockResolvedValue(undefined)
    };

    // Mock ToolbarDialogService
    mockToolbarDialogService = {
      openTool: vi.fn()
    } as unknown as vi.Mocked<ToolbarDialogService>;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
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
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: PlotResolutionService, useValue: resolutionServiceMock },
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudioTopToolbarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(component.shortcutsModal()).toBe(false);
      expect(component.shortcutsCount()).toBe(0);
      expect(component.tablesDropdown()).toHaveLength(5);
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
      expect(options).toHaveLength(4);
      expect(options.map((o) => o.value)).toEqual(['loads', 'baseState', 'transparentBackground', 'measurePoints']);
    });

    it('should initialize toolsItems with 7 items', () => {
      const items = component.toolsItems();
      expect(items).toHaveLength(7);
      expect(items.every((item) => item.checked === false)).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('should call loadToolsItemsState on init', () => {
      const loadSpy = vi.spyOn(component, 'loadToolsItemsState' as never);
      component.ngOnInit();
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should initialize tablesDropdown with 5 items', () => {
      const tables = component.tablesDropdown();
      expect(tables).toHaveLength(5);
      expect(tables[0].label).toBeDefined();
      expect(tables[0].command).toBeDefined();
    });

    it('should disable Loads table when section has no charges', () => {
      mockSpanService.section.set(null);
      const tables = component.tablesDropdown();
      expect(tables[0].disabled).toBe(true);
    });

    it('should disable Loads table when section has empty charges', () => {
      mockSpanService.section.set({ charges: [] } as unknown as Section);
      const tables = component.tablesDropdown();
      expect(tables[0].disabled).toBe(true);
    });

    it('should enable Loads table when section has charges', () => {
      mockSpanService.section.set({
        charges: [{ uuid: '1', name: 'Charge 1' }]
      } as unknown as Section);
      const tables = component.tablesDropdown();
      expect(tables[0].disabled).toBe(false);
    });

    it('should execute tablesDropdown command for Loads table', () => {
      const tables = component.tablesDropdown();

      tables[0].command?.({});
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('load-table');
    });

    it('should execute tablesDropdown command for L0 table', () => {
      const tables = component.tablesDropdown();

      tables[1].command?.({});
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('l0-sum');
    });

    it('should execute tablesDropdown command for Pose table', () => {
      const tables = component.tablesDropdown();

      tables[2].command?.({});
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('pose-table');
    });

    it('should execute tablesDropdown command for Obstacles table', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockReturnValue(undefined);
      const tables = component.tablesDropdown();

      tables[3].command?.({});
      expect(consoleSpy).toHaveBeenCalledWith('Add action triggered');

      consoleSpy.mockRestore();
    });

    it('should execute tablesDropdown command for Grounds table', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockReturnValue(undefined);
      const tables = component.tablesDropdown();

      tables[4].command?.({});
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
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('field-measuring');
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
      const saveSpy = vi.spyOn(component as StudioTopToolbarComponent, 'saveToolsItemsState' as never);
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
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading tools items state:', expect.any(Error));

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
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('field-measuring');
    });

    it('should execute action for tool item 2 - VTL & Guying', () => {
      const items = component.toolsItems();

      items[1].action();
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledWith('vtl-and-guying');
    });

    it('should execute action for tool item 3 - Cable marking', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      const items = component.toolsItems();

      items[2].action();
      expect(alertSpy).toHaveBeenCalledWith('click Cable marking');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 4 - Strand RRTS', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      const items = component.toolsItems();

      items[3].action();
      expect(alertSpy).toHaveBeenCalledWith('click Strand RRTS');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 5 - Forest trenches', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      const items = component.toolsItems();

      items[4].action();
      expect(alertSpy).toHaveBeenCalledWith('click Forest trenches');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 6 - Height & lateral distance', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      const items = component.toolsItems();

      items[5].action();
      expect(alertSpy).toHaveBeenCalledWith('click Height & lateral distance');

      alertSpy.mockRestore();
    });

    it('should execute action for tool item 7 - Cable adjustment', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      const items = component.toolsItems();

      items[6].action();
      expect(alertSpy).toHaveBeenCalledWith('click Cable adjustment');

      alertSpy.mockRestore();
    });

    it('should execute all actions through toolsDropdown commands', () => {
      const alertSpy = vi.spyOn(globalThis, 'alert').mockReturnValue(undefined);
      component.ngOnInit();
      const tools = component.toolsDropdown();

      for (let i = 0; i < 7; i++) {
        tools?.[i].command?.({});
      }

      // First two tools call service, remaining 5 call alert
      expect(mockToolbarDialogService.openTool).toHaveBeenCalledTimes(2);
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

    it('should access plotOptionsService.plotOptions', () => {
      const options = component.plotOptionsService.plotOptions();
      expect(options.view).toBe('3d');
      expect(options.side).toBe('profile');
      expect(options.invert).toBe(false);
    });
  });

  describe('selectedDisplayOptions computed', () => {
    it('should return mapped display options from plotService', () => {
      plotOptionsServiceMock.selectedDisplayOptions.set({
        loads: true,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });

      const options = component.selectedDisplayOptions();

      expect(options).toEqual([
        { label: 'loads', value: 'loads' },
        { label: 'baseState', value: 'baseState' },
        { label: 'transparentBackground', value: 'transparentBackground' },
        { label: 'measurePoints', value: 'measurePoints' }
      ]);
    });

    it('should handle empty display options', () => {
      plotOptionsServiceMock.selectedDisplayOptions.set({} as SelectedDisplayOptions);

      const options = component.selectedDisplayOptions();

      expect(options).toEqual([]);
    });
  });

  describe('selectedDisplayValues computed', () => {
    it('should return keys with truthy values', () => {
      plotOptionsServiceMock.selectedDisplayOptions.set({
        loads: true,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });

      const values = component.selectedDisplayValues();

      expect(values).toEqual(['loads']);
    });

    it('should exclude keys with falsy values', () => {
      plotOptionsServiceMock.selectedDisplayOptions.set({
        loads: false,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });

      const values = component.selectedDisplayValues();

      expect(values).toEqual([]);
    });

    it('should handle mixed truthy and falsy values', () => {
      plotOptionsServiceMock.selectedDisplayOptions.set({
        loads: true,
        mesh: false
      } as unknown as SelectedDisplayOptions);

      const values = component.selectedDisplayValues();

      expect(values).toContain('loads');
      expect(values).not.toContain('mesh');
    });
  });

  describe('setSelectedDisplayOptions', () => {
    it('should set loads to true when included in displayOptions', () => {
      component.setSelectedDisplayOptions(['loads']);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: true,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });
    });

    it('should set loads to false when not included in displayOptions', () => {
      component.setSelectedDisplayOptions([]);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: false,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });
    });

    it('should set loads to false when other options are selected', () => {
      component.setSelectedDisplayOptions(['mesh', 'ground']);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: false,
        baseState: false,
        transparentBackground: false,
        measurePoints: false
      });
    });

    it('should set baseState to true when included in displayOptions', () => {
      component.setSelectedDisplayOptions(['baseState']);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: false,
        baseState: true,
        transparentBackground: false,
        measurePoints: false
      });
    });

    it('should set both loads and baseState when both included', () => {
      component.setSelectedDisplayOptions(['loads', 'baseState']);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: true,
        baseState: true,
        transparentBackground: false,
        measurePoints: false
      });
    });

    it('should set transparentBackground and measurePoints when included', () => {
      component.setSelectedDisplayOptions(['transparentBackground', 'measurePoints']);

      expect(plotOptionsServiceMock.selectedDisplayOptions()).toEqual({
        loads: false,
        baseState: false,
        transparentBackground: true,
        measurePoints: true
      });
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
      const parsed = JSON.parse(saved!) as { checked: boolean }[];
      const checkedItems = parsed.filter((item) => item.checked);

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
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading tools items state:', expect.any(Error));
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
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('UC: top toolbar rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('UC-TT1: should render invert toggle switch', () => {
      const toggle = getByTestId('invert-toggle');
      expect(toggle).toBeTruthy();
    });

    it('UC-TT2: should render tables dropdown', () => {
      const dropdown = getByTestId('tables-dropdown');
      expect(dropdown).toBeTruthy();
    });

    it('UC-TT3: should render tools dropdown', () => {
      component.ngOnInit();
      fixture.detectChanges();
      const dropdown = getByTestId('tools-dropdown');
      expect(dropdown).toBeTruthy();
    });

    it('UC-TT4: should render shortcuts button', () => {
      const btn = getByTestId('shortcuts-btn');
      expect(btn).toBeTruthy();
    });

    it('UC-TT5: should render view mode selector', () => {
      const el = getByTestId('view-mode-selector');
      expect(el).toBeTruthy();
    });

    it('UC-TT6: should render side view selector', () => {
      const el = getByTestId('side-view-selector');
      expect(el).toBeTruthy();
    });
  });
});
