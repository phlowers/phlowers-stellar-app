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
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { round } from 'lodash';

interface DataField {
  label: string;
  value: string | number;
}

interface DataSection {
  title?: string;
  fields: DataField[];
  indent?: boolean;
}

const formatNumber = (value: number | undefined): number | string => {
  if (value === undefined) {
    return '-';
  }
  return round(value, 2);
};

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
            label: $localize`V :`,
            value: formatNumber(vtl_under_chain?.[0][this.index()])
          },
          {
            label: $localize`T :`,
            value: formatNumber(vtl_under_chain?.[1][this.index()])
          },
          {
            label: $localize`L :`,
            value: formatNumber(vtl_under_chain?.[2][this.index()])
          },
          {
            label: $localize`Resultant :`,
            value: formatNumber(r_under_chain?.[this.index()])
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Line angle :`,
            value: formatNumber(lineAngle?.[this.index()])
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
            label: $localize`V :`,
            value: formatNumber(vtl_under_console?.[0][this.index()])
          },
          {
            label: $localize`H :`,
            value: formatNumber(vtl_under_console?.[1][this.index()])
          },
          {
            label: $localize`L :`,
            value: formatNumber(vtl_under_console?.[2][this.index()])
          },
          {
            label: $localize`Resultant :`,
            value: formatNumber(r_under_console?.[this.index()])
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Alt. supp foot :`,
            value: formatNumber(groundAltitude?.[this.index()])
          }
        ]
      },
      {
        title: $localize`Chain displacement acc.`,
        fields: [
          {
            label: $localize`X :`,
            value: formatNumber(displacement?.[this.index()]?.[0])
          },
          {
            label: $localize`Y :`,
            value: formatNumber(displacement?.[this.index()]?.[1])
          },
          {
            label: $localize`Z :`,
            value: formatNumber(displacement?.[this.index()]?.[2])
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: $localize`Angle balencement :`,
            value: formatNumber(loadAngle?.[this.index()])
          },
          {
            label: $localize`Cable slope acc. :`,
            value: formatNumber(loadAngle?.[this.index()])
          }
        ]
      }
    ];
  });

  // Data structure for span type
  spanData = computed((): DataField[] => {
    const spanLength = this.litData()?.span_length;
    const elevation = this.litData()?.elevation;
    const L0 = this.litData()?.L0;

    return [
      {
        label: $localize`Span length :`,
        value: formatNumber(spanLength?.[this.index()])
      },
      {
        label: $localize`Elevation (m) :`,
        value: formatNumber(elevation?.[this.index()])
      },
      { label: $localize`Supp tension (Max) :`, value: '-' },
      {
        label: $localize`Natural length LO :`,
        value: formatNumber(L0?.[this.index()])
      }
    ];
  });

  // Expanded data for span type
  spanExpandedData = computed((): DataField[] => [
    { label: $localize`Arrow F1 :`, value: '-' },
    { label: $localize`Arrow F2 :`, value: '-' },
    { label: $localize`Horizontal dist. acc. :`, value: '-' },
    { label: $localize`Arc length LA :`, value: '-' },
    { label: $localize`Th - T0 :`, value: '-' },
    { label: $localize`Inf tension  acc. :`, value: '-' }
  ]);
}
