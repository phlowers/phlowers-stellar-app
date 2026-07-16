import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepperModule } from 'primeng/stepper';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { ManualSectionComponent } from './manualSection/manualSection.component';

import { Section, Study } from '@shared/domain';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { SectionService } from '@services/section/section.service';
import { areAllRequiredFieldsFilled, hasSupportsBoundsErrors } from './newSectionModal.constants';
import { ImportSectionComponent } from './import-section/import-section.component';
import { NotificationService } from '@services/notification/notification.service';
import { SectionSourceMode } from './newSectionModal.interfaces';
import { cloneDeep } from 'lodash';
import { LocationData } from './manualSection/location/location.interfaces';
import { LOCATION_CONFIG } from './manualSection/location/location.constantes';

/**
 * Modal dialog for creating, editing, or viewing a study section.
 *
 * Wraps the `ManualSectionComponent` and validates required fields
 * and section name uniqueness before allowing submission.
 */
@Component({
  selector: 'app-new-section-modal',
  imports: [
    TabsModule,
    AccordionModule,
    RadioButtonModule,
    FormsModule,
    ButtonModule,
    StepperModule,
    InputTextModule,
    DialogModule,
    DividerModule,
    SelectModule,
    ManualSectionComponent,
    IconComponent,
    ButtonComponent,
    ImportSectionComponent
],
  templateUrl: './newSectionModal.component.html',
  styleUrl: './newSectionModal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewSectionModalComponent {
  /** Whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** Emits the validated section on save. */
  setSection = output<Section>();
  /** Active source mode for section creation. */
  readonly source = signal<SectionSourceMode>('manual');
  /** The section being created or edited. */
  section = input.required<Section>();
  /** The parent study. */
  study = input.required<Study | null>();
  sectionChange = output<Section>();
  outputSection = output<Section>();
  /** Current dialog mode: create, edit, or view. */
  mode = input.required<'create' | 'edit' | 'view'>();
  setMode = output<'create' | 'edit' | 'view'>();

  areAllRequiredFieldsFilled = signal<boolean>(false);
  isNameUnique = signal<boolean>(false);
  supportsBoundsErrors = signal<boolean>(false);
  isLocationValid = signal<boolean>(true);

  readonly canValidate = computed(
    () =>
      this.areAllRequiredFieldsFilled() && this.isNameUnique() && !this.supportsBoundsErrors() && this.isLocationValid()
  );
  locationData = signal<LocationData | null>(null);
  /** Incremented to trigger a reset of the import outcomes in the ImportSectionComponent. */
  readonly importResetToken = signal<number>(0);

  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);

  headerTitle = computed(() => {
    if (this.mode() === 'view') {
      return $localize`View a study section`;
    } else if (this.mode() === 'edit') {
      return $localize`Modify a study section`;
    }
    return $localize`Create a study section`;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.checkFields();
        this.initializeLocationData();
      } else {
        this.locationData.set(null);
      }
    });
  }

  /**
   * Pre-seeds `locationData` from the current section, falling back to
   * `LOCATION_CONFIG` defaults whenever a coordinate is null. This guarantees
   * the defaults are persisted to IndexedDB even when the user validates
   * without ever opening the lazily-mounted "supports" tab (where
   * `<app-location>` lives). The child component overrides this as soon as
   * the user interacts with the inputs.
   */
  private initializeLocationData(): void {
    const section = this.section();
    this.locationData.set({
      latitude: section.start_latitude ?? LOCATION_CONFIG.latitude.default,
      longitude: section.start_longitude ?? LOCATION_CONFIG.longitude.default,
      azimuth: section.start_azimuth ?? LOCATION_CONFIG.azimuth.default,
      isValid: true
    });
    this.isLocationValid.set(true);
  }

  checkFields = () => {
    this.areAllRequiredFieldsFilled.set(areAllRequiredFieldsFilled(this.section()));
    this.supportsBoundsErrors.set(hasSupportsBoundsErrors(this.section()));
    const isNameUnique = !this.study()?.sections.find(
      (s) => s.name === this.section().name && s.uuid !== this.section().uuid
    );
    this.isNameUnique.set(isNameUnique);
  };

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.isOpenChange.emit(false);
    }
  }

  onSectionChange(event: Section) {
    this.sectionChange.emit(event);
    this.checkFields();
  }

  onLocationChange(location: LocationData) {
    this.locationData.set(location);
    this.isLocationValid.set(location.isValid);
  }

  onValidate() {
    const section = this.section();
    const location = this.locationData();
    const updatedSection = {
      ...section,
      start_latitude: location?.latitude ?? section.start_latitude,
      start_longitude: location?.longitude ?? section.start_longitude,
      start_azimuth: location?.azimuth ?? section.start_azimuth
    };
    this.outputSection.emit(updatedSection);
    this.isOpenChange.emit(false);
  }

  async onDuplicateSection() {
    const newSection = await this.sectionService.duplicateSection(this.study()!, this.section());
    this.setSection.emit(newSection);
  }

  onEditSection() {
    this.setMode.emit('edit');
    this.checkFields();
  }

  onDeleteSection() {
    this.sectionService.deleteSection(this.study()!, this.section());
    this.isOpenChange.emit(false);
  }

  /**
   * Handles the `editRequested` event emitted by `ImportSectionComponent`.
   * Resets the import list, then reopens the modal in edit mode for the imported section.
   */
  onImportedSectionEditRequested(sectionUuid: string): void {
    this.importResetToken.update((t) => t + 1);

    const section = this.study()?.sections.find((s) => s.uuid === sectionUuid);
    if (!section) {
      this.notificationService.error($localize`The imported section could not be found. Please try again.`);
      return;
    }

    this.source.set('manual');
    this.setSection.emit(cloneDeep(section));
    this.setMode.emit('edit');
    this.isOpenChange.emit(false);
    Promise.resolve().then(() => this.isOpenChange.emit(true));
  }
}
