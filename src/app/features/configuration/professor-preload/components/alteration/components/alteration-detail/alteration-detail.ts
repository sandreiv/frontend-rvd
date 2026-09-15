import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { AlterationContractModalityDetail } from '../alteration-contract-modality-detail/alteration-contract-modality-detail';
import { CoordinationItem } from '../../../../model/coordination.model';
import { formatCurrencyCOP } from '../../../../model/professor-form.config';
import { Button } from '../../../../../../../shared/ui/button/button';

@Component({
  selector: 'app-alteration-detail',
  imports: [AlterationContractModalityDetail, Button],
  templateUrl: './alteration-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationDetail {
  readonly coordination = input.required<CoordinationItem>();
  readonly back = output<void>();

  readonly valorCarga = computed(
    () => formatCurrencyCOP(this.coordination().valor) || '-',
  );

  readonly valorAutorizado = computed(
    () =>
      formatCurrencyCOP(this.coordination().valorAutorizado) || '-',
  );
}
