import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { CoordinationItem } from '../../model/coordination.model';
import { CoordinationService } from '../../data/coordination.service';
import { CoordinationPreloadCallModal } from '../coordination-preload-call-modal/coordination-preload-call-modal';
import { ContractModalityDetail } from '../contract-modality-detail/contract-modality-detail';
import { TotalCoordination } from '../total-coordination/total-coordination';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';

@Component({
  selector: 'app-coordination-detail',
  imports: [
    Button,
    Icon,
    CoordinationPreloadCallModal,
    ContractModalityDetail,
    TotalCoordination,
    Tooltip,
  ],
  templateUrl: './coordination-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationDetail {
  private readonly coordinationService = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

  coordination = input.required<CoordinationItem>();
  coordinationsCatalog = input<CoordinationItem[]>([]);
  idPeriodoUniversidad = input<number | null>(null);

  back = output<void>();
  coordinationUpdated = output<CoordinationItem>();

  readonly resolvedPeriodId = computed(
    () =>
      this.idPeriodoUniversidad() ??
      this.coordination().idPeriodoUniversidad,
  );

  readonly isAssignModalOpen = signal(false);
  readonly hasLoadedProfessors = signal(false);
  readonly totalRefreshKey = signal(0);
  readonly isDownloadingReport = signal(false);

  /**
 * Determina si la coordinación seleccionada puede ejecutar acciones de edición.
 * Este valor viene calculado desde backend según convocatoria, restricción y fechas.
 */

  readonly canEditPreassignment = computed(
    () => this.coordination().canEditPreassignment === true,
  );

  /**
 * Mensaje que explica por qué la coordinación se encuentra en modo solo lectura.
 * Se utiliza en tooltips y botones deshabilitados.
 */

  readonly editBlockReason = computed(
    () =>
      this.coordination().editBlockReason ??
      'La coordinación no está habilitada para edición en esta convocatoria.',
  );

  readonly canShowPreloadCallButton = computed(() => !this.hasLoadedProfessors());

  readonly canChangePreloadCall = computed(
    () => this.canShowPreloadCallButton() && this.canEditPreassignment(),
  );

  readonly canDownloadReport = computed(
    () => this.coordination().idCarga != null && !this.isDownloadingReport(),
  );

  constructor() {
    effect(() => {
      this.coordination().id;
      this.hasLoadedProfessors.set(false);
      this.totalRefreshKey.set(0);
    });
  }

  openAssignModal(): void {
    if (!this.canChangePreloadCall()) {
      return;
    }

    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
  }

  onPreloadCallAssigned(updated: CoordinationItem): void {
    this.coordinationUpdated.emit(updated);
    this.closeAssignModal();
  }

  onHasProfessorsChange(hasProfessors: boolean): void {
    this.hasLoadedProfessors.set(hasProfessors);
  }

  onPreloadChanged(): void {
    this.totalRefreshKey.update((value) => value + 1);
  }

  downloadPreloadReport(): void {
    const idCarga = this.coordination().idCarga;
    if (idCarga == null || this.isDownloadingReport()) {
      return;
    }

    this.isDownloadingReport.set(true);
    this.coordinationService
      .downloadPreloadReport(idCarga)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDownloadingReport.set(false)),
      )
      .subscribe(({ blob, fileName }) => {
        this.triggerBrowserDownload(blob, fileName);
      });
  }

  private triggerBrowserDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

}
