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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
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
  buildComponenteByCodigo,
  buildVisibleActivityItems,
  createInitialAddFormOpen,
  createInitialExpandedCategories,
  resolveInitialExpandedCategories,
} from '../../model/professor-activities.config';
import {
  DirectLearningActivity,
  SimpleActivity,
} from '../../model/professor-activities-modal.models';
import {
  ActividadModalidadDTO,
  ActivityFormType,
  TipoActividad,
} from '../../model/professor-activities.model';
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
import { buildProjectHierarchyRows } from '../../model/professor-projects.mapper';
import {
  ProfessorProjectRow,
  ProyectoDocenteDto,
} from '../../model/professor-projects.model';
import { parseMaxWeeklyHours } from '../../model/professor-form.config';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';

const NN_LABEL = 'NN';

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
    Tooltip,
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

  readOnly = input(false);
  readOnlyReason = input<string | null>(null);

  close = output<void>();
  saved = output<void>();

  readonly isSaving = signal(false);
  readonly hasSavedDetail = signal(false);
  readonly isPreassignmentApproved = signal(false);

  readonly readOnlyMessage = computed(
    () =>
      this.readOnlyReason() ??
      'La coordinación no está habilitada para edición en esta convocatoria.',
  );

  readonly directByCodigo = signal<
    Record<string, DirectLearningActivity[]>
  >({});
  readonly criteriaByCodigo = signal<Record<string, SimpleActivity[]>>({});
  readonly projectsByCodigo = signal<
    Record<string, ProfessorProjectRow[]>
  >({});
  private readonly loadedDetailsById = signal<
    Map<number, DetailProfessorPreloadItemApi>
  >(new Map());

  readonly activityTypesResource = rxResource({
    params: () => (this.isOpen() ? true : undefined),
    stream: () => this.coordinationService.listActivityTypes(),
    defaultValue: [] as TipoActividad[],
  });

  readonly activitiesModalityResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }
      const idModalidadContratacion = this.contractModality()?.id;
      if (idModalidadContratacion == null) {
        return undefined;
      }
      return { idModalidadContratacion };
    },
    stream: ({ params }) =>
      this.coordinationService.listActivitiesModality(
        params.idModalidadContratacion,
      ),
    defaultValue: {
      idModalidadContratacion: 0,
      tipoActividades: [],
    } as ActividadModalidadDTO,
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
      const idCarga = this.coordination()?.idCarga;
      const idModalidadContratacion = this.contractModality()?.id;
      if (idCarga == null || idModalidadContratacion == null) {
        return undefined;
      }
      return { idCarga, idModalidadContratacion };
    },
    stream: ({ params }) =>
      this.coordinationService.getWorkDates(
        params.idCarga,
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

  readonly isLoadingActivityCategories = computed(
    () => this.activitiesModalityResource.isLoading(),
  );

  readonly expandedCategories = signal<Record<string, boolean>>({});
  readonly addFormOpen = signal<Record<string, boolean>>({});
  private readonly expandedCategoriesInitialized = signal(false);

  readonly visibleActivityItems = computed(() =>
    buildVisibleActivityItems(
      this.activitiesModalityResource.value().tipoActividades ?? [],
      this.activityTypesResource.value(),
    ),
  );

  readonly projectHierarchyRowsByCodigo = computed(() => {
    const proyectos = this.professorProjectsResource.value();
    const idPersonaGeneral = this.professor()?.idPersonaGeneral;
    const items = this.visibleActivityItems();
    const result: Record<string, ProfessorProjectRow[]> = {};

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.formType !== 'project') {
        continue;
      }
      result[item.codigo] = buildProjectHierarchyRows(
        proyectos,
        item.codigo,
        idPersonaGeneral,
      );
    }

    return result;
  });

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
    if (
      !coordination?.id ||
      coordination.idNivelEducativo == null ||
      coordination.idPeriodoUniversidad == null
    ) {
      return null;
    }
    return {
      idCoordinacion: coordination.id,
      idNivelEducativo: coordination.idNivelEducativo,
      idPeriodoUniversidad: coordination.idPeriodoUniversidad,
    };
  });

  readonly periodLabel = computed(
    () => this.coordination()?.periodoUniversidad?.trim() || '',
  );

  readonly categoryHours = computed((): Record<string, number> => {
    const hours: Record<string, number> = {};
    const items = this.visibleActivityItems();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item.formType === 'direct') {
        hours[item.codigo] = this.sumDirectHours(
          this.directByCodigo()[item.codigo] ?? [],
        );
        continue;
      }
      if (item.formType === 'criteria') {
        hours[item.codigo] = this.sumSimpleHours(
          this.criteriaByCodigo()[item.codigo] ?? [],
        );
        continue;
      }
      hours[item.codigo] = this.sumProjectHours(
        this.projectsByCodigo()[item.codigo] ?? [],
      );
    }

    return hours;
  });

  readonly totalAssignedHours = computed(() =>
    Object.values(this.categoryHours()).reduce(
      (total, value) => total + value,
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

  readonly weeklyHoursLabel = computed(() => {
    const horasDeExcepcion = String(
      this.professor()?.horasDeExcepcion ?? '',
    ).trim();

    if (horasDeExcepcion) {
      return horasDeExcepcion;
    }

    return this.professorWorkDate()?.rangoHoras ?? '';
  });

  readonly weeklyHoursLimit = computed(() =>
    parseMaxWeeklyHours(this.weeklyHoursLabel()),
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
    

  readonly hasCompletedWeeklyGoal = computed(() => {
    const limit = this.weeklyHoursLimit();

    if (limit == null) {
      return false;
    }

    return Math.abs(this.totalAssignedHours() - limit) < 0.0001;
  });

  readonly submitButtonText = computed(() => {
    if (this.readOnly()) {
      return 'Solo lectura';
    }

    if (this.isPreassignmentApproved()) {
      return 'Aprobado';
    }

    if (this.isSaving()) {
      return this.hasCompletedWeeklyGoal() ? 'Aprobando...' : 'Guardando...';
    }

    return this.hasCompletedWeeklyGoal() ? 'Aprobar' : 'Guardar';
  });

  readonly submitButtonDisabled = computed(
    () =>
      this.readOnly() ||
      this.isSaving() ||
      this.isLoadingDetail() ||
      this.isLoadingActivityCategories() ||
      this.isPreassignmentApproved() ||
      !this.canSaveDistribution(),
  );

  readonly showApprovalBox = computed(
    () => this.hasCompletedWeeklyGoal() || this.isPreassignmentApproved(),
  );

  readonly approvalText = computed(() =>
    this.isPreassignmentApproved()
      ? 'Estado aprobación preasignación para el docente:'
      : 'Aprobar preasignación para el docente',
  );

  readonly approvalButtonText = computed(() =>
    this.isPreassignmentApproved() ? 'Aprobado' : 'Aprobar',
  );

  readonly canSaveDistribution = computed(
    () =>
      !this.readOnly() &&
      !this.isPreassignmentApproved() &&
      !this.isLoadingDetail() &&
      !this.isLoadingActivityCategories() &&
      !this.exceedsWeeklyLimit() &&
      hasSaveableActivities(
        this.buildSaveInput(),
        this.loadedDetailsById(),
      ),
  );

  constructor() {

    effect(() => {
      const isOpen = this.isOpen();
      const estado = this.professor()?.estado;

      untracked(() => {
        this.isPreassignmentApproved.set(isOpen && estado === '1');
      });
    });

    effect(() => {
      if (!this.isOpen()) {
        untracked(() => this.resetModalState());
        return;
      }

      if (
        this.detailResource.isLoading() ||
        this.activitiesModalityResource.isLoading()
      ) {
        untracked(() => this.clearActivitySignals());
        return;
      }

      const detail = this.detailResource.value();
      const componenteByCodigo = buildComponenteByCodigo(
        this.activitiesModalityResource.value().tipoActividades ?? [],
      );
      untracked(() => this.applyLoadedDetail(detail, componenteByCodigo));
    });

    effect(() => {
      if (!this.isOpen()) {
        untracked(() => this.expandedCategoriesInitialized.set(false));
        return;
      }

      if (this.isLoadingActivityCategories()) {
        return;
      }

      const items = this.visibleActivityItems();
      const hasProject = items.some((item) => item.formType === 'project');
      if (hasProject && this.professorProjectsResource.isLoading()) {
        return;
      }

      if (this.expandedCategoriesInitialized()) {
        return;
      }

      const codigos = items.map((item) => item.codigo);
      const rows = this.projectHierarchyRowsByCodigo();
      untracked(() => {
        this.expandedCategories.set(
          resolveInitialExpandedCategories(codigos, rows),
        );
        this.addFormOpen.set(createInitialAddFormOpen(codigos));
        this.expandedCategoriesInitialized.set(true);
      });
    });
  }

  onCategoryExpandedChange(codigo: string, expanded: boolean): void {
    this.expandedCategories.update((current) => ({
      ...current,
      [codigo]: expanded,
    }));
  }

  isCategoryExpanded(codigo: string): boolean {
    return this.expandedCategories()[codigo] === true;
  }

  isAddFormOpen(codigo: string): boolean {
    return this.addFormOpen()[codigo] === true;
  }

  onAddFormOpenChange(codigo: string, isFormOpen: boolean): void {
    if (this.readOnly() && isFormOpen) {
      return;
    }

    this.addFormOpen.update((current) => ({
      ...current,
      [codigo]: isFormOpen,
    }));
  }

  hoursLabel(hours: number): string {
    return `${hours ?? 0}h`;
  }

  directActivitiesForCodigo(codigo: string): DirectLearningActivity[] {
    return this.directByCodigo()[codigo] ?? [];
  }

  setDirectActivitiesForCodigo(
    codigo: string,
    activities: DirectLearningActivity[],
  ): void {
    if (this.readOnly()) {
      return;
    }

    this.directByCodigo.update((current) => ({
      ...current,
      [codigo]: activities,
    }));
  }

  criteriaActivitiesForCodigo(codigo: string): SimpleActivity[] {
    return this.criteriaByCodigo()[codigo] ?? [];
  }

  setCriteriaActivitiesForCodigo(
    codigo: string,
    activities: SimpleActivity[],
  ): void {
    if (this.readOnly()) {
      return;
    }

    this.criteriaByCodigo.update((current) => ({
      ...current,
      [codigo]: activities,
    }));
  }

  projectHierarchyRowsForCodigo(codigo: string): ProfessorProjectRow[] {
    return this.projectHierarchyRowsByCodigo()[codigo] ?? [];
  }

  associatedProjectsForCodigo(codigo: string): ProfessorProjectRow[] {
    return this.projectsByCodigo()[codigo] ?? [];
  }

  setAssociatedProjectsForCodigo(
    codigo: string,
    rows: ProfessorProjectRow[],
  ): void {
    if (this.readOnly()) {
      return;
    }

    this.projectsByCodigo.update((current) => ({
      ...current,
      [codigo]: rows,
    }));
  }

  onSubmit(): void {
    if (this.readOnly() || this.isSaving() || this.isPreassignmentApproved()) {
      return;
    }

    const professor = this.professor();

    if (professor?.idCargaDocente == null) {
      this.notificationService.error(
        'No se encontró la carga docente del profesor.',
      );
      return;
    }

    const idCargaDocente = professor.idCargaDocente;
    const input = this.buildSaveInput();

    if (!hasSaveableActivities(input, this.loadedDetailsById())) {
      this.notificationService.warning(
        'Agrega al menos una actividad o proyecto asociado para guardar.',
        'Sin actividades',
      );
      return;
    }

    if (this.exceedsWeeklyLimit()) {
      this.notificationService.error(
        `El total de horas asignadas (${this.totalAssignedHours()}h) supera el límite semanal de ${this.weeklyHoursLimit()}h.`,
      );
      return;
    }

    const shouldApprove = this.hasCompletedWeeklyGoal();

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
      .pipe(
        switchMap(() =>
          shouldApprove
            ? this.coordinationService.approveProfessorPreassignment(
                idCargaDocente,
              )
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSaving.set(false);

          if (shouldApprove) {
            this.isPreassignmentApproved.set(true);
            this.notificationService.success(
              'La preasignación del docente fue aprobada correctamente.',
              'Preasignación aprobada',
            );
          }

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
      activityTypes: this.resolveActivityTypesForSave(),
      directByCodigo: this.directByCodigo(),
      criteriaByCodigo: this.criteriaByCodigo(),
      projectsByCodigo: this.projectsByCodigo(),
    };
  }

  private resolveActivityTypesForSave(): TipoActividad[] {
    const catalog = this.activityTypesResource.value();
    const modalityTypes =
      this.activitiesModalityResource.value().tipoActividades ?? [];
    const byCodigo = new Map<string, TipoActividad>();

    for (let index = 0; index < catalog.length; index += 1) {
      const type = catalog[index];
      byCodigo.set(type.codigo, type);
    }

    for (let index = 0; index < modalityTypes.length; index += 1) {
      const item = modalityTypes[index];
      if (byCodigo.has(item.codigo)) {
        continue;
      }
      byCodigo.set(item.codigo, {
        id: item.id,
        idPadre: null,
        nombre: item.nombre,
        descripcion: item.nombre,
        orden: String(index),
        codigo: item.codigo,
        componente: item.componente,
      });
    }

    return Array.from(byCodigo.values());
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
    this.directByCodigo.set({});
    this.criteriaByCodigo.set({});
    this.projectsByCodigo.set({});
  }

  private applyLoadedDetail(
    detail: DetailProfessorPreloadApi,
    componenteByCodigo: Record<string, ActivityFormType>,
  ): void {
    const state = mapDetailProfessorPreloadToModalState(
      detail,
      componenteByCodigo,
    );
    const loadedDetails = new Map<number, DetailProfessorPreloadItemApi>();

    for (let index = 0; index < detail.length; index += 1) {
      const item = detail[index];
      loadedDetails.set(
        item.idDetalleCargaDocente,
        structuredClone(item),
      );
    }

    this.loadedDetailsById.set(loadedDetails);
    this.directByCodigo.set(state.directByCodigo);
    this.criteriaByCodigo.set(state.criteriaByCodigo);
    this.projectsByCodigo.set(state.projectsByCodigo);
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

  private sumDirectHours(items: DirectLearningActivity[]): number {
    return items.reduce(
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
