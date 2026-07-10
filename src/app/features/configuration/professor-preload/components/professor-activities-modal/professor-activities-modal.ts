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
  untracked,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { NotificationService } from '../../../../../core/service/notification-service';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { DirectActivityCard } from './components/direct-activity-card/direct-activity-card';
import { CriteriaActivityCard } from './components/criteria-activity-card/criteria-activity-card';
import { ProjectActivityCard } from './components/project-activity-card/project-activity-card';
import { CoordinationService } from '../../data/coordination.service';
import {
  CoordinationContractModality,
  CoordinationItem,
  ModalityProfessor,
  WorkDate,
} from '../../model/coordination.model';
import {
  ActivityCategoryCodigo,
  buildVisibleActivityItems,
  createInitialAddFormOpen,
  createInitialExpandedCategories,
  resolveVisibleActivityCodigos,
} from '../../model/professor-activities.config';
import {
  DirectLearningActivity,
  SimpleActivity,
} from '../../model/professor-activities-modal.models';
import { TipoActividad } from '../../model/professor-activities.model';
import {
  buildSaveActivityDistributionRequest,
  buildUpdateDetailProfessorPreloadRequests,
  hasSaveableActivities,
} from '../../model/professor-activities-save.mapper';
import { mapDetailProfessorPreloadToModalState } from '../../model/professor-activities-load.mapper';
import {
  DetailProfessorPreloadApi,
  DetailProfessorPreloadItemApi,
} from '../../model/detail-professor-preload.model';
import {
  detectProjectActivityCodigos,
  buildProjectHierarchyRows,
} from '../../model/professor-projects.mapper';
import {
  ProfessorProjectRow,
  ProyectoDocenteDto,
} from '../../model/professor-projects.model';
import { parseMaxWeeklyHours } from '../../model/professor-form.config';

const NN_LABEL = 'NN';

type CriteriaActivityCodigo = Extract<ActivityCategoryCodigo, 'FAI' | 'AC'>;
type ProjectActivityCategoryCodigo = Extract<
  ActivityCategoryCodigo,
  'CTEI' | 'ISU'
>;

