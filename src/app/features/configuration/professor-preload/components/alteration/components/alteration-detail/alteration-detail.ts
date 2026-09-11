import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AlterationContractModalityDetail } from '../alteration-contract-modality-detail/alteration-contract-modality-detail';
import { CoordinationItem } from '../../../../model/coordination.model';
import { Button } from '../../../../../../../shared/ui/button/button';
import { Icon } from "../../../../../../../shared/ui/icon/icon";

@Component({
  selector: 'app-alteration-detail',
  imports: [AlterationContractModalityDetail, Button, Icon],
  templateUrl: './alteration-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationDetail {
  
  readonly coordination = input.required<CoordinationItem>();
  readonly back = output<void>();

  openNewsModal(): void {
    
  }
}
