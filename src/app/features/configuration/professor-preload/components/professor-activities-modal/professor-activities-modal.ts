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
import { catchError, forkJoin, map, of } from 'rxjs';
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
import { PreloadCallService } from '../../../preload-call/data/preload-call.service';
import { PreloadCallDetailFecha } from '../../../preload-call/model/preload-call.model';

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
  private readonly preloadCallService = inject(PreloadCallService);
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

  readonly activityCardsReadOnly = computed(
    () => this.readOnly() || this.isPreassignmentApproved(),
  );

  readonly activityCardsReadOnlyReason = computed(() =>
    this.isPreassignmentApproved()
      ? 'La preasignación del docente ya fue aprobada.'
      : this.readOnlyMessage(),
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
      const idConvocatoria = this.coordination()?.idConvocatoria;

      if (
        idPersonaGeneral == null ||
        idConvocatoria == null
      ) {
        return undefined;
      }

      return {
        idPersonaGeneral,
        idConvocatoria,
      };
    },

    stream: ({ params }) =>
      this.coordinationService.listProjectsProfessor(
        params.idPersonaGeneral,
        params.idConvocatoria,
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

  readonly preloadCallDetailResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }

      const idConvocatoria = this.coordination()?.idConvocatoria;
      if (idConvocatoria == null) {
        return undefined;
      }

      return { idConvocatoria };
    },
    stream: ({ params }) =>
      this.preloadCallService.getPreloadCallDetails(params.idConvocatoria),
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

  readonly projectAssociationDates = computed(() => {
    const fechas = this.preloadCallDetailResource.value()?.fechas ?? [];

    const findByCode = (codigo: 'CTEI' | 'ISU') =>
      fechas.find(
        (fecha) =>
          String(fecha.codigo).trim().toUpperCase() === codigo,
      ) ?? null;

    return {
      CTEI: findByCode('CTEI'),
      ISU: findByCode('ISU'),
    } satisfies Record<
      'CTEI' | 'ISU',
      PreloadCallDetailFecha | null
    >;
  });

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
    const modalityId = this.contractModality()?.id;
    if (
      !coordination?.id ||
      coordination.idNivelEducativo == null ||
      coordination.idPeriodoUniversidad == null ||
      modalityId == null
    ) {
      return null;
    }
    return {
      idCoordinacion: coordination.id,
      idNivelEducativo: coordination.idNivelEducativo,
      idPeriodoUniversidad: coordination.idPeriodoUniversidad,
      idModalidadContratacion: modalityId,
      idCargaDocente: this.professor()?.idCargaDocente ?? null,
    };
  });

  readonly allDirectActivities = computed(() => {
    const byCodigo = this.directByCodigo();
    const codigos = Object.keys(byCodigo);
    const rows: DirectLearningActivity[] = [];

    for (let index = 0; index < codigos.length; index += 1) {
      const activities = byCodigo[codigos[index]] ?? [];
      for (let rowIndex = 0; rowIndex < activities.length; rowIndex += 1) {
        rows.push(activities[rowIndex]);
      }
    }

    return rows;
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

  readonly submitButtonDisabled = computed(() => {
    if (
      this.readOnly() ||
      this.isSaving() ||
      this.isLoadingDetail() ||
      this.isLoadingActivityCategories() ||
      this.isPreassignmentApproved() ||
      this.exceedsWeeklyLimit()
    ) {
      return true;
    }

    const hasPendingChanges = hasSaveableActivities(
      this.buildSaveInput(),
      this.loadedDetailsById(),
    );

    return !hasPendingChanges && !this.hasCompletedWeeklyGoal();
  });

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
    if (this.activityCardsReadOnly() && isFormOpen) {
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

  isProjectAssociationExpired(codigo: string): boolean {
    const projectCode = this.resolveProjectActivityCode(codigo);

    if (projectCode == null) {
      return false;
    }

    const fechaFin = this.dateOnly(
      this.projectAssociationDates()[projectCode]?.fechaFin,
    );

    if (fechaFin == null) {
      return false;
    }

    return fechaFin < this.todayLocalDate();
  }

  projectAssociationExpiredReason(codigo: string): string | null {
    const projectCode = this.resolveProjectActivityCode(codigo);

    if (
      projectCode == null ||
      !this.isProjectAssociationExpired(projectCode)
    ) {
      return null;
    }

    const fechaFin = this.dateOnly(
      this.projectAssociationDates()[projectCode]?.fechaFin,
    );

    if (fechaFin == null) {
      return null;
    }

    const label = projectCode === 'CTEI' ? 'CTeI' : 'ISU';

    return `La fecha límite para asociar proyectos ${label} expiró el ${this.formatDate(fechaFin)}.`;
  }

  directActivitiesForCodigo(codigo: string): DirectLearningActivity[] {
    return this.directByCodigo()[codigo] ?? [];
  }

  setDirectActivitiesForCodigo(
    codigo: string,
    activities: DirectLearningActivity[],
  ): void {
    if (this.readOnly() || this.isPreassignmentApproved()) {
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
    if (this.readOnly() || this.isPreassignmentApproved()) {

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
    if (this.readOnly() || this.isPreassignmentApproved()) {

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

    const saveRequest = buildSaveActivityDistributionRequest(input);
    const updateRequests = buildUpdateDetailProfessorPreloadRequests(
      input,
      this.loadedDetailsById(),
    );

    const hasPendingChanges =
      saveRequest.detalles.length > 0 || updateRequests.length > 0;

    const shouldApprove = this.hasCompletedWeeklyGoal();

    if (!hasPendingChanges && !shouldApprove) {
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

    this.isSaving.set(true);

    const operation$ = shouldApprove
      ? this.coordinationService.approveProfessorActivityDistribution({
          idCargaDocente,
          detallesActualizados: updateRequests,
          detallesNuevos: saveRequest.detalles,
        })
      : forkJoin([
          ...updateRequests.map((detalle) =>
            this.coordinationService.updateDetailProfessorPreload(detalle),
          ),
          ...(saveRequest.detalles.length > 0
            ? [this.coordinationService.saveActivityDistribution(saveRequest)]
            : []),
        ]).pipe(map(() => undefined));

    operation$
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  private resolveProjectActivityCode(
    codigo: string,
  ): 'CTEI' | 'ISU' | null {
    const normalized = codigo.trim().toUpperCase();

    return normalized === 'CTEI' || normalized === 'ISU'
      ? normalized
      : null;
  }

  private dateOnly(
    value: string | null | undefined,
  ): string | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);

    return match?.[1] ?? null;
  }

  private todayLocalDate(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-');

    return `${day}/${month}/${year}`;
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