@Component({
  selector: 'app-professor-activities-modal',
  imports: [
    Modal,
    Button,
    Icon,
    CollapsibleSection,
    DirectActivityCard,
    CriteriaActivityCard,
    ProjectActivityCard,
  ],
  templateUrl: './professor-activities-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorActivitiesModal {
  private readonly coordinationService = inject(CoordinationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  isOpen = input(false);
  professor = input<ModalityProfessor | null>(null);
  contractModality = input<CoordinationContractModality | null>(null);
  coordination = input<CoordinationItem | null>(null);

  close = output<void>();
  saved = output<void>();

  readonly isSaving = signal(false);
  readonly hasSavedDetail = signal(false);

  readonly actividadesFAD = signal<DirectLearningActivity[]>([]);
  readonly actividadesFAI = signal<SimpleActivity[]>([]);
  readonly actividadesAC = signal<SimpleActivity[]>([]);
  readonly associatedProjectsCTEI = signal<ProfessorProjectRow[]>([]);
  readonly associatedProjectsISU = signal<ProfessorProjectRow[]>([]);
  private readonly loadedDetailsById = signal<
    Map<number, DetailProfessorPreloadItemApi>
  >(new Map());

  private readonly criteriaActivitiesByCodigo: Record<
    CriteriaActivityCodigo,
    WritableSignal<SimpleActivity[]>
  > = {
    FAI: this.actividadesFAI,
    AC: this.actividadesAC,
  };

  private readonly associatedProjectsByCodigo: Record<ProjectActivityCategoryCodigo, WritableSignal<ProfessorProjectRow[]>> = {
    CTEI: this.associatedProjectsCTEI,
    ISU: this.associatedProjectsISU,
  };

  readonly activityTypesResource = rxResource({
    params: () => (this.isOpen() ? true : undefined),
    stream: () => this.coordinationService.listActivityTypes(),
    defaultValue: [] as TipoActividad[],
  });

  readonly professorProjectsResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }
      const idPersonaGeneral = this.professor()?.idPersonaGeneral;
      if (idPersonaGeneral == null) {
        return undefined;
      }
      return { idPersonaGeneral };
    },
    stream: ({ params }) =>
      this.coordinationService.listProjectsProfessor(
        params.idPersonaGeneral,
      ),
    defaultValue: [] as ProyectoDocenteDto[],
  });

  readonly workDatesResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }
      const idCoordinacion = this.coordination()?.id;
      const idModalidadContratacion = this.contractModality()?.id;
      if (idCoordinacion == null || idModalidadContratacion == null) {
        return undefined;
      }
      return { idCoordinacion, idModalidadContratacion };
    },
    stream: ({ params }) =>
      this.coordinationService.getWorkDates(
        params.idCoordinacion,
        params.idModalidadContratacion,
      ),
    defaultValue: [] as WorkDate[],
  });

  readonly detailResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }
      const idCargaDocente = this.professor()?.idCargaDocente;
      if (idCargaDocente == null) {
        return undefined;
      }
      return { idCargaDocente };
    },
    stream: ({ params }) =>
      this.coordinationService
        .listDetailProfessorPreload(params.idCargaDocente)
        .pipe(catchError(() => of([] as DetailProfessorPreloadApi))),
    defaultValue: [] as DetailProfessorPreloadApi,
  });

  readonly isLoadingDetail = computed(
    () => this.detailResource.isLoading(),
  );

  readonly expandedCategories = signal(
    createInitialExpandedCategories(),
  );

  readonly addFormOpen = signal(createInitialAddFormOpen());

  readonly projectActivityCodigos = computed(() =>
    detectProjectActivityCodigos(
      this.professorProjectsResource.value(),
      this.professor()?.idPersonaGeneral,
    ),
  );

  readonly projectHierarchyRowsByCodigo = computed(() => {
    const proyectos = this.professorProjectsResource.value();
    const idPersonaGeneral = this.professor()?.idPersonaGeneral;
    return {
      CTEI: buildProjectHierarchyRows(
        proyectos,
        'CTEI',
        idPersonaGeneral,
      ),
      ISU: buildProjectHierarchyRows(
        proyectos,
        'ISU',
        idPersonaGeneral,
      ),
    };
  });

  readonly visibleActivityItems = computed(() =>
    buildVisibleActivityItems(
      resolveVisibleActivityCodigos(
        this.contractModality()?.nombre,
        this.projectActivityCodigos(),
        this.contractModality()?.esPlanta === true,
      ),
      this.activityTypesResource.value(),
    ),
  );

  readonly professorDisplayName = computed(() =>
    this.resolveProfessorName(this.professor()),
  );

  readonly modalTitle = computed(() => {
    if (this.isLoadingDetail()) {
      if (this.professor()?.tieneDetalleActividades === true) {
        return 'Gestionar actividades del docente';
      }
    }

    return this.hasSavedDetail()
      ? 'Gestionar actividades del docente'
      : 'Agregar actividades del docente';
  });

  readonly contractModalityLabel = computed(
    () => this.contractModality()?.nombre?.trim() || '-',
  );

  readonly coordinationLabel = computed(() => {
    const item = this.coordination();
    if (!item) {
      return '-';
    }
    return item.descripcion?.trim() || item.nombre?.trim() || '-';
  });

  readonly directActivityContext = computed(() => {
    const coordination = this.coordination();
    if (!coordination?.id || coordination.idNivelEducativo == null) {
      return null;
    }
    return {
      idCoordinacion: coordination.id,
      idNivelEducativo: coordination.idNivelEducativo,
    };
  });

  readonly periodLabel = computed(
    () => this.coordination()?.periodoUniversidad?.trim() || '',
  );

  readonly categoryHours = computed(
    (): Record<ActivityCategoryCodigo, number> => ({
      FAD: this.sumDirectHours(),
      FAI: this.sumSimpleHours(this.actividadesFAI()),
      AC: this.sumSimpleHours(this.actividadesAC()),
      CTEI: this.sumProjectHours(this.associatedProjectsCTEI()),
      ISU: this.sumProjectHours(this.associatedProjectsISU()),
    }),
  );

  readonly totalAssignedHours = computed(() =>
    Object.values(this.categoryHours()).reduce(
      (total, hours) => total + hours,
      0,
    ),
  );

  readonly professorWorkDate = computed(() => {
    const idFechasConvocatoria = this.professor()?.idFechasConvocatoria;
    if (idFechasConvocatoria == null) {
      return null;
    }

    return (
      this.workDatesResource
        .value()
        .find((item) => item.id === idFechasConvocatoria) ?? null
    );
  });

  readonly weeklyHoursLimit = computed(() =>
    parseMaxWeeklyHours(this.professorWorkDate()?.rangoHoras),
  );

  readonly isLoadingWorkDates = computed(
    () => this.workDatesResource.isLoading(),
  );

  readonly exceedsWeeklyLimit = computed(() => {
    const limit = this.weeklyHoursLimit();
    if (limit == null) {
      return false;
    }

    return this.totalAssignedHours() > limit;
  });

  readonly canSaveDistribution = computed(
    () =>
      !this.isLoadingDetail() &&
      hasSaveableActivities(
        this.buildSaveInput(),
        this.loadedDetailsById(),
      ),
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        untracked(() => this.resetModalState());
        return;
      }

      if (this.detailResource.isLoading()) {
        untracked(() => this.clearActivitySignals());
        return;
      }

      const detail = this.detailResource.value();
      untracked(() => this.applyLoadedDetail(detail));
    });
  }

  onCategoryExpandedChange(
    codigo: ActivityCategoryCodigo,
    expanded: boolean,
  ): void {
    this.expandedCategories.update((current) => ({
      ...current,
      [codigo]: expanded,
    }));
  }

  isCategoryExpanded(codigo: ActivityCategoryCodigo): boolean {
    return this.expandedCategories()[codigo];
  }

  isAddFormOpen(codigo: ActivityCategoryCodigo): boolean {
    return this.addFormOpen()[codigo];
  }

  onAddFormOpenChange(
    codigo: ActivityCategoryCodigo,
    isFormOpen: boolean,
  ): void {
    this.addFormOpen.update((current) => ({
      ...current,
      [codigo]: isFormOpen,
    }));
  }

  hoursLabel(hours: number): string {
    return `${hours}h`;
  }

  criteriaActivitiesForCodigo(codigo: ActivityCategoryCodigo): SimpleActivity[] {
    if (codigo === 'FAI' || codigo === 'AC') {
      return this.criteriaActivitiesByCodigo[codigo]();
    }
    return [];
  }

  projectHierarchyRowsForCodigo(codigo: ActivityCategoryCodigo): ProfessorProjectRow[] {
    const rows = this.projectHierarchyRowsByCodigo();
    if (codigo === 'CTEI') {
      return rows.CTEI;
    }
    if (codigo === 'ISU') {
      return rows.ISU;
    }
    return [];
  }

  associatedProjectsForCodigo(codigo: ActivityCategoryCodigo): ProfessorProjectRow[] {
    if (codigo === 'CTEI' || codigo === 'ISU') {
      return this.associatedProjectsByCodigo[codigo]();
    }
    return [];
  }

  setAssociatedProjectsForCodigo(codigo: ActivityCategoryCodigo, rows: ProfessorProjectRow[]): void {
    if (codigo === 'CTEI' || codigo === 'ISU') {
      this.associatedProjectsByCodigo[codigo].set(rows);
    }
  }

  setCriteriaActivitiesForCodigo(codigo: ActivityCategoryCodigo, activities: SimpleActivity[]): void {
    if (codigo === 'FAI' || codigo === 'AC') {
      this.criteriaActivitiesByCodigo[codigo].set(activities);
    }
  }

  onSubmit(): void {
    const professor = this.professor();
    if (professor?.idCargaDocente == null) {
      this.notificationService.error(
        'No se encontró la carga docente del profesor.',
      );
      return;
    }

    const input = this.buildSaveInput();
    if (!hasSaveableActivities(input, this.loadedDetailsById())) {
      this.notificationService.warning(
        'Agrega al menos una actividad o proyecto asociado para guardar.',
        'Sin actividades',
      );
      return;
    }

    const saveRequest = buildSaveActivityDistributionRequest(input);
    const updateRequests = buildUpdateDetailProfessorPreloadRequests(
      input,
      this.loadedDetailsById(),
    );
    const requests = [
      ...updateRequests.map((detalle) =>
        this.coordinationService.updateDetailProfessorPreload(detalle),
      ),
    ];

    if (saveRequest.detalles.length > 0) {
      requests.push(
        this.coordinationService.saveActivityDistribution(saveRequest),
      );
    }

    this.isSaving.set(true);

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saved.emit();
          this.close.emit();
        },
        error: () => this.isSaving.set(false),
      });
  }

  private buildSaveInput() {
    const coordination = this.coordination();

    return {
      idCargaDocente: this.professor()?.idCargaDocente ?? 0,
      idCentroCosto: coordination?.centroCosto?.id ?? null,
      centroCostoDescripcion: coordination?.centroCosto?.descripcion ?? null,
      activityTypes: this.activityTypesResource.value(),
      actividadesFAD: this.actividadesFAD(),
      actividadesFAI: this.actividadesFAI(),
      actividadesAC: this.actividadesAC(),
      associatedProjectsCTEI: this.associatedProjectsCTEI(),
      associatedProjectsISU: this.associatedProjectsISU(),
    };
  }

  private resetModalState(): void {
    this.clearActivitySignals();
    this.loadedDetailsById.set(new Map());
    this.expandedCategories.set(createInitialExpandedCategories());
    this.addFormOpen.set(createInitialAddFormOpen());
    this.isSaving.set(false);
    this.hasSavedDetail.set(false);
  }

  private clearActivitySignals(): void {
    this.actividadesFAD.set([]);
    this.actividadesFAI.set([]);
    this.actividadesAC.set([]);
    this.associatedProjectsCTEI.set([]);
    this.associatedProjectsISU.set([]);
  }

  private applyLoadedDetail(
    detail: DetailProfessorPreloadApi,
  ): void {
    const state = mapDetailProfessorPreloadToModalState(detail);
    const loadedDetails = new Map<number, DetailProfessorPreloadItemApi>();

    for (const item of detail) {
      loadedDetails.set(
        item.idDetalleCargaDocente,
        structuredClone(item),
      );
    }

    this.loadedDetailsById.set(loadedDetails);
    this.actividadesFAD.set(state.actividadesFAD);
    this.actividadesFAI.set(state.actividadesFAI);
    this.actividadesAC.set(state.actividadesAC);
    this.associatedProjectsCTEI.set(state.associatedProjectsCTEI);
    this.associatedProjectsISU.set(state.associatedProjectsISU);
    this.hasSavedDetail.set(state.hasSavedDetail);
  }

  private resolveProfessorName(
    professor: ModalityProfessor | null,
  ): string {
    if (!professor || professor.idPersonaGeneral == null) {
      return NN_LABEL;
    }
    return professor.nombreCompleto?.trim() || NN_LABEL;
  }

  private sumDirectHours(): number {
    return this.actividadesFAD().reduce(
      (total, item) => total + item.horasPresenciales,
      0,
    );
  }

  private sumSimpleHours(items: SimpleActivity[]): number {
    return items.reduce(
      (total, item) => total + item.horasDedicacion,
      0,
    );
  }

  private sumProjectHours(rows: ProfessorProjectRow[]): number {
    return rows.reduce(
      (total, row) => total + (row.horasDedicacion ?? 0),
      0,
    );
  }
}
