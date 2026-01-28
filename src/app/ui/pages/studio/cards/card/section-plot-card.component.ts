import { Component, input, signal, computed } from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { round } from 'lodash';

/**
 * Represents a single data field with label, value, and unit.
 * @internal
 */
interface DataField {
  /** Display label for the field */
  label: string;
  /** Value to display (number or formatted string) */
  value: string | number;
  /** Unit of measurement */
  unit: string;
}

/**
 * Represents a section of related data fields.
 * @internal
 */
interface DataSection {
  /** Optional title for the section */
  title?: string;
  /** Array of data fields in this section */
  fields: DataField[];
  /** Whether to indent the section */
  indent?: boolean;
}

@Component({
  selector: 'app-section-plot-card',
  templateUrl: './section-plot-card.component.html',
  styleUrl: './section-plot-card.component.scss',
  imports: [CardComponent, IconComponent],
  animations: [
    trigger('expandCollapse', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: '0',
          overflow: 'hidden'
        })
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: '1',
          overflow: 'hidden'
        })
      ),
      transition('collapsed <=> expanded', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ])
  ]
})
export class SectionPlotCardComponent {
  isExpanded = signal(false);
  litData = input.required<GetSectionOutput | null>();
  type = input<'span' | 'support'>('support');
  index = input.required<number>();

  cardTitle = computed(() => {
    const idx = this.index();
    return this.type() === 'support' ? `N°${idx + 1}` : `${idx + 1}-${idx + 2}`;
  });

  cardColor = computed(() =>
    this.type() === 'support' ? 'icon-wrapper--support' : 'icon-wrapper--line'
  );

  private getFormatedNumberIndex = (
    value: number[] | undefined
  ): number | string => {
    if (value === undefined) {
      return '-';
    }
    return round(value?.[this.index()], 2);
  };

  // Data structure for support type
  supportData = computed((): DataSection[] => {
    const vtl_under_chain = this.litData()?.vtl_under_chain;
    // const vtl_under_console = this.litData()?.vtl_under_console;
    const r_under_chain = this.litData()?.r_under_chain;
    const lineAngle = this.litData()?.line_angle;

    return [
      {
        title: $localize`VTL (under chain)`,
        fields: [
          {
            label: $localize`V:`,
            value: this.getFormatedNumberIndex(vtl_under_chain?.[0]),
            unit: 'daN'
          },
          {
            label: $localize`T:`,
            value: this.getFormatedNumberIndex(vtl_under_chain?.[1]),
            unit: 'daN'
          },
          {
            label: $localize`L:`,
            value: this.getFormatedNumberIndex(vtl_under_chain?.[2]),
            unit: 'daN'
          },
          {
            label: $localize`Resultant:`,
            value: this.getFormatedNumberIndex(r_under_chain),
            unit: 'daN'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Line angle:`,
            value: this.getFormatedNumberIndex(lineAngle),
            unit: 'gr'
          }
        ]
      }
    ];
  });

  // Expanded data for support type
  supportExpandedData = computed((): DataSection[] => {
    const vtl_under_console = this.litData()?.vtl_under_console;
    const r_under_console = this.litData()?.r_under_console;
    const groundAltitude = this.litData()?.ground_altitude;
    const displacement = this.litData()?.displacement;
    const loadAngle = this.litData()?.load_angle;

    return [
      {
        title: $localize`VTL (under console)`,
        fields: [
          {
            label: $localize`V:`,
            value: this.getFormatedNumberIndex(vtl_under_console?.[0]),
            unit: 'daN'
          },
          {
            label: $localize`T:`,
            value: this.getFormatedNumberIndex(vtl_under_console?.[1]),
            unit: 'daN'
          },
          {
            label: $localize`L:`,
            value: this.getFormatedNumberIndex(vtl_under_console?.[2]),
            unit: 'daN'
          },
          {
            label: $localize`Resultant:`,
            value: this.getFormatedNumberIndex(r_under_console),
            unit: 'daN'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Alt. supp foot:`,
            value: this.getFormatedNumberIndex(groundAltitude),
            unit: 'm'
          }
        ]
      },
      {
        title: $localize`Chain displacement acc.`,
        fields: [
          {
            label: $localize`X:`,
            value: this.getFormatedNumberIndex(displacement?.[0]),
            unit: 'm'
          },
          {
            label: $localize`Y:`,
            value: this.getFormatedNumberIndex(displacement?.[1]),
            unit: 'm'
          },
          {
            label: $localize`Z:`,
            value: this.getFormatedNumberIndex(displacement?.[2]),
            unit: 'm'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Angle balancement:`,
            value: this.getFormatedNumberIndex(loadAngle),
            unit: '°'
          },
          {
            label: $localize`Cable slope acc.:`,
            value: this.getFormatedNumberIndex(loadAngle),
            unit: '°'
          }
        ]
      }
    ];
  });

  // Data structure for span type
  spanData = computed((): DataField[] => {
    const litData = this.litData();
    const spanLength = litData?.span_length;
    const elevation = litData?.elevation;
    const L0 = litData?.L0;
    const parameter = litData?.parameter;
    const tensionSup = litData?.tension_sup;
    return [
      {
        label: $localize`Span length:`,
        value: this.getFormatedNumberIndex(spanLength),
        unit: 'm'
      },
      {
        label: $localize`Elevation:`,
        value: this.getFormatedNumberIndex(elevation),
        unit: 'm'
      },
      {
        label: $localize`Parameter:`,
        value: this.getFormatedNumberIndex(parameter),
        unit: 'm'
      },
      {
        label: $localize`Supp tension (Max):`,
        value: this.getFormatedNumberIndex(tensionSup),
        unit: 'daN'
      },
      {
        label: $localize`Natural length L0:`,
        value: this.getFormatedNumberIndex(L0),
        unit: 'm'
      }
    ];
  });

  // Expanded data for span type
  spanExpandedData = computed((): DataField[] => {
    const litData = this.litData();
    const horizontalDistance = litData?.horizontal_distance;
    const arcLength = litData?.arc_length;
    const th = litData?.T_h;
    const tensionInf = litData?.tension_inf;
    return [
      { label: $localize`Arrow F1:`, value: '-', unit: 'm' },
      { label: $localize`Arrow F2:`, value: '-', unit: 'm' },
      {
        label: $localize`Horizontal dist. acc.:`,
        value: this.getFormatedNumberIndex(horizontalDistance),
        unit: 'm'
      },
      {
        label: $localize`Arc length LA:`,
        value: this.getFormatedNumberIndex(arcLength),
        unit: 'm'
      },
      {
        label: $localize`Th - T0:`,
        value: this.getFormatedNumberIndex(th),
        unit: 'daN'
      },
      {
        label: $localize`Inf tension  acc.:`,
        value: this.getFormatedNumberIndex(tensionInf),
        unit: 'daN'
      }
    ];
  });
}
