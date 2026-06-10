import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { SectionFrame } from "../../../../../shared/ui/section-frame/section-frame";
import { CoordinationTable } from "../../components/coordination-table/coordination-table";


@Component({
  selector: 'app-professor-preload',
  imports: [Icon, SectionFrame, CoordinationTable],
  templateUrl: './professor-preload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorPreload {

}
