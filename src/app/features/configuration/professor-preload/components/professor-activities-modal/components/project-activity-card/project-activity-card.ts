import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Checkbox } from '../../../../../../../shared/components/form/input/checkbox';
import { Button } from '../../../../../../../shared/ui/button/button';
import { TipoActividad } from '../../../../model/professor-activities.model';
import { ProfessorProjectRow } from '../../../../model/professor-projects.model';

@Component({
  selector: 'app-project-activity-card',
  imports: [Checkbox, Button],
  templateUrl: './project-activity-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectActivityCard {
  tipoActividad = input<TipoActividad | null>(null);
  projectRows = input<ProfessorProjectRow[]>([]);
  associatedRows = input<ProfessorProjectRow[]>([]);
  isLoading = input(false);

  associatedRowsChange = output<ProfessorProjectRow[]>();

  private readonly selectedIds = signal<ReadonlySet<number>>(new Set());

  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  readonly associatedIds = computed(
    () =>
      new Set(
        this.associatedRows().map((row) => row.idPersonaProyecto),
      ),
  );

  isSelected(idPersonaProyecto: number): boolean {
    return this.selectedIds().has(idPersonaProyecto);
  }

  isAssociated(idPersonaProyecto: number): boolean {
    return this.associatedIds().has(idPersonaProyecto);
  }

  isCheckboxDisabled(row: ProfessorProjectRow): boolean {
    return (
      !row.esSeleccionable ||
      this.isAssociated(row.idPersonaProyecto)
    );
  }

  onSelectionChange(
    row: ProfessorProjectRow,
    checked: boolean,
  ): void {
    if (this.isCheckboxDisabled(row)) {
      return;
    }

    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(row.idPersonaProyecto);
      } else {
        next.delete(row.idPersonaProyecto);
      }
      return next;
    });
  }

  onAssociateSelected(): void {
    const selected = this.selectedIds();
    if (!selected.size) {
      return;
    }

    const associatedIds = this.associatedIds();
    const toAdd = this.projectRows().filter(
      (row) =>
        row.esSeleccionable &&
        selected.has(row.idPersonaProyecto) &&
        !associatedIds.has(row.idPersonaProyecto),
    );

    if (!toAdd.length) {
      this.selectedIds.set(new Set());
      return;
    }

    this.associatedRowsChange.emit([
      ...this.associatedRows(),
      ...toAdd,
    ]);
    this.selectedIds.set(new Set());
  }

  onDisassociate(idPersonaProyecto: number): void {
    this.associatedRowsChange.emit(
      this.associatedRows().filter(
        (row) => row.idPersonaProyecto !== idPersonaProyecto,
      ),
    );
  }

  rowPaddingClass(nivel: 0 | 1): string {
    return nivel === 1 ? 'pl-8' : '';
  }
}
