import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnChanges,
  Output,
  SimpleChanges,
  input,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/components/form/input/checkbox';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import {
  ACTIVITY_TYPE_CODE_OPTIONS,
  ActivityTypeFormData,
  ActivityTypeItem,
} from '../../model/activity-types.model';

type ActivityTypeFormGroup = FormGroup<{
  nombre: FormControl<string>;
  descripcion: FormControl<string>;
  codigo: FormControl<string>;
  minimoHoras: FormControl<number | null>;
  maximoHoras: FormControl<number | null>;
  estado: FormControl<boolean>;
}>;

const hoursRangeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const minimo = Number(control.get('minimoHoras')?.value);
  const maximo = Number(control.get('maximoHoras')?.value);

  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
    return null;
  }

  return maximo <= minimo ? { hoursRange: true } : null;
};

@Component({
  selector: 'app-activity-type-form',
  imports: [ReactiveFormsModule, Label, InputField, Select, Checkbox, Button],
  templateUrl: './activity-type-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityTypeForm implements OnChanges {
  activityType = input<ActivityTypeItem | null>(null);
  isSaving = input(false);
  title = input('Nuevo tipo de actividad');
  editTitle = input('Editar tipo de actividad');
  description = input('Registra actividades padre. El orden se calculará automáticamente.');

  @Output() cancel = new EventEmitter<void>();
  @Output() saveActivityType = new EventEmitter<ActivityTypeFormData>();

  readonly codeOptions: Option[] = ACTIVITY_TYPE_CODE_OPTIONS;

  readonly form: ActivityTypeFormGroup = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      descripcion: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      codigo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      minimoHoras: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      maximoHoras: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      estado: new FormControl(true, {
        nonNullable: true,
      }),
    },
    { validators: [hoursRangeValidator] },
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activityType']) {
      this.patchForm();
    }
  }

  get hoursRangeInvalid(): boolean {
    return (
      this.form.hasError('hoursRange') &&
      (this.form.controls.maximoHoras.touched ||
        this.form.controls.maximoHoras.dirty)
    );
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    this.saveActivityType.emit({
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim(),
      codigo: raw.codigo,
      minimoHoras: Number(raw.minimoHoras),
      maximoHoras: Number(raw.maximoHoras),
      estado: raw.estado ? '1' : '0',
    });
  }

  private patchForm(): void {
    const item = this.activityType();

    this.form.reset({
      nombre: item?.nombre ?? '',
      descripcion: item?.descripcion ?? '',
      codigo: item?.codigo ?? '',
      minimoHoras: item?.minimoHoras != null ? Number(item.minimoHoras) : null,
      maximoHoras: item?.maximoHoras != null ? Number(item.maximoHoras) : null,
      estado: this.isActive(item?.estado),
    });
  }

  private isActive(value: ActivityTypeItem['estado'] | undefined): boolean {
    if (value == null || value === '') {
      return true;
    }

    const normalized = String(value).trim().toUpperCase();

    return normalized === '1' || normalized === 'ACTIVO' || normalized === 'A';
  }
}