import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from '../../../../../../shared/ui/button/button';
import { Icon } from '../../../../../../shared/ui/icon/icon';
import { CoordinationItem } from '../../../model/coordination.model';
import { CoordinationPreloadCallModal } from '../coordination-preload-call-modal/coordination-preload-call-modal';

type ProfessorAssignmentStatus = 'incomplete' | 'complete' | 'unassigned';

interface ProfessorPreloadTeacher {
  id: string;
  name: string;
  status: ProfessorAssignmentStatus;
  assignedHours: number;
  totalHours: number;
}

const PROFESSOR_PRELOAD_MOCK: ProfessorPreloadTeacher[] = [
  {
    id: '1',
    name: 'María Fernanda Gómez',
    status: 'incomplete',
    assignedHours: 9,
    totalHours: 12,
  },
  {
    id: '2',
    name: 'Andrés Felipe Ramírez',
    status: 'incomplete',
    assignedHours: 4,
    totalHours: 12,
  },
  {
    id: '3',
    name: 'Laura Castañeda',
    status: 'unassigned',
    assignedHours: 0,
    totalHours: 12,
  },
  {
    id: '4',
    name: 'Carlos Eduardo Vargas',
    status: 'complete',
    assignedHours: 12,
    totalHours: 12,
  },
  {
    id: '5',
    name: 'Diana Marcela Ortiz',
    status: 'complete',
    assignedHours: 12,
    totalHours: 12,
  },
  {
    id: '6',
    name: 'Jorge Iván Mejía',
    status: 'incomplete',
    assignedHours: 6,
    totalHours: 12,
  },
  {
    id: '7',
    name: 'Paola Andrea Suárez',
    status: 'unassigned',
    assignedHours: 0,
    totalHours: 12,
  },
  {
    id: '8',
    name: 'Ricardo José Pineda',
    status: 'incomplete',
    assignedHours: 8,
    totalHours: 12,
  },
];

@Component({
  selector: 'app-coordination-detail',
  imports: [Button, Icon, CoordinationPreloadCallModal],
  templateUrl: './coordination-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationDetail {
  coordination = input.required<CoordinationItem>();

  back = output<void>();
  coordinationUpdated = output<CoordinationItem>();

  readonly isAssignModalOpen = signal(false);
  readonly teachers = signal(PROFESSOR_PRELOAD_MOCK);

  readonly categorySummary = {
    assignedCount: 6,
    totalCount: 8,
    totalHours: 51,
  };

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

  statusLabel(status: ProfessorAssignmentStatus): string {
    const labels: Record<ProfessorAssignmentStatus, string> = {
      incomplete: 'Incompleto',
      complete: 'Completo',
      unassigned: 'Sin asignar',
    };
    return labels[status];
  }

  onAddAssignment(_teacher: ProfessorPreloadTeacher): void {
    // Comportamiento pendiente de definir
  }
}
