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
import { forkJoin, map } from 'rxjs';
import { Button } from '../../../../../shared/ui/button/button';
import { Dropdown } from '../../../../../shared/ui/dropdown/dropdown/dropdown';
import { Item } from '../../../../../shared/ui/dropdown/item/item';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { TabBar } from '../../../../../shared/ui/tab-bar/tab-bar';
import {
  TabBarId,
  TabBarItem,
} from '../../../../../shared/ui/tab-bar/tab-bar.types';
import { CoordinationService } from '../../data/coordination.service';
import {
  CareerProfessor,
  CoordinationItem,
  ModalityProfessor,
} from '../../model/coordination.model';
import { ProfessorAddModal } from '../professor-add-modal/professor-add-modal';
import { ProfessorActivitiesModal } from '../professor-activities-modal/professor-activities-modal';

export const PLANTA_MODALITY_ID = 'planta';

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

  readonly selectedContractModalityId = signal<TabBarId | null>(null);
  readonly isProfessorAddModalOpen = signal(false);
  readonly isActivitiesModalOpen = signal(false);
  readonly professorModalMode = signal<'create' | 'edit'>('create');
  readonly editingModalityProfessor = signal<ModalityProfessor | null>(null);
  readonly activitiesProfessor = signal<ModalityProfessor | null>(null);
  readonly openMenuKey = signal<string | null>(null);

  readonly careerProfessorActions: ProfessorMenuAction[] = [
    { id: 'detalle', label: 'Ver detalle preasignación', icon: 'userCircle' },
    {
      id: 'eliminar',
      label: 'Eliminar',
      icon: 'delete',
      className: 'text-error-600 dark:text-error-400',
    },
  ];

  readonly careerProfessorsResource = rxResource({
    stream: () =>
      this.coordinationService.getCareerProfessors(this.coordination().id),
    defaultValue: [] as CareerProfessor[],
  });

  readonly careerProfessors = computed(() =>
    this.careerProfessorsResource.value(),
  );

  readonly hasCareerProfessors = computed(
    () => this.careerProfessors().length > 0,
  );

  readonly contractModalities = computed(
    () => this.coordination().modalidadesContratacion,
  );

  readonly modalityProfessorsResource = rxResource({
    params: () => {
      const modalities = this.contractModalities();
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
    if (selectedId == null || selectedId === PLANTA_MODALITY_ID) {
      return [];
    }
    return this.modalityProfessorsMap()[Number(selectedId)] ?? [];
  });

  readonly modalityProfessorRows = computed<ModalityProfessorRow[]>(() =>
    this.modalityProfessors().map((professor) => ({
      rowKey: `modalidad-${professor.idCargaDocente}`,
      menuKey: `modalidad-${professor.idCargaDocente}`,
      displayName: this.resolveProfessorName(professor),
      professor,
    })),
  );

  readonly modalityTabs = computed<TabBarItem[]>(() => {
    const professorsByModality = this.modalityProfessorsMap();
    const tabs: TabBarItem[] = this.contractModalities().map((modality) => {
      const professors = professorsByModality[modality.id] ?? [];
      const verified = professors.filter(
        (professor) => professor.estado === VERIFIED_MODALITY_STATE,
      ).length;
      return {
        id: modality.id,
        label: modality.nombre,
        badge: `${verified}/${professors.length}`,
      };
    });

    if (this.hasCareerProfessors()) {
      tabs.push({
        id: PLANTA_MODALITY_ID,
        label: 'Docentes de planta',
        badge: `${this.careerProfessors().length}`,
      });
    }

    return tabs;
  });

  readonly hasAnyModality = computed(() => this.modalityTabs().length > 0);

  readonly isPlantaSelected = computed(
    () => this.selectedContractModalityId() === PLANTA_MODALITY_ID,
  );

  readonly selectedContractModality = computed(() => {
    const selectedId = this.selectedContractModalityId();
    return (
      this.contractModalities().find((item) => item.id === selectedId) ?? null
    );
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
  }

  private toModalityProfessorsMap(
    entries: { id: number; professors: ModalityProfessor[] }[],
  ): Record<number, ModalityProfessor[]> {
    return entries.reduce<Record<number, ModalityProfessor[]>>(
      (accumulator, entry) => {
        accumulator[entry.id] = entry.professors;
        return accumulator;
      },
      {},
    );
  }

  resolveManagementStatus(
    professor: CareerProfessor,
  ): ProfessorManagementStatus {
    void professor;
    return 'sin-asignar';
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

  careerStatusBadge(professor: CareerProfessor): StatusBadge {
    return professor.estado === '1'
      ? this.buildStatusBadge('Activo', 'success')
      : this.buildStatusBadge('Inactivo', 'gray');
  }

  managementStatusBadge(professor: CareerProfessor): StatusBadge {
    switch (this.resolveManagementStatus(professor)) {
      case 'completo':
        return this.buildStatusBadge('Completo', 'success');
      case 'incompleto':
        return this.buildStatusBadge('Incompleto', 'warning');
      default:
        return this.buildStatusBadge('Sin asignar', 'gray', UNASSIGNED_DOT);
    }
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

  activitiesStatusBadge(
    professor: ModalityProfessor,
  ): StatusBadge | null {
    if (professor.tieneDetalleActividades !== true) {
      return null;
    }

    return this.buildStatusBadge('Con actividades', 'brand');
  }

  resolveModalityProfessorActions(
    professor: ModalityProfessor,
  ): ProfessorMenuAction[] {
    const hasDetail = professor.tieneDetalleActividades === true;

    return [
      {
        id: 'detalle',
        label: 'Ver detalle preasignación',
        icon: 'userCircle',
      },
      {
        id: 'actividades',
        label: hasDetail
          ? 'Gestionar actividades'
          : 'Agregar actividades',
        icon: hasDetail ? 'pencil' : 'plus',
      },
      {
        id: 'eliminar',
        label: 'Eliminar',
        icon: 'delete',
        className: 'text-error-600 dark:text-error-400',
      },
    ];
  }

  resolveProfessorName(
    professor: CareerProfessor | ModalityProfessor,
  ): string {
    if (professor.idPersonaGeneral == null) {
      return NN_LABEL;
    }
    return professor.nombreCompleto?.trim() || NN_LABEL;
  }

  careerMenuKey(professor: CareerProfessor): string {
    return `planta-${professor.idPersonaGeneral}`;
  }

  toggleProfessorMenu(menuKey: string): void {
    this.openMenuKey.update((current) =>
      current === menuKey ? null : menuKey,
    );
  }

  closeProfessorMenu(): void {
    this.openMenuKey.set(null);
  }

  onProfessorAction(actionId: string, professor: CareerProfessor): void {
    this.closeProfessorMenu();
    void professor;
    void actionId;
  }

  onModalityProfessorAction(
    actionId: string,
    professor: ModalityProfessor,
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
    this.activitiesProfessor.set(professor);
    this.isActivitiesModalOpen.set(true);
  }

  closeActivitiesModal(): void {
    this.isActivitiesModalOpen.set(false);
    this.activitiesProfessor.set(null);
  }

  onActivitiesSaved(): void {
    this.modalityProfessorsResource.reload();
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
      .subscribe(() => this.modalityProfessorsResource.reload());
  }
}
