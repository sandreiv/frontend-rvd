import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { merge } from 'rxjs';
import { DateRangePicker } from '../../../../../shared/components/form/date-range-picker/date-range-picker';
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
    DateRangePicker,
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
  readonly editingItem = input<ModalityFormItem | null>(null);

  readonly close = output<void>();
  readonly saved = output<ModalityFormItem>();

  readonly isEditMode = computed(() => this.editingItem() != null);
  readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Editar modalidad' : 'Agregar modalidad',
  );
  readonly saveButtonLabel = computed(() =>
    this.isEditMode() ? 'Actualizar' : 'Agregar',
  );

  readonly isPlantSelected = signal(false);

  readonly form = this.fb.group({
    tipoModalidad: ['', Validators.required],
    diasVacaciones: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    semanas: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const item = this.editingItem();

      if (!open) {
        this.form.reset();
        this.semanasManuallyEdited = false;
        this.syncPlantModalityState();
        return;
      }

      if (!item) {
        this.form.reset();
        this.semanasManuallyEdited = false;
        this.syncPlantModalityState();
        return;
      }

      this.semanasManuallyEdited = true;
      this.form.patchValue({
        tipoModalidad: item.tipoModalidad,
        diasVacaciones:
          item.diasVacaciones != null ? String(item.diasVacaciones) : '',
        fechaInicio: item.fechaInicio ?? '',
        fechaFin: item.fechaFin ?? '',
        semanas: item.semanas != null ? String(item.semanas) : '',
      });

      this.syncPlantModalityState();
    });

    this.form.controls.tipoModalidad.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPlantModalityState());

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
    const diasVacaciones = diasRaw === '' || diasRaw == null ? null : Number(diasRaw);
    const semanas = semanasRaw === '' || semanasRaw == null ? null : Number(semanasRaw);

    const editing = this.editingItem();

    const isPlant = this.isPlantSelected();

    this.saved.emit({
      id: editing?.id ?? '',
      cotcId: editing?.cotcId,
      fechaId: editing?.fechaId,
      tipoModalidad,
      tipoModalidadLabel: label,
      diasVacaciones,
      fechaInicio: isPlant ? null : this.form.controls.fechaInicio.value ?? '',
      fechaFin: isPlant ? null : this.form.controls.fechaFin.value ?? '',
      semanas: isPlant ? null : semanas,
    });

    this.close.emit();
  }

  private syncSemanasFromDates(): void {
    if (this.isPlantSelected()) {
      return;
    }

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

    const diffDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    const weeks = diffDays / 7;
    const fraction = weeks % 1;
    const whole = Math.floor(weeks);
    return fraction >= 0.5 ? whole + 1 : whole;
  }

  private syncPlantModalityState(): void {
    const isPlant = this.isPlantModality(this.form.controls.tipoModalidad.value);

    this.isPlantSelected.set(isPlant);

    const fechaInicio = this.form.controls.fechaInicio;
    const fechaFin = this.form.controls.fechaFin;
    const semanas = this.form.controls.semanas;

    if (isPlant) {
      fechaInicio.clearValidators();
      fechaFin.clearValidators();
      semanas.clearValidators();

      fechaInicio.setValue('', { emitEvent: false });
      fechaFin.setValue('', { emitEvent: false });
      semanas.setValue('', { emitEvent: false });

      fechaInicio.disable({ emitEvent: false });
      fechaFin.disable({ emitEvent: false });
      semanas.disable({ emitEvent: false });

      fechaInicio.updateValueAndValidity({ emitEvent: false });
      fechaFin.updateValueAndValidity({ emitEvent: false });
      semanas.updateValueAndValidity({ emitEvent: false });
      return;
    }

    fechaInicio.enable({ emitEvent: false });
    fechaFin.enable({ emitEvent: false });
    semanas.enable({ emitEvent: false });

    fechaInicio.setValidators(Validators.required);
    fechaFin.setValidators(Validators.required);
    semanas.setValidators(Validators.required);

    fechaInicio.updateValueAndValidity({ emitEvent: false });
    fechaFin.updateValueAndValidity({ emitEvent: false });
    semanas.updateValueAndValidity({ emitEvent: false });
  }

  private isPlantModality(value: string | null | undefined): boolean {
    const selectedOption = this.modalityOptions().find(
      (option) => option.value === value,
    );

    const label = selectedOption?.label ?? '';
    return this.normalizeText(label).includes('planta');
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }



}
