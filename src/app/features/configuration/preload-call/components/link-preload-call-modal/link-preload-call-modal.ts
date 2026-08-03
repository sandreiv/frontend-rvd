import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Label } from '../../../../../shared/components/form/label/label';
import {
  Option,
  Select,
} from '../../../../../shared/components/form/select/select';
import { Button } from '../../../../../shared/ui/button/button';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { PreloadCallItem } from '../../model/preload-call.model';

@Component({
  selector: 'app-link-preload-call-modal',
  imports: [ReactiveFormsModule, Modal, Label, Select, Button],
  templateUrl: './link-preload-call-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkPreloadCallModal {
  readonly isOpen = input(false);
  readonly preloadCall = input<PreloadCallItem | null>(null);
  readonly firstPeriodCalls = input<PreloadCallItem[]>([]);
  readonly isLoadingOptions = input(false);
  readonly isSaving = input(false);

  readonly close = output<void>();
  readonly save = output<number>();
  readonly unlink = output<void>();

  readonly idRelacionControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly hasExistingLink = computed(
    () => this.preloadCall()?.idRelacion != null,
  );

  readonly callOptions = computed<Option[]>(() =>
    this.firstPeriodCalls().map((item) => ({
      value: String(item.id),
      label: item.nombre || item.descripcion || `Convocatoria ${item.id}`,
    })),
  );

  readonly modalTitle = computed(() =>
    this.hasExistingLink()
      ? 'Editar enlace de convocatoria'
      : 'Enlazar convocatoria',
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        untracked(() => this.idRelacionControl.reset(''));
        return;
      }

      const idRelacion = this.preloadCall()?.idRelacion;
      untracked(() => {
        this.idRelacionControl.setValue(
          idRelacion != null ? String(idRelacion) : '',
        );
      });
    });
  }

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.idRelacionControl.markAsTouched();
    if (this.idRelacionControl.invalid) {
      return;
    }

    const idRelacion = Number(this.idRelacionControl.value);
    if (Number.isNaN(idRelacion) || idRelacion <= 0) {
      return;
    }

    this.save.emit(idRelacion);
  }

  onUnlink(): void {
    if (this.isSaving() || !this.hasExistingLink()) {
      return;
    }

    this.unlink.emit();
  }

  onClose(): void {
    if (this.isSaving()) {
      return;
    }

    this.close.emit();
  }
}
