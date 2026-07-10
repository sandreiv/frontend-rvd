import {
  ChangeDetectionStrategy,
  Component,
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
}
