import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbTitle } from '../../../../../core/service/breadcrumb-title';
import { Button } from '../../../../../shared/ui/button/button';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { UniversityPeriodItem } from '../../../preload-call/model/preload-call.model';
import { ProfessorSummary } from '../../../professor-preload/components/professor-summary/professor-summary';
import { VerifyProfessorsTable } from '../../components/verify-professors-table/verify-professors-table';
import { VerifyProfessorsService } from '../../data/verify-professors.service';
import {
  AcademicCoordinationItem,
  VerifyPreloadCallItem,
  VerifyProfessorItem,
  VerifyProfessorsFilter,
  coordinationLabel,
  toContractModality,
  toModalityProfessor,
  toSummaryCoordination,
} from '../../model/verify-professors.model';

@Component({
  selector: 'app-verify-professors',
  imports: [
    Button,
    Select,
    SectionFrame,
    VerifyProfessorsTable,
    ProfessorSummary,
  ],
  templateUrl: './verify-professors.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyProfessors implements OnInit, OnDestroy {
  private readonly verifyProfessorsService = inject(VerifyProfessorsService);
  private readonly breadcrumbTitle = inject(BreadcrumbTitle);

  readonly universityPeriods = signal<UniversityPeriodItem[]>([]);
  readonly selectedPeriodId = signal('');
  readonly selectedPreloadCallId = signal('');
  readonly selectedCoordinationId = signal('');
  readonly appliedFilter = signal<VerifyProfessorsFilter | null>(null);
  readonly selectedProfessor = signal<VerifyProfessorItem | null>(null);
  readonly showSummary = signal(false);
  readonly isLoadingPeriods = signal(false);

  readonly activePreloadCallsResource = rxResource({
    params: () => {
      const idPeriodoUniversidad = this.parseId(this.selectedPeriodId());
      if (idPeriodoUniversidad == null) {
        return undefined;
      }
      return { idPeriodoUniversidad };
    },
    stream: ({ params }) =>
      this.verifyProfessorsService.listActivePreloadCalls(
        params.idPeriodoUniversidad,
      ),
    defaultValue: [] as VerifyPreloadCallItem[],
  });

  readonly coordinationsResource = rxResource({
    params: () => {
      const idPeriodoUniversidad = this.parseId(this.selectedPeriodId());
      const idConvocatoria = this.parseId(this.selectedPreloadCallId());
      if (idPeriodoUniversidad == null || idConvocatoria == null) {
        return undefined;
      }
      return { idPeriodoUniversidad, idConvocatoria };
    },
    stream: ({ params }) =>
      this.verifyProfessorsService.listAcademicCoordinations(
        params.idPeriodoUniversidad,
        params.idConvocatoria,
      ),
    defaultValue: [] as AcademicCoordinationItem[],
  });

  readonly professorsResource = rxResource({
    params: () => this.appliedFilter() ?? undefined,
    stream: ({ params }) =>
      this.verifyProfessorsService.listProfessors(params),
    defaultValue: [] as VerifyProfessorItem[],
  });

  readonly periodOptions = computed<SelectOption[]>(() =>
    this.universityPeriods().map((item) => ({
      value: String(item.id),
      label: `${item.anio} - ${item.periodo}`,
    })),
  );

  readonly preloadCallOptions = computed<SelectOption[]>(() =>
    this.activePreloadCallsResource.value().map((item) => ({
      value: String(item.id),
      label: item.nombre,
    })),
  );

  readonly coordinations = computed(
    () => this.coordinationsResource.value(),
  );

  readonly coordinationOptions = computed<SelectOption[]>(() =>
    this.coordinations().map((item) => ({
      value: String(item.id),
      label: coordinationLabel(item),
    })),
  );

  readonly professors = computed(() => this.professorsResource.value());

  readonly isLoadingPreloadCalls = computed(() =>
    this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(() =>
    this.coordinationsResource.isLoading(),
  );

  readonly isLoadingProfessors = computed(() =>
    this.professorsResource.isLoading(),
  );

  readonly hasAppliedFilter = computed(() => this.appliedFilter() != null);

  readonly isFilterDisabled = computed(
    () =>
      this.isLoadingPeriods() ||
      this.isLoadingCoordinations() ||
      this.isLoadingPreloadCalls() ||
      this.isLoadingProfessors() ||
      !this.selectedPeriodId() ||
      !this.selectedPreloadCallId() ||
      !this.selectedCoordinationId(),
  );

  readonly tableEmptyMessage = computed(() => {
    if (this.hasAppliedFilter()) {
      return 'No hay docentes para verificar.';
    }

    return 'Seleccione periodo, convocatoria y coordinación y pulse Filtrar.';
  });

  readonly summaryProfessor = computed(() => {
    const item = this.selectedProfessor();
    return item ? toModalityProfessor(item) : null;
  });

  readonly summaryCoordination = computed(() => {
    const idCoordinacion = this.appliedFilter()?.idCoordinacion;
    if (idCoordinacion == null) {
      return null;
    }

    const coordination = this.coordinations().find(
      (item) => item.id === idCoordinacion,
    );

    return coordination ? toSummaryCoordination(coordination) : null;
  });

  readonly summaryModality = computed(() => {
    const item = this.selectedProfessor();
    return item ? toContractModality(item) : null;
  });

  readonly loadSummary = (idCargaDocente: number) =>
    this.verifyProfessorsService.getProfessorLoadSummary(idCargaDocente);

  async ngOnInit(): Promise<void> {
    this.breadcrumbTitle.setPageTitle('Verificar docentes');
    await this.loadUniversityPeriods();
  }

  ngOnDestroy(): void {
    this.breadcrumbTitle.clearPageTitle();
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.selectedPreloadCallId.set('');
    this.selectedCoordinationId.set('');
  }

  onPreloadCallChange(preloadCallId: string): void {
    this.selectedPreloadCallId.set(preloadCallId);
    this.selectedCoordinationId.set('');
  }

  onCoordinationChange(coordinationId: string): void {
    this.selectedCoordinationId.set(coordinationId);
  }

  onApplyFilter(): void {
    const idPeriodoUniversidad = this.parseId(this.selectedPeriodId());
    const idConvocatoria = this.parseId(this.selectedPreloadCallId());
    const idCoordinacion = this.parseId(this.selectedCoordinationId());

    if (
      idPeriodoUniversidad == null ||
      idConvocatoria == null ||
      idCoordinacion == null
    ) {
      this.appliedFilter.set(null);
      return;
    }

    this.appliedFilter.set({
      idPeriodoUniversidad,
      idConvocatoria,
      idCoordinacion,
    });
  }

  onRefreshProfessors(): void {
    if (this.appliedFilter() == null) {
      return;
    }

    this.professorsResource.reload();
  }

  onViewSummary(professor: VerifyProfessorItem): void {
    if (professor.idCargaDocente == null) {
      return;
    }

    this.selectedProfessor.set(professor);
    this.showSummary.set(true);
  }

  onCloseSummary(): void {
    this.showSummary.set(false);
    this.selectedProfessor.set(null);
  }

  private parseId(value: string): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private async loadUniversityPeriods(): Promise<void> {
    this.isLoadingPeriods.set(true);

    try {
      const periods = await firstValueFrom(
        this.verifyProfessorsService.listUniversityPeriod(),
      );
      this.universityPeriods.set(periods ?? []);
    } catch (error) {
      console.error('Error al cargar periodos universitarios:', error);
      this.universityPeriods.set([]);
    } finally {
      this.isLoadingPeriods.set(false);
    }
  }
}
