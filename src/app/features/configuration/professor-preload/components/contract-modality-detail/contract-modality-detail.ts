import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { Button } from '../../../../../shared/ui/button/button';
import { Dropdown } from '../../../../../shared/ui/dropdown/dropdown/dropdown';
import { Item } from '../../../../../shared/ui/dropdown/item/item';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { TabBar } from '../../../../../shared/ui/tab-bar/tab-bar';
import { NewModal } from '../../../../../shared/ui/new-modal/new-modal';
import {
  TabBarId,
  TabBarItem,
} from '../../../../../shared/ui/tab-bar/tab-bar.types';
import { CoordinationService } from '../../data/coordination.service';
import {
  CareerProfessor,
  CoordinationContractModality,
  CoordinationItem,
  getAssignableModalities,
  isPlantaModality,
  mapCareerProfessorToModalityProfessor,
  ModalityProfessor,
  ProfessorCargaDocenteSummary,
  ProfessorSearchResult,
} from '../../model/coordination.model';
import {
  mapProfessorSearchToModalityProfessor,
  resolveModalityFromCarga,
} from '../../model/professor-search.mapper';
import { ProfessorAddModal } from '../professor-add-modal/professor-add-modal';
import { ProfessorActivitiesModal } from '../professor-activities-modal/professor-activities-modal';
import { resolveModalityKind } from '../../model/professor-form.config';

export type ProfessorManagementStatus =
  | 'completo'
  | 'incompleto'
  | 'sin-asignar';

interface ProfessorMenuAction {
  id: string;
  label: string;
  icon: AppIconName;
  className?: string;
}

type BadgeTone = 'success' | 'brand' | 'warning' | 'gray';

export interface StatusBadge {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export interface ModalityProfessorRow {
  rowKey: string;
  menuKey: string;
  displayName: string;
  professor: ModalityProfessor;
}

const NN_LABEL = 'NN';

const BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ' +
  'text-xs font-medium';

const DOT_BASE = 'size-1.5 rounded-full';

const BADGE_TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge:
      'bg-success-50 text-success-700 ' +
      'dark:bg-success-500/15 dark:text-success-400',
    dot: 'bg-success-600 dark:bg-success-400',
  },
  brand: {
    badge:
      'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
    dot: 'bg-brand-600 dark:bg-brand-400',
  },
  warning: {
    badge:
      'bg-warning-50 text-warning-700 ' +
      'dark:bg-warning-500/15 dark:text-warning-400',
    dot: 'bg-warning-500 dark:bg-warning-400',
  },
  gray: {
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400 dark:bg-gray-500',
  },
};

const UNASSIGNED_DOT =
  `${DOT_BASE} border border-dashed border-gray-400 dark:border-gray-500`;

const VERIFIED_MODALITY_STATE = '2';

