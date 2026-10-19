import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { switchMap } from 'rxjs';
import {
  MANUAL_PDF_DOWNLOAD_FILE_NAME,
  ONLINE_MANUAL_URL,
  UNKNOWN_PDF_INFO
} from '@features/instruction-manual/infrastructure/services/instruction-manual.constantes';
import { InstructionManualService } from '@features/instruction-manual/infrastructure/services/instruction-manual.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { CardComponent } from '@src/app/shared/components/atoms/card/card.component';
import { BYTES_PER_MEGABYTE } from './instruction-manual.component.constantes';

/** Help page offering the user manual as a downloadable PDF and as an online site. */
@Component({
  selector: 'app-instruction-manual',
  imports: [DatePipe, TranslocoModule, ButtonComponent, IconComponent, CardComponent],
  templateUrl: './instruction-manual.component.html',
  styleUrl: './instruction-manual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstructionManualComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly instructionManualService = inject(InstructionManualService);

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang()
  });

  readonly pdfFileName = MANUAL_PDF_DOWNLOAD_FILE_NAME;
  readonly onlineManualUrl = ONLINE_MANUAL_URL;
  readonly pdfUrl = computed(() => this.instructionManualService.getPdfUrl(this.activeLang()));

  readonly pdfInfo = toSignal(
    toObservable(this.pdfUrl).pipe(switchMap((url) => this.instructionManualService.getPdfInfo(url))),
    { initialValue: UNKNOWN_PDF_INFO }
  );

  /** PDF size rounded to the megabyte, in the number format of the active language. */
  readonly pdfSize = computed(() => {
    const sizeBytes = this.pdfInfo().sizeBytes;

    if (sizeBytes === null) {
      return null;
    }

    return new Intl.NumberFormat(this.activeLang(), {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 1
    }).format(sizeBytes / BYTES_PER_MEGABYTE);
  });
}
