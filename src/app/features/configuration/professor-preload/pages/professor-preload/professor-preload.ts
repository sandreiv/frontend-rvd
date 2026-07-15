import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { Button } from '../../../../../shared/ui/button/button';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { CoordinationDetail } from '../../components/coordination-detail/coordination-detail';
import { CoordinationTable } from '../../components/coordination-table/coordination-table';
import { CoordinationService } from '../../data/coordination.service';
import {
  CoordinationItem,
  CoordinationPreloadCallApi,
  UNASSIGNED_PRELOAD_CALL_FILTER,
} from '../../model/coordination.model';

@Component({
  selector: 'app-professor-preload',
  imports: [
    Button,
    Select,
    SectionFrame,
    CoordinationTable,
    CoordinationDetail,
  ],
  templateUrl: './professor-preload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorPreload implements OnInit {
  private readonly coordinationService = inject(CoordinationService);

  readonly activePreloadCallsResource = rxResource({
    stream: () => this.coordinationService.getActivePreloadCall(),
    defaultValue: [] as CoordinationPreloadCallApi[],
  });

  readonly selectedPreloadCallId = signal(UNASSIGNED_PRELOAD_CALL_FILTER);
  readonly appliedFilterPreloadCallId = signal<string | null>(null);
  readonly selectedCoordinationIds = signal<string[]>([]);
  readonly selectedCoordination = signal<CoordinationItem | null>(null);
  readonly showCoordinationDetail = signal(false);
  readonly isStartingPreassignment = signal(false);

  readonly coordinationsResource = rxResource({
    stream: () => {
      const filterId = this.appliedFilterPreloadCallId();
      if (filterId === null) {
        return of([] as CoordinationItem[]);
      }

      const idConvocatoria =
        filterId === UNASSIGNED_PRELOAD_CALL_FILTER
          ? undefined
          : Number(filterId);

      return this.coordinationService.getCoordinations(idConvocatoria);
    },
    defaultValue: [] as CoordinationItem[],
  });

  readonly preloadCallOptions = computed<SelectOption[]>(() => [
    {
      value: UNASSIGNED_PRELOAD_CALL_FILTER,
      label: 'Sin convocatoria asignada',
    },
    ...this.activePreloadCallsResource.value().map((item) => ({
      value: String(item.id),
      label: item.nombre,
    })),
  ]);

  readonly coordinations = computed(() => this.coordinationsResource.value());

  readonly isLoadingPreloadCalls = computed(() =>
    this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(() =>
    this.coordinationsResource.isLoading(),
  );

  readonly hasAppliedFilter = computed(
    () => this.appliedFilterPreloadCallId() !== null,
  );

  ngOnInit(): void {
    this.onApplyCoordinationFilter();
  }

  onPreloadCallChange(preloadCallId: string): void {
    this.selectedPreloadCallId.set(preloadCallId);
  }

  onApplyCoordinationFilter(): void {
    this.appliedFilterPreloadCallId.set(this.selectedPreloadCallId());
    this.selectedCoordinationIds.set([]);
    this.coordinationsResource.reload();
  }

  onRefreshCoordinations(): void {
    this.coordinationsResource.reload();
  }

  async onStartPreassignment(coordination: CoordinationItem): Promise<void> {
    const isUnassignedFilter =
      this.appliedFilterPreloadCallId() === UNASSIGNED_PRELOAD_CALL_FILTER;

    const shouldAutoAssignPreloadCall =
      isUnassignedFilter && coordination.idConvocatoria == null;

    if (!shouldAutoAssignPreloadCall) {
      this.openCoordinationDetail(coordination);
      return;
    }

    const defaultPreloadCall = this.activePreloadCallsResource.value()[0];

    if (!defaultPreloadCall?.id) {
      this.openCoordinationDetail(coordination);
      return;
    }

    this.isStartingPreassignment.set(true);

    try {
      await firstValueFrom(
        this.coordinationService.savePreload({
          idCoordinacion: coordination.id,
          idConvocatoria: defaultPreloadCall.id,
        }),
      );

      const updatedCoordinations = await firstValueFrom(
        this.coordinationService.getCoordinations(defaultPreloadCall.id),
      );

      const updatedCoordination =
        updatedCoordinations.find((item) => item.id === coordination.id) ??
        this.buildCoordinationWithDefaultPreloadCall(
          coordination,
          defaultPreloadCall,
        );

      this.selectedCoordination.set(updatedCoordination);
      this.showCoordinationDetail.set(true);

      this.coordinationsResource.reload();
    } catch (error) {
      console.error(error);
      this.openCoordinationDetail(coordination);
    } finally {
      this.isStartingPreassignment.set(false);
    }
  }

  private openCoordinationDetail(coordination: CoordinationItem): void {
    this.selectedCoordination.set(coordination);
    this.showCoordinationDetail.set(true);
  }

  private buildCoordinationWithDefaultPreloadCall(
    coordination: CoordinationItem,
    preloadCall: CoordinationPreloadCallApi,
  ): CoordinationItem {
    const periodoUniversidad = preloadCall.periodoUniversidad;
    const nivelEducativo = preloadCall.nivelEducativo;

    return {
      ...coordination,
      idConvocatoria: preloadCall.id,
      convocatoriaNombre:
        preloadCall.nombre?.trim() || preloadCall.descripcion?.trim() || '',
      nivelEducativo:
        nivelEducativo?.descripcion?.trim() ||
        nivelEducativo?.nombre?.trim() ||
        coordination.nivelEducativo,
      periodoUniversidad: periodoUniversidad
        ? `${periodoUniversidad.anio}-${periodoUniversidad.periodo}`
        : coordination.periodoUniversidad,
      idPeriodoUniversidad: periodoUniversidad?.id ?? coordination.idPeriodoUniversidad,
      anioUniversidad: periodoUniversidad?.anio ?? coordination.anioUniversidad,
      idNivelEducativo: nivelEducativo?.id ?? coordination.idNivelEducativo,
      modalidadesContratacion:
        preloadCall.modalidadesContratacion ?? coordination.modalidadesContratacion,
    };
  }

  onBackToCoordinationList(): void {
    this.syncListFilterWithSelectedCoordination();
    this.showCoordinationDetail.set(false);
  }

  onCoordinationUpdated(updated: CoordinationItem): void {
    this.selectedCoordination.set(updated);
  }

  private syncListFilterWithSelectedCoordination(): void {
    const coordination = this.selectedCoordination();

    if (!coordination) {
      return;
    }

    const filterId =
      coordination.idConvocatoria != null
        ? String(coordination.idConvocatoria)
        : UNASSIGNED_PRELOAD_CALL_FILTER;

    this.selectedPreloadCallId.set(filterId);
    this.appliedFilterPreloadCallId.set(filterId);
    this.selectedCoordinationIds.set([String(coordination.id)]);

    this.coordinationsResource.reload();
  }
  
}
