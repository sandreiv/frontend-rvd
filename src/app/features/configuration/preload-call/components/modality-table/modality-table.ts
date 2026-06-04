import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import {
  DataTableActionEvent,
  DataTableColumn,
  DataTableRowAction,
  DataTableToolbarActionEvent,
} from '../../../../../shared/ui/data-table/table.types';
import { ModalityFormItem } from '../../model/preload-call.model';

@Component({
  selector: 'app-modality-table',
  imports: [DataTable],
  templateUrl: './modality-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalityTable {
  rows = input<ModalityFormItem[]>([]);
  readonly = input(false);

  addModality = output<void>();
  deleteModality = output<ModalityFormItem>();

  readonly rowIdentity = (row: ModalityFormItem): string => row.id;

  readonly columns: DataTableColumn<ModalityFormItem>[] = [
    {
      id: 'tipoModalidadLabel',
      header: 'Tipo modalidad',
      cell: (row) => row.tipoModalidadLabel || '-',
      formatAsSentence: true,
    },
    {
      id: 'diasVacaciones',
      header: 'Días vacaciones',
      cell: (row) =>
        row.diasVacaciones != null ? String(row.diasVacaciones) : '-',
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
  ];

  readonly rowActions: DataTableRowAction<ModalityFormItem>[] = [
    {
      id: 'delete',
      label: 'Eliminar',
      className: 'text-error-600 border-error-300 hover:bg-error-50 text-red-500',
      icon: 'delete',
    },
  ];

  onRowAction(event: DataTableActionEvent<ModalityFormItem>): void {
    if (event.actionId === 'delete') {
      this.deleteModality.emit(event.row);
    }
  }

  onToolbarAction(event: DataTableToolbarActionEvent<ModalityFormItem>): void {
    if (event.actionId === 'add') {
      this.addModality.emit();
    }
  }
}
