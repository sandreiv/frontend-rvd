import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { CoordinationItem } from '../../model/coordination.model';
import { CoordinationPreloadCallModal } from '../coordination-preload-call-modal/coordination-preload-call-modal';
import { ContractModalityDetail } from '../contract-modality-detail/contract-modality-detail';
import { TotalCoordination } from '../total-coordination/total-coordination';

@Component({
  selector: 'app-coordination-detail',
  imports: [
    Button,
    Icon,
    CoordinationPreloadCallModal,
    ContractModalityDetail,
    TotalCoordination,
  ],
  templateUrl: './coordination-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationDetail {
  coordination = input.required<CoordinationItem>();
  coordinationsCatalog = input<CoordinationItem[]>([]);

  back = output<void>();
  coordinationUpdated = output<CoordinationItem>();

  readonly isAssignModalOpen = signal(false);
  readonly hasLoadedProfessors = signal(false);
  readonly totalRefreshKey = signal(0);

  readonly canChangePreloadCall = computed(() => !this.hasLoadedProfessors());

  constructor() {
    effect(() => {
      this.coordination().id;
      this.hasLoadedProfessors.set(false);
      this.totalRefreshKey.set(0);
    });
  }

  openAssignModal(): void {
    if (!this.canChangePreloadCall()) {
      return;
    }

    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
  }

  onPreloadCallAssigned(updated: CoordinationItem): void {
    this.coordinationUpdated.emit(updated);
    this.closeAssignModal();
  }

  onHasProfessorsChange(hasProfessors: boolean): void {
    this.hasLoadedProfessors.set(hasProfessors);
  }

  onPreloadChanged(): void {
    this.totalRefreshKey.update((value) => value + 1);
  }

}