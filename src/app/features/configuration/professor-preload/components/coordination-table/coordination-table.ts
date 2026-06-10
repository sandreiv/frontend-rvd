import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataTable } from "../../../../../shared/ui/data-table/data-table";

@Component({
  selector: 'app-coordination-table',
  imports: [DataTable],
  templateUrl: './coordination-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationTable {
  
}
