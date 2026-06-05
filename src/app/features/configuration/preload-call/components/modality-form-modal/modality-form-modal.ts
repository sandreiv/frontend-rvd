import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { merge } from 'rxjs';
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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  private readonly destroyRef = inject(DestroyRef);
  private semanasManuallyEdited = false;

  readonly isOpen = input(false);
  readonly modalityOptions = input<Option[]>([]);

  readonly close = output<void>();
  readonly saved = output<ModalityFormItem>();

  readonly form = this.fb.group({
    tipoModalidad: ['', Validators.required],
    diasVacaciones: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    semanas: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.form.reset();
        this.semanasManuallyEdited = false;
      }
    });

    merge(
      this.form.controls.fechaInicio.valueChanges,
      this.form.controls.fechaFin.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncSemanasFromDates());
  }

  onSemanasManualEdit(): void {
    this.semanasManuallyEdited = true;
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
    const semanasRaw = this.form.controls.semanas.value;
    const diasVacaciones =
      diasRaw === '' || diasRaw == null ? null : Number(diasRaw);
    const semanas =
      semanasRaw === '' || semanasRaw == null ? null : Number(semanasRaw);

    this.saved.emit({
      id: crypto.randomUUID(),
      tipoModalidad,
      tipoModalidadLabel: label,
      diasVacaciones,
      fechaInicio: this.form.controls.fechaInicio.value ?? '',
      fechaFin: this.form.controls.fechaFin.value ?? '',
      semanas,
    });
    this.close.emit();
  }

  private syncSemanasFromDates(): void {
    if (this.semanasManuallyEdited) {
      return;
    }

    const inicio = this.form.controls.fechaInicio.value ?? '';
    const fin = this.form.controls.fechaFin.value ?? '';
    const semanas = this.calculateWeeks(inicio, fin);

    this.form.controls.semanas.patchValue(
      semanas != null ? String(semanas) : '',
      { emitEvent: false },
    );
  }

  private calculateWeeks(fechaInicio: string, fechaFin: string): number | null {
    const inicio = fechaInicio.trim();
    const fin = fechaFin.trim();
    if (!inicio || !fin) {
      return null;
    }

    const start = new Date(`${inicio}T00:00:00`);
    const end = new Date(`${fin}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    if (end < start) {
      return null;
    }

    const diffDays =
      Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    const weeks = diffDays / 7;
    const fraction = weeks % 1;
    const whole = Math.floor(weeks);
    return fraction >= 0.5 ? whole + 1 : whole;
  }
}
