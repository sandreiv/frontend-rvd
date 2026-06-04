import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import {
  Option,
  Select,
} from '../../../../../shared/components/form/select/select';
import { Button } from '../../../../../shared/ui/button/button';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { ModalityFormItem } from '../../model/preload-call.model';

@Component({
  selector: 'app-modality-form-modal',
  imports: [
    ReactiveFormsModule,
    Modal,
    Label,
    Select,
    InputField,
    DatePicker,
    Button,
  ],
  templateUrl: './modality-form-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalityFormModal {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input(false);
  readonly modalityOptions = input<Option[]>([]);

  readonly close = output<void>();
  readonly saved = output<ModalityFormItem>();

  readonly form = this.fb.group({
    tipoModalidad: ['', Validators.required],
    diasVacaciones: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.form.reset();
      }
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tipoModalidad = this.form.controls.tipoModalidad.value ?? '';
    const label =
      this.modalityOptions().find((opt) => opt.value === tipoModalidad)
        ?.label ?? tipoModalidad;
    const diasRaw = this.form.controls.diasVacaciones.value;
    const diasVacaciones =
      diasRaw === '' || diasRaw == null ? null : Number(diasRaw);

    this.saved.emit({
      id: crypto.randomUUID(),
      tipoModalidad,
      tipoModalidadLabel: label,
      diasVacaciones,
      fechaInicio: this.form.controls.fechaInicio.value ?? '',
      fechaFin: this.form.controls.fechaFin.value ?? '',
    });
    this.close.emit();
  }
}