@Component({
  selector: 'app-contract-modality-detail',
  imports: [
    Button,
    Dropdown,
    Item,
    Icon,
    TabBar,
    NewModal,
    ProfessorAddModal,
    ProfessorActivitiesModal,
  ],
  templateUrl: './contract-modality-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractModalityDetail {
  private readonly coordinationService = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

  coordination = input.required<CoordinationItem>();
  coordinationsCatalog = input<CoordinationItem[]>([]);

  readonly selectedContractModalityId = signal<TabBarId | null>(null);
  readonly isProfessorAddModalOpen = signal(false);
  readonly isActivitiesModalOpen = signal(false);
  readonly professorModalMode = signal<'create' | 'edit'>('create');
  readonly editingModalityProfessor = signal<ModalityProfessor | null>(null);
  readonly activitiesProfessor = signal<ModalityProfessor | null>(null);
  readonly activitiesCoordination = signal<CoordinationItem | null>(null);
  readonly activitiesContractModality =
    signal<CoordinationContractModality | null>(null);
  readonly isExistingLoadAlertOpen = signal(false);
  readonly pendingExistingLoadProfessor =
    signal<ProfessorSearchResult | null>(null);
  readonly openMenuKey = signal<string | null>(null);

  readonly contractModalities = computed(
    () => this.coordination().modalidadesContratacion,
  );

  readonly sortedContractModalities = computed(() =>
    this.sortContractModalities(this.contractModalities()),
  );

  readonly assignableModalities = computed(() =>
    getAssignableModalities(this.sortedContractModalities()),
  );

  readonly hasPlantaModality = computed(() =>
    this.sortedContractModalities().some(isPlantaModality),
  );

  readonly careerProfessorsResource = rxResource({
    params: () => {
      if (!this.hasPlantaModality()) {
        return undefined;
      }
      return { idCoordinacion: this.coordination().id };
    },
    stream: ({ params }) =>
      this.coordinationService.getCareerProfessors(params.idCoordinacion),
    defaultValue: [] as CareerProfessor[],
  });

  readonly careerProfessors = computed(() =>
    this.careerProfessorsResource.value(),
  );

  readonly modalityProfessorsResource = rxResource({
    params: () => {
      const modalities = this.sortedContractModalities();
      if (!modalities.length) {
        return undefined;
      }
      return {
        idCoordinacion: this.coordination().id,
        modalityIds: modalities.map((modality) => modality.id),
      };
    },
    stream: ({ params }) =>
      forkJoin(
        params.modalityIds.map((id) =>
          this.coordinationService
            .listProfessorsByModality(params.idCoordinacion, id)
            .pipe(map((professors) => ({ id, professors }))),
        ),
      ).pipe(map((entries) => this.toModalityProfessorsMap(entries))),
    defaultValue: {} as Record<number, ModalityProfessor[]>,
  });

  readonly modalityProfessorsMap = computed(() =>
    this.modalityProfessorsResource.value(),
  );

  readonly modalityProfessors = computed<ModalityProfessor[]>(() => {
    const selectedId = this.selectedContractModalityId();
    if (selectedId == null || this.isPlantaSelected()) {
      return [];
    }
    return this.modalityProfessorsMap()[Number(selectedId)] ?? [];
  });

  readonly currentTabProfessors = computed<ModalityProfessor[]>(() => {
    if (this.isPlantaSelected()) {
      return this.resolvePlantaProfessors();
    }
    return this.modalityProfessors();
  });

  readonly currentProfessorRows = computed<ModalityProfessorRow[]>(() =>
    this.buildProfessorRows(this.currentTabProfessors()),
  );

  readonly modalityTabs = computed<TabBarItem[]>(() => {
    const professorsByModality = this.modalityProfessorsMap();
    return this.sortedContractModalities().map((modality) =>
      this.toModalityTabItem(modality, professorsByModality),
    );
  });

  readonly hasAnyModality = computed(() => this.modalityTabs().length > 0);

  readonly isPlantaSelected = computed(() => {
    const selectedId = this.selectedContractModalityId();
    const modality = this.sortedContractModalities().find(
      (item) => item.id === selectedId,
    );
    return modality != null && isPlantaModality(modality);
  });

  readonly selectedPlantaModality = computed(
    () => this.sortedContractModalities().find(isPlantaModality) ?? null,
  );

  readonly selectedContractModality = computed(() => {
    if (this.isPlantaSelected()) {
      return null;
    }

    const selectedId = this.selectedContractModalityId();
    return (
      this.assignableModalities().find((item) => item.id === selectedId) ??
      null
    );
  });

  readonly selectedModalityForModals = computed(
    () => this.selectedContractModality() ?? this.selectedPlantaModality(),
  );

  readonly selectedModalityLabel = computed(() => {
    if (this.isPlantaSelected()) {
      return this.selectedPlantaModality()?.nombre ?? 'planta';
    }
    return this.selectedContractModality()?.nombre ?? '-';
  });

  readonly activitiesModalCoordination = computed(() => {
    const resolved = this.activitiesCoordination();
    if (resolved) {
      return resolved;
    }
    return this.coordination();
  });

  readonly activitiesModalContractModality = computed(() => {
    const resolved = this.activitiesContractModality();
    if (resolved) {
      return resolved;
    }
    return this.selectedModalityForModals();
  });

  constructor() {
    effect(() => {
      const tabs = this.modalityTabs();
      const currentId = this.selectedContractModalityId();

      if (!tabs.length) {
        this.selectedContractModalityId.set(null);
        return;
      }

      const hasCurrent = tabs.some((tab) => tab.id === currentId);
      if (!hasCurrent) {
        this.selectedContractModalityId.set(tabs[0].id);
      }
    });
  }

  onContractModalityChange(modalityId: TabBarId | null): void {
    this.selectedContractModalityId.set(modalityId);
  }

  onProfessorAddModalOpen(): void {
    this.professorModalMode.set('create');
    this.editingModalityProfessor.set(null);
    this.isProfessorAddModalOpen.set(true);
  }

  closeProfessorAddModal(): void {
    this.isProfessorAddModalOpen.set(false);
    this.professorModalMode.set('create');
    this.editingModalityProfessor.set(null);
  }

  onProfessorSaved(): void {
    this.closeProfessorAddModal();
    this.modalityProfessorsResource.reload();
    this.careerProfessorsResource.reload();
  }

  onExistingLoadSelected(professor: ProfessorSearchResult): void {
    this.pendingExistingLoadProfessor.set(professor);
    this.isExistingLoadAlertOpen.set(true);
  }

  closeExistingLoadAlert(): void {
    this.isExistingLoadAlertOpen.set(false);
    this.pendingExistingLoadProfessor.set(null);
  }

  confirmExistingLoadContinue(): void {
    const search = this.pendingExistingLoadProfessor();
    const carga = search?.cargaDocente;
    if (!search || !carga) {
      return;
    }

    const professor = mapProfessorSearchToModalityProfessor(search);
    if (!professor) {
      return;
    }

    this.resolveActivitiesContext(carga)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ coordination, modality }) => {
        this.closeExistingLoadAlert();
        this.closeProfessorAddModal();
        this.activitiesCoordination.set(coordination);
        this.activitiesContractModality.set(modality);
        this.activitiesProfessor.set(professor);
        this.isActivitiesModalOpen.set(true);
      });
  }

  private resolvePlantaProfessors(): ModalityProfessor[] {
    const planta = this.selectedPlantaModality();
    if (!planta) {
      return [];
    }

    const fromModality = this.modalityProfessorsMap()[planta.id] ?? [];
    if (fromModality.length) {
      return fromModality;
    }

    return this.careerProfessors().map((career) =>
      mapCareerProfessorToModalityProfessor(
        career,
        planta,
        this.coordination().idCarga,
      ),
    );
  }

  private buildProfessorRows(
    professors: ModalityProfessor[],
  ): ModalityProfessorRow[] {
    return professors.map((professor) => {
      const rowId = professor.idCargaDocente || professor.idPersonaGeneral;
      return {
        rowKey: `professor-${rowId}`,
        menuKey: `professor-${rowId}`,
        displayName: this.resolveProfessorName(professor),
        professor,
      };
    });
  }

  private sortContractModalities(modalities: CoordinationContractModality[]): CoordinationContractModality[] {
    return [...modalities].sort(
      (left, right) =>
        this.resolveModalitySortOrder(left) -
        this.resolveModalitySortOrder(right),
    );
  }

  private resolveModalitySortOrder(modality: CoordinationContractModality): number {
    if (isPlantaModality(modality)) {
      return 2;
    }

    const kind = resolveModalityKind(modality.nombre);
    if (kind === 'tiempoCompletoOcasional') {
      return 0;
    }
    if (kind === 'catedra') {
      return 1;
    }

    return 3;
  }

  private toModalityTabItem(modality: CoordinationContractModality, professorsByModality: Record<number, ModalityProfessor[]>): TabBarItem {
    if (isPlantaModality(modality)) {
      const professors = professorsByModality[modality.id] ?? [];
      const count = professors.length || this.careerProfessors().length;
      return {
        id: modality.id,
        label: modality.nombre,
        badge: `${count}`,
      };
    }

    const professors = professorsByModality[modality.id] ?? [];
    const verified = professors.filter(
      (professor) => professor.estado === VERIFIED_MODALITY_STATE,
    ).length;

    return {
      id: modality.id,
      label: modality.nombre,
      badge: `${verified}/${professors.length}`,
    };
  }

  private toModalityProfessorsMap(entries: { id: number; professors: ModalityProfessor[] }[],): Record<number, ModalityProfessor[]> {
    return entries.reduce<Record<number, ModalityProfessor[]>>(
      (accumulator, entry) => {
        accumulator[entry.id] = entry.professors;
        return accumulator;
      },
      {},
    );
  }

  professorStatusBadge(professor: ModalityProfessor): StatusBadge {
    if (this.isPlantaSelected()) {
      return professor.estado === '1'
        ? this.buildStatusBadge('Activo', 'success')
        : this.buildStatusBadge('Inactivo', 'gray');
    }

    return this.modalityStatusBadge(professor);
  }

  private buildStatusBadge(
    label: string,
    tone: BadgeTone,
    dotClass?: string,
  ): StatusBadge {
    const palette = BADGE_TONES[tone];
    return {
      label,
      badgeClass: `${BADGE_BASE} ${palette.badge}`,
      dotClass: dotClass ?? `${DOT_BASE} ${palette.dot}`,
    };
  }

  modalityStatusBadge(professor: ModalityProfessor): StatusBadge {
    switch (professor.estado) {
      case '1':
        return this.buildStatusBadge('Aprobada', 'success');
      case '2':
        return this.buildStatusBadge('Verificada', 'brand');
      case '3':
        return this.buildStatusBadge('Observaciones', 'warning');
      default:
        return this.buildStatusBadge('En registro', 'gray');
    }
  }

  activitiesStatusBadge(professor: ModalityProfessor): StatusBadge | null {
    if (professor.tieneDetalleActividades !== true) {
      return null;
    }

    return this.buildStatusBadge('Con actividades', 'brand');
  }

  resolveProfessorActions(professor: {tieneDetalleActividades?: boolean}): ProfessorMenuAction[] {
    const hasDetail = professor.tieneDetalleActividades === true;
    const activitiesAction: ProfessorMenuAction = {
      id: 'actividades',
      label: hasDetail ? 'Gestionar actividades' : 'Agregar actividades',
      icon: hasDetail ? 'pencil' : 'plus',
    };

    if (this.isPlantaSelected()) {
      return [activitiesAction];
    }

    return [
      {
        id: 'detalle',
        label: 'Ver detalle preasignación',
        icon: 'userCircle',
      },
      activitiesAction,
      {
        id: 'eliminar',
        label: 'Eliminar',
        icon: 'delete',
        className: 'text-error-600 dark:text-error-400',
      },
    ];
  }

  resolveProfessorName(professor: ModalityProfessor): string {
    if (professor.idPersonaGeneral == null) {
      return NN_LABEL;
    }
    return professor.nombreCompleto?.trim() || NN_LABEL;
  }

  toggleProfessorMenu(menuKey: string): void {
    this.openMenuKey.update((current) =>
      current === menuKey ? null : menuKey,
    );
  }

  closeProfessorMenu(): void {
    this.openMenuKey.set(null);
  }

  onProfessorMenuAction(actionId: string, professor: ModalityProfessor,
  ): void {
    this.closeProfessorMenu();

    if (actionId === 'detalle') {
      this.openProfessorDetail(professor);
      return;
    }

    if (actionId === 'actividades') {
      this.openActivitiesModal(professor);
      return;
    }

    if (actionId === 'eliminar') {
      this.deleteModalityProfessor(professor.idCargaDocente);
    }
  }

  openActivitiesModal(professor: ModalityProfessor): void {
    const coordination = this.coordination();
    const modality =
      coordination.modalidadesContratacion.find(
        (item) => item.id === professor.idModalidadContratacion,
      ) ?? this.selectedModalityForModals();

    this.activitiesCoordination.set(coordination);
    this.activitiesContractModality.set(modality);
    this.activitiesProfessor.set(professor);
    this.isActivitiesModalOpen.set(true);
  }

  closeActivitiesModal(): void {
    this.isActivitiesModalOpen.set(false);
    this.activitiesProfessor.set(null);
    this.activitiesCoordination.set(null);
    this.activitiesContractModality.set(null);
  }

  onActivitiesSaved(): void {
    this.modalityProfessorsResource.reload();
    this.careerProfessorsResource.reload();
  }

  private openProfessorDetail(professor: ModalityProfessor): void {
    this.editingModalityProfessor.set(professor);
    this.professorModalMode.set('edit');
    this.isProfessorAddModalOpen.set(true);
  }

  private deleteModalityProfessor(idCargaDocente: number): void {
    this.coordinationService
      .deleteProfessor(idCargaDocente)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.modalityProfessorsResource.reload();
        this.careerProfessorsResource.reload();
      });
  }

  private resolveActivitiesContext(
    carga: NonNullable<ProfessorSearchResult['cargaDocente']>,
  ): Observable<{
    coordination: CoordinationItem;
    modality: CoordinationContractModality;
  }> {
    return this.findCoordinationForCarga(carga).pipe(
      map((coordination) => ({
        coordination,
        modality: resolveModalityFromCarga(coordination, carga),
      })),
    );
  }

  private findCoordinationForCarga(
    carga: ProfessorCargaDocenteSummary,
  ): Observable<CoordinationItem> {
    const current = this.coordination();
    const idCoordinacion = carga.idCoordinacion;

    if (idCoordinacion === current.id) {
      return of(current);
    }

    if (carga.idConvocatoria != null) {
      return this.coordinationService
        .getCoordinations(carga.idConvocatoria)
        .pipe(
          switchMap((items) => {
            const match = this.findCoordinationInList(
              items,
              idCoordinacion,
            );
            if (match) {
              return of(match);
            }
            return this.findCoordinationFallback(idCoordinacion, current);
          }),
        );
    }

    return this.findCoordinationFallback(idCoordinacion, current);
  }

  private findCoordinationFallback(
    idCoordinacion: number,
    current: CoordinationItem,
  ): Observable<CoordinationItem> {
    const catalogMatch = this.findCoordinationInList(
      this.coordinationsCatalog(),
      idCoordinacion,
    );

    if (catalogMatch) {
      return of(catalogMatch);
    }

    const idConvocatoria = current.idConvocatoria;
    const scoped$ =
      idConvocatoria != null
        ? this.coordinationService.getCoordinations(idConvocatoria)
        : of([] as CoordinationItem[]);

    return scoped$.pipe(
      switchMap((scopedItems) => {
        const scopedMatch = this.findCoordinationInList(
          scopedItems,
          idCoordinacion,
        );
        if (scopedMatch) {
          return of(scopedMatch);
        }

        return this.coordinationService.getCoordinations().pipe(
          map(
            (allItems) =>
              this.findCoordinationInList(allItems, idCoordinacion) ??
              current,
          ),
        );
      }),
    );
  }

  private findCoordinationInList(
    items: CoordinationItem[],
    idCoordinacion: number,
  ): CoordinationItem | undefined {
    return items.find((item) => item.id === idCoordinacion);
  }
}
