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
import { PermissionService } from '../../../../../core/service/permission-service';
import { AuthService } from '../../../../../core/service/auth-service';
import { Label } from "../../../../../shared/components/form/label/label";
import { InputField } from "../../../../../shared/components/form/input/input-field";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { DeclinePreloadDeanRequest } from '../../model/preload-carga.model';

@Component({
  selector: 'app-coordination-detail',
  imports: [
    Button,
    Icon,
    CoordinationPreloadCallModal,
    ContractModalityDetail,
    TotalCoordination,
    Tooltip,
    Label,
    InputField,
    FormsModule,
    ReactiveFormsModule
],
  templateUrl: './coordination-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class CoordinationDetail {
  private readonly authService = inject(AuthService);
  private readonly coordinationService = inject(CoordinationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly permissions = inject(PermissionService);

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
  readonly isEndorsingPreload = signal(false);
  readonly isDecliningPreload = signal(false);
  readonly allProfessorsPreloadApproved = signal(false);

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

  readonly canShowEndorseButton = computed(() => (this.coordination().estadoCarga === 'REGISTRADO') && (!this.isEndorsingPreload()));
  readonly canShowDeanApprovalSection = computed(() => this.coordination().estadoCarga === 'INSCRITO' && this.permissions.canDeclineLoadDean())

  readonly form = this.fb.group({
    observacion: ['', Validators.required]
  });

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

  onAllProfessorsAproved(approved: boolean): void {
    this.allProfessorsPreloadApproved.set(approved);
  }

  onPreloadChanged(): void {
    this.totalRefreshKey.update((value) => value + 1);
  }

  downloadPreloadReport(): void {
    if (!this.permissions.canDownloadExcel()) {
      return;
    }

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

  endorsePreloadDean() {
    if (!this.permissions.canEndorseLoadDean()) return;

    const idCarga = this.coordination().idCarga;
    if ((idCarga == null) || this.isEndorsingPreload()) return;

    this.isEndorsingPreload.set(true);
    this.coordinationService
      .endorsePreloadDean(idCarga)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isEndorsingPreload.set(false)),
      )
    .subscribe({
      next: () => {
        // Redirigir al listado
        this.back.emit();
      }
    });
  }

  declinePreloadDean() {
    if (!this.permissions.canDeclineLoadDean()) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.idPersona === null) return;

    const idCarga = this.coordination().idCarga;
    if ((idCarga == null) || this.isDecliningPreload()) return;

    const observacion = this.form.controls.observacion;
    if (!observacion.value?.trim()) {
      observacion.markAsTouched();
      return;
    }

    const body: DeclinePreloadDeanRequest = {
      idPersonaGeneral: Number(currentUser.idPersona),
      observacion: observacion.value.trim()
    }

    this.isDecliningPreload.set(true);
    this.coordinationService
      .declinePreloadDean(idCarga, body)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDecliningPreload.set(false)),
      )
    .subscribe({
      next: () => {
        // Redirigir al listado
        this.back.emit();
      }
    });
  }

  approvePreloadDean() {

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


