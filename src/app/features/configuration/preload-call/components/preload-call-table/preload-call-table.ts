import { ChangeDetectionStrategy, Component, EventEmitter, input, Input, Output } from '@angular/core';
import { DataTable } from "../../../../../shared/ui/data-table/data-table";
import { DataTableActionEvent, DataTableColumn, DataTableInlineIcon, DataTableRowAction, DataTableSearchEvent, DataTableToolbarActionEvent } from '../../../../../shared/ui/data-table/table.types';
import { PreloadCallItem } from '../../model/preload-call.model';

@Component({
  selector: 'app-preload-call-table',
  imports: [DataTable],
  templateUrl: './preload-call-table.html',
})
export class PreloadCallTable {
  preloadCalls = input<PreloadCallItem[]>([]);

  @Input() selectedPreloadCallIds: string[] = [];

  @Output() addPreloadCall = new EventEmitter<void>();
  @Output() editPreloadCall = new EventEmitter<PreloadCallItem>();
  @Output() deletePreloadCall = new EventEmitter<PreloadCallItem>();
  @Output() refreshPreloadCall = new EventEmitter<void>();
  @Output() deleteAllPreloadCall = new EventEmitter<string[]>();
  @Output() selectedPreloadCallIdsChange = new EventEmitter<string[]>();

  readonly rowIdentity = (row: PreloadCallItem, index: number): string =>
    row.id != null ? String(row.id) : `${row.descripcion}-${index}`;

  readonly columns: DataTableColumn<PreloadCallItem>[] = [
    {
      id: 'descripcion',
      header: 'Descripción',
      cell: (row) => row.descripcion || '-',
      formatAsSentence: true,
    },
    {
      id: 'fechaInicio',
      header: 'Fecha inicio',
      cell: (row) => row.fechaInicio || '-',
      formatAsDate: true,
    },
    {
      id: 'fechaFin',
      header: 'Fecha fin',
      cell: (row) => row.fechaFin || '-',
      formatAsDate: true,
    },
    {
      id: 'nombreCompleto',
      header: 'Aprobado por',
      cell: (row) => row.nombreCompleto || '-',
    },
  ];

  readonly rowActions: DataTableRowAction<PreloadCallItem>[] = [
    {
      id: 'edit',
      label: 'Editar',
      icon: 'pencil',
    },
    {
      id: 'delete',
      label: 'Eliminar',
      className: 'text-error-600 border-error-300 hover:bg-error-50 text-red-500',
      icon: 'delete',
    },
  ];

  onTableAction(event: DataTableActionEvent<PreloadCallItem>): void {
    if (event.actionId === 'edit') {
      console.log('Editando registro:', event);
      this.editPreloadCall.emit(event.row);
      return;
    }

    if (event.actionId === 'delete') {
      console.log('Eliminando registro:', event);
      this.deletePreloadCall.emit(event.row);
    }
  }

  onToolbarAction(event: DataTableToolbarActionEvent<PreloadCallItem>): void {
    if (event.actionId === 'refresh') {
      this.refreshPreloadCall.emit();
      return;
    }

    if (event.actionId === 'deleteAll') {
      this.deleteAllPreloadCall.emit(event.selectedRowKeys.map(String));
      return;
    }

    if (event.actionId === 'add') {
      this.addPreloadCall.emit();
    }
  }

  onSearchRecords(event: DataTableSearchEvent<PreloadCallItem>): void {
    //this.searchRecords.emit({ term: event.searchTerm, rows: event.rows });
  }

  onSelectedPreloadCallIdsChange(keys: Array<string | number>): void {
    this.selectedPreloadCallIdsChange.emit(keys.map(String));
  }
}
