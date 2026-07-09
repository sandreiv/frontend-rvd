import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnChanges,
  Output,
  SimpleChanges,
  input,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/components/form/input/checkbox';
import { Label } from '../../../../../shared/components/form/label/label';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import {
  CatalogOptionItem,
  PersonCoordinationFormData,
  PersonCoordinationItem,
} from '../../model/coordination-administration.model';

type PersonCoordinationFormGroup = FormGroup<{
  idPersonaGeneral: FormControl<string>;
  idCoordinacion: FormControl<string>;
  estado: FormControl<boolean>;
}>;

@Component({
  selector: 'app-person-coordination-form',
  imports: [ReactiveFormsModule, Label, Select, Checkbox, Button],
  templateUrl: './person-coordination-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonCoordinationForm implements OnChanges {
  assignment = input<PersonCoordinationItem | null>(null);
  selectedCoordinationId = input<number | null>(null);
  people = input<CatalogOptionItem[]>([]);
  coordinations = input<CatalogOptionItem[]>([]);

  title = input('Nueva persona');
  editTitle = input('Editar persona');
  description = input('Selecciona la persona, la coordinación y el estado.');
  personLabel = input('Persona');
  personPlaceholder = input('Seleccione la persona');
  statusTitle = input('Estado de la persona');
  statusDescription = input('Define si esta relación quedará activa para su uso en el sistema.');

  isSaving = input(false);

  @Output() cancel = new EventEmitter<void>();
  @Output() saveAssignment = new EventEmitter<PersonCoordinationFormData>();

  readonly form: PersonCoordinationFormGroup = new FormGroup({
    idPersonaGeneral: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    idCoordinacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    estado: new FormControl(true, { nonNullable: true }),
  });

  get peopleOptions(): Option[] {
    return this.toOptions(this.people());
  }

  get coordinationOptions(): Option[] {
    return this.toOptions(this.coordinations());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignment'] || changes['selectedCoordinationId']) {
      this.patchForm();
    }
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.saveAssignment.emit({
      idPersonaGeneral: Number(raw.idPersonaGeneral),
      idCoordinacion: Number(raw.idCoordinacion),
      estado: raw.estado ? '1' : '0',
    });
  }

  private patchForm(): void {
    const item = this.assignment();
    const idCoordinacion = item?.idCoordinacion ?? this.selectedCoordinationId();

    this.form.reset({
      idPersonaGeneral: item?.idPersonaGeneral != null ? String(item.idPersonaGeneral) : '',
      idCoordinacion: idCoordinacion != null ? String(idCoordinacion) : '',
      estado: this.isActive(item?.estado),
    });

    this.form.controls.idCoordinacion.disable({ emitEvent: false });
  }

  private toOptions(items: CatalogOptionItem[]): Option[] {
    return items.map((item) => ({
      value: String(item.id),
      label: item.label,
    }));
  }

  private isActive(value: PersonCoordinationItem['estado'] | undefined): boolean {
    if (value == null || value === '') {
      return true;
    }

    const normalized = String(value).trim().toUpperCase();

    return normalized === '1' || normalized === 'ACTIVO' || normalized === 'A';
  }
}