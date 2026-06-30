import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Modal } from "../../../../../shared/ui/modal/modal";
import { Button } from "../../../../../shared/ui/button/button";
import { Icon } from "../../../../../shared/ui/icon/icon";

@Component({
  selector: 'app-professor-activities-modal',
  imports: [Modal, Button, Icon],
  templateUrl: './professor-activities-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorActivitiesModal {
  isOpen = input(false);
  close = output<void>();
  isSaving = signal<boolean>(false);

  onSubmit(): void {
    this.isSaving.set(true);
    this.close.emit();
  }
}
