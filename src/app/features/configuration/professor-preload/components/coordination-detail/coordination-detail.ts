import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
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
} from '../../model/coordination.model';
import { CoordinationPreloadCallModal } from '../coordination-preload-call-modal/coordination-preload-call-modal';
import { ProfessorAddModal } from "../professor-add-modal/professor-add-modal";

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

@Component({
  selector: 'app-coordination-detail',
  imports: [
    Button,
    Dropdown,
    Item,
    Icon,
    TabBar,
    CoordinationPreloadCallModal,
    ProfessorAddModal,
  ],
  templateUrl: './coordination-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationDetail {
  private readonly coordinationService = inject(CoordinationService);

  coordination = input.required<CoordinationItem>();

  back = output<void>();
  coordinationUpdated = output<CoordinationItem>();

  readonly isAssignModalOpen = signal(false);
  readonly selectedContractModalityId = signal<TabBarId | null>(null);
  readonly isProfessorAddModalOpen = signal(false);
  readonly openMenuProfessorId = signal<number | null>(null);

  readonly professorActions: ProfessorMenuAction[] = [
    { id: 'detalle', label: 'Ver detalle preasignación', icon: 'userCircle' },
    { id: 'actividades', label: 'Agregar actividades', icon: 'plus' },
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

  readonly hasContractModalities = computed(
    () => this.contractModalities().length > 0,
  );

  readonly modalityTabs = computed<TabBarItem[]>(() => {
    const tabs: TabBarItem[] = this.contractModalities().map((modality) => ({
      id: modality.id,
      label: modality.nombre,
      badge: '0/0',
    }));

    if (this.hasCareerProfessors()) {
      tabs.push({ id: PLANTA_MODALITY_ID, label: 'Docentes de planta', badge: '0/0' });
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
      this.contractModalities().find((item) => item.id === selectedId) ??
      null
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

  openAssignModal(): void {
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
  }

  onPreloadCallAssigned(updated: CoordinationItem): void {
    this.coordinationUpdated.emit(updated);
    this.closeAssignModal();
  }

  onContractModalityChange(modalityId: TabBarId | null): void {
    this.selectedContractModalityId.set(modalityId);
  }

  onProfessorAddModalOpen(): void {
    this.isProfessorAddModalOpen.set(true);
  }

  closeProfessorAddModal(): void {
    this.isProfessorAddModalOpen.set(false);
  }

  resolveManagementStatus(
    professor: CareerProfessor,
  ): ProfessorManagementStatus {
    void professor;
    return 'sin-asignar';
  }

  toggleProfessorMenu(professorId: number): void {
    this.openMenuProfessorId.update((current) =>
      current === professorId ? null : professorId,
    );
  }

  closeProfessorMenu(): void {
    this.openMenuProfessorId.set(null);
  }

  onProfessorAction(actionId: string, professor: CareerProfessor): void {
    this.closeProfessorMenu();
    void actionId;
    void professor;
  }
}
