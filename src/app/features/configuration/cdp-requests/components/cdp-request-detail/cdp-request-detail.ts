import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { Button } from '../../../../../shared/ui/button/button';

import { CoordinationItem } from '../../../professor-preload/model/coordination.model';

@Component({
  selector: 'app-cdp-request-detail',
  imports: [
    Button,
  ],
  templateUrl: './cdp-request-detail.html',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CdpRequestDetail {

  coordination =
    input.required<CoordinationItem>();

  back = output<void>();
}