import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';

@Component({
  selector: 'app-hiring',
  imports: [SectionFrame],
  templateUrl: './hiring.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hiring {}
