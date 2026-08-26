import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { Modal } from "../../../../../shared/ui/modal/modal";
import { Button } from "../../../../../shared/ui/button/button";
import { Label } from "../../../../../shared/components/form/label/label";
import { InputField } from "../../../../../shared/components/form/input/input-field";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: 'app-decline-preload-modal',
  imports: [
    Modal,
    Button,
    Label,
    InputField,
    ReactiveFormsModule
  ],
  templateUrl: './decline-preload-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeclinePreloadModal {
  private readonly fb = inject(FormBuilder);

  isOpen = input(false);
  isSaving = input(false);

  close = output<void>();
  save = output<string>();

  readonly form = this.fb.group({
    observacion: ['', Validators.required]
  });

  onSave(): void {
    if (this.isSaving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const observacion = this.form.controls.observacion.value?.trim()
    if (!observacion) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(observacion);
  }

  onClose(): void {
    if (this.isSaving()) return;

    this.close.emit()
  }
}