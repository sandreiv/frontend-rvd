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
import { catchError, of } from 'rxjs';
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
  hasSaveableActivities,
} from '../../model/professor-activities-save.mapper';
import { mapDetailProfessorPreloadToModalState } from '../../model/professor-activities-load.mapper';
import { DetailProfessorPreloadApi } from '../../model/detail-professor-preload.model';
import {
  detectProjectActivityCodigos,
  buildProjectHierarchyRows,
} from '../../model/professor-projects.mapper';
import {
  ProfessorProjectRow,
  ProyectoDocenteDto,
} from '../../model/professor-projects.model';

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
  weeklyHoursLimit = input(40);

  close = output<void>();
  saved = output<void>();

  readonly isSaving = signal(false);
  readonly hasSavedDetail = signal(false);

  readonly actividadesFAD = signal<DirectLearningActivity[]>([]);
  readonly actividadesFAI = signal<SimpleActivity[]>([]);
  readonly actividadesAC = signal<SimpleActivity[]>([]);
  readonly associatedProjectsCTEI = signal<ProfessorProjectRow[]>([]);
  readonly associatedProjectsISU = signal<ProfessorProjectRow[]>([]);

  private readonly criteriaActivitiesByCodigo: Record<
    CriteriaActivityCodigo,
    WritableSignal<SimpleActivity[]>
  > = {
    FAI: this.actividadesFAI,
    AC: this.actividadesAC,
  };

  private readonly associatedProjectsByCodigo: Record<
    ProjectActivityCategoryCodigo,
    WritableSignal<ProfessorProjectRow[]>
  > = {
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
        .pipe(catchError(() => of(null))),
    defaultValue: null as DetailProfessorPreloadApi | null,
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

  readonly canSaveDistribution = computed(
    () =>
      !this.isLoadingDetail() &&
      hasSaveableActivities(this.buildSaveInput()),
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

  criteriaActivitiesForCodigo(
    codigo: ActivityCategoryCodigo,
  ): SimpleActivity[] {
    if (codigo === 'FAI' || codigo === 'AC') {
      return this.criteriaActivitiesByCodigo[codigo]();
    }
    return [];
  }

  projectHierarchyRowsForCodigo(
    codigo: ActivityCategoryCodigo,
  ): ProfessorProjectRow[] {
    const rows = this.projectHierarchyRowsByCodigo();
    if (codigo === 'CTEI') {
      return rows.CTEI;
    }
    if (codigo === 'ISU') {
      return rows.ISU;
    }
    return [];
  }

  associatedProjectsForCodigo(
    codigo: ActivityCategoryCodigo,
  ): ProfessorProjectRow[] {
    if (codigo === 'CTEI' || codigo === 'ISU') {
      return this.associatedProjectsByCodigo[codigo]();
    }
    return [];
  }

  setAssociatedProjectsForCodigo(
    codigo: ActivityCategoryCodigo,
    rows: ProfessorProjectRow[],
  ): void {
    if (codigo === 'CTEI' || codigo === 'ISU') {
      this.associatedProjectsByCodigo[codigo].set(rows);
    }
  }

  setCriteriaActivitiesForCodigo(
    codigo: ActivityCategoryCodigo,
    activities: SimpleActivity[],
  ): void {
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
    if (!hasSaveableActivities(input)) {
      this.notificationService.warning(
        'Agrega al menos una actividad o proyecto asociado para guardar.',
        'Sin actividades',
      );
      return;
    }

    const request = buildSaveActivityDistributionRequest(input);
    this.isSaving.set(true);

    this.coordinationService
      .saveActivityDistribution(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            'Puedes continuar cargando más actividades en otro momento.',
            'Actividades guardadas',
          );
          this.saved.emit();
          this.close.emit();
        },
        error: () => this.isSaving.set(false),
      });
  }

  private buildSaveInput() {
    return {
      idCargaDocente: this.professor()?.idCargaDocente ?? 0,
      idCentroCosto: this.coordination()?.centroCosto?.id ?? null,
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
    detail: DetailProfessorPreloadApi | null,
  ): void {
    const state = mapDetailProfessorPreloadToModalState(detail);
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
      (total, row) => total + row.horasDedicacion,
      0,
    );
  }
}
