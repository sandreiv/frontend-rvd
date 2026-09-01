import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { CdpService } from '../../data/cdp.service';
import { CdpContext } from '../../model/cdp-context.model';

import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { Button } from '../../../../../shared/ui/button/button';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';

import { UniversityPeriodItem } from '../../../preload-call/model/preload-call.model';

import { CoordinationTable } from '../../../professor-preload/components/coordination-table/coordination-table';
import { CoordinationService } from '../../../professor-preload/data/coordination.service';

import {
  CoordinationItem,
  CoordinationPreloadCallApi,
} from '../../../professor-preload/model/coordination.model';

@Component({
  selector: 'app-cdp-requests',
  imports: [
    Button,
    Select,
    SectionFrame,
    CoordinationTable,
  ],
  templateUrl: './cdp-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdpRequests implements OnInit {

  private readonly coordinationService = inject(CoordinationService);

  private readonly cdpService = inject(CdpService);

  readonly cdpContextResource = rxResource<CdpContext, unknown>({
    stream: () =>
      this.cdpService.getContext(),
  });

  readonly cdpContext = computed(
    () => this.cdpContextResource.value(),
  );

  readonly universityPeriods = signal<UniversityPeriodItem[]>([]);
  readonly selectedPeriodId = signal('');
  readonly appliedPeriodId = signal<number | null>(null);

  readonly selectedPreloadCallId = signal('');
  readonly appliedPreloadCallId = signal<string | null>(null);

  readonly selectedCoordinationIds = signal<string[]>([]);

  readonly isLoadingPeriods = signal(false);

  readonly activePreloadCallsResource = rxResource({
    params: () => {
      const idPeriodoUniversidad =
        this.resolveSelectedPeriodId();

      if (idPeriodoUniversidad == null) {
        return undefined;
      }

      return {
        idPeriodoUniversidad,
      };
    },

    stream: ({ params }) =>
      this.coordinationService.getActivePreloadCall(
        params.idPeriodoUniversidad,
      ),

    defaultValue: [] as CoordinationPreloadCallApi[],
  });

  readonly cdpRequestsResource = rxResource({
    params: () => {
      const idPeriodoUniversidad =
        this.appliedPeriodId();

      const preloadCallId =
        this.appliedPreloadCallId();

      if (
        idPeriodoUniversidad == null ||
        preloadCallId == null ||
        !preloadCallId
      ) {
        return undefined;
      }

      const idConvocatoria =
        Number(preloadCallId);

      if (Number.isNaN(idConvocatoria)) {
        return undefined;
      }

      return {
        idPeriodoUniversidad,
        idConvocatoria,
      };
    },

    stream: ({ params }) =>
      this.coordinationService.getCdpRequests(
        params.idPeriodoUniversidad,
        params.idConvocatoria,
      ),

    defaultValue: [] as CoordinationItem[],
  });

  readonly periodOptions =
    computed<SelectOption[]>(() =>
      this.universityPeriods().map((item) => ({
        value: String(item.id),
        label: `${item.anio} - ${item.periodo}`,
      })),
    );

  readonly preloadCallOptions =
    computed<SelectOption[]>(() =>
      this.activePreloadCallsResource
        .value()
        .map((item) => ({
          value: String(item.id),
          label: item.nombre,
        })),
    );

  readonly coordinations = computed(
    () => this.cdpRequestsResource.value(),
  );

  readonly isLoadingPreloadCalls = computed(
    () =>
      this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(
    () =>
      this.cdpRequestsResource.isLoading(),
  );

  readonly hasAppliedFilter = computed(
    () =>
      this.appliedPeriodId() != null &&
      this.appliedPreloadCallId() != null,
  );

  readonly tableEmptyMessage = computed(() => {
    if (this.hasAppliedFilter()) {
      return 'No hay solicitudes CPD para mostrar.';
    }

    if (!this.selectedPeriodId()) {
      return 'Seleccione un periodo y pulse Filtrar.';
    }

    return 'Seleccione una convocatoria y pulse Filtrar.';
  });

  ngOnInit(): void {
    void this.loadUniversityPeriods();
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.selectedPreloadCallId.set('');
  }

  onPreloadCallChange(
    preloadCallId: string,
  ): void {
    this.selectedPreloadCallId.set(
      preloadCallId,
    );
  }

  onApplyFilter(): void {
    const periodId =
      this.selectedPeriodId();

    const preloadCallId =
      this.selectedPreloadCallId();

    if (!periodId || !preloadCallId) {
      this.appliedPeriodId.set(null);
      this.appliedPreloadCallId.set(null);
      this.selectedCoordinationIds.set([]);
      return;
    }

    const parsedPeriodId =
      Number(periodId);

    if (Number.isNaN(parsedPeriodId)) {
      return;
    }

    this.appliedPeriodId.set(
      parsedPeriodId,
    );

    this.appliedPreloadCallId.set(
      preloadCallId,
    );

    this.selectedCoordinationIds.set([]);
  }

  onRefreshCoordinations(): void {
    if (
      this.appliedPeriodId() == null ||
      this.appliedPreloadCallId() == null
    ) {
      return;
    }

    this.cdpRequestsResource.reload();
  }

  private resolveSelectedPeriodId():
    number | null {

    const periodId =
      this.selectedPeriodId();

    if (!periodId) {
      return null;
    }

    const parsed = Number(periodId);

    return Number.isNaN(parsed)
      ? null
      : parsed;
  }

  private async loadUniversityPeriods():
    Promise<void> {

    this.isLoadingPeriods.set(true);

    try {
      const periods =
        await firstValueFrom(
          this.coordinationService
            .getUniversityPeriod(),
        );

      this.universityPeriods.set(
        periods ?? [],
      );
    } catch (error) {
      console.error(
        'Error al cargar periodos universitarios:',
        error,
      );

      this.universityPeriods.set([]);
    } finally {
      this.isLoadingPeriods.set(false);
    }
  }
}