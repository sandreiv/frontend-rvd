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
  CoordinationAssociationFormData,
  CoordinationAssociationItem,
  SubjectCatalogOptionItem,
} from '../../model/coordination-administration.model';

type AssociationForm = FormGroup<{
  idCoordinacion: FormControl<string>;
  usarPrograma: FormControl<boolean>;
  idPrograma: FormControl<string>;
  usarMateria: FormControl<boolean>;
  codigoMateria: FormControl<string>;
  idCentroCosto: FormControl<string>;
  estado: FormControl<boolean>;
}>;

@Component({
  selector: 'app-association-coordination-form',
  imports: [ReactiveFormsModule, Label, Select, Checkbox, Button],
  templateUrl: './association-coordination-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssociationCoordinationForm implements OnChanges {
  association = input<CoordinationAssociationItem | null>(null);
  selectedCoordinationId = input<number | null>(null);
  coordinations = input<CatalogOptionItem[]>([]);
  programs = input<CatalogOptionItem[]>([]);
  subjects = input<SubjectCatalogOptionItem[]>([]);
  costCenters = input<CatalogOptionItem[]>([]);
  isSaving = input(false);

  @Output() cancel = new EventEmitter<void>();
  @Output() saveAssociation = new EventEmitter<CoordinationAssociationFormData>();

  readonly form: AssociationForm = new FormGroup({
    idCoordinacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    usarPrograma: new FormControl(false, { nonNullable: true }),
    idPrograma: new FormControl('', { nonNullable: true }),
    usarMateria: new FormControl(false, { nonNullable: true }),
    codigoMateria: new FormControl('', { nonNullable: true }),
    idCentroCosto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    estado: new FormControl(true, { nonNullable: true }),
  });

  get coordinationOptions(): Option[] {
    return this.toOptions(this.coordinations());
  }

  get programOptions(): Option[] {
    return this.toOptions(this.programs());
  }

  get subjectOptions(): Option[] {
    return this.subjects().map((item) => ({
      value: item.codigoMateria,
      label: item.label,
    }));
  }

  get costCenterOptions(): Option[] {
   return this.toOptions(this.costCenters());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['association'] || changes['selectedCoordinationId']) {
      this.patchForm();
    }
  }

  onProgramCheckChange(checked: boolean): void {
    this.form.controls.usarPrograma.setValue(checked);

    if (checked) {
      this.form.controls.usarMateria.setValue(false);
      this.form.controls.codigoMateria.setValue('');
      return;
    }

    this.form.controls.idPrograma.setValue('');
  }

  onSubjectCheckChange(checked: boolean): void {
    this.form.controls.usarMateria.setValue(checked);

    if (checked) {
      this.form.controls.usarPrograma.setValue(false);
      this.form.controls.idPrograma.setValue('');
      return;
    }

    this.form.controls.codigoMateria.setValue('');
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.saveAssociation.emit({
      id: this.association()?.id ?? null,
      idCoordinacion: Number(raw.idCoordinacion),
      idPrograma: raw.usarPrograma && raw.idPrograma ? Number(raw.idPrograma) : null,
      codigoMateria: raw.usarMateria && raw.codigoMateria ? raw.codigoMateria : null,
      idCentroCosto: Number(raw.idCentroCosto),
      estado: raw.estado ? '1' : '0',
    });
  }

  private patchForm(): void {
    const item = this.association();
    const idCoordinacion = item?.idCoordinacion ?? this.selectedCoordinationId();

    this.form.reset({
      idCoordinacion: idCoordinacion != null ? String(idCoordinacion) : '',
      usarPrograma: item?.idPrograma != null,
      idPrograma: item?.idPrograma != null ? String(item.idPrograma) : '',
      usarMateria: !!item?.codigoMateria,
      codigoMateria: item?.codigoMateria ?? '',
      idCentroCosto: item?.idCentroCosto != null ? String(item.idCentroCosto) : '',
      estado: this.isActive(item?.estado),
    });

    this.form.controls.idCoordinacion.disable({ emitEvent: false });
  }

  private toOptions(items: CatalogOptionItem[], includeCode = false): Option[] {
    return items.map((item) => ({
      value: String(item.id),
      label: includeCode && item.codigo ? `${item.codigo} - ${item.label}` : item.label,
    }));
  }

  private isActive(value: CoordinationAssociationItem['estado'] | undefined): boolean {
    if (value == null || value === '') {
      return true;
    }

    const normalized = String(value).trim().toUpperCase();

    return normalized === '1' || normalized === 'ACTIVO' || normalized === 'A';
  }
}