import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ModalityProfessor } from '../../../../model/coordination.model';
import { Modal } from '../../../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { rxResource } from '@angular/core/rxjs-interop';
import { CoordinationService } from '../../../../data/coordination.service';
import { NoveltiesItem } from '../../../../model/novelties.model';
import { Label } from '../../../../../../../shared/components/form/label/label';
import { Select } from '../../../../../../../shared/components/form/select/select';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Button } from '../../../../../../../shared/ui/button/button';

@Component({
  selector: 'app-alteration-professor-novelties',
  imports: [Modal, Icon, Label, Select, Button, ReactiveFormsModule],
  templateUrl: './alteration-professor-novelties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationProfessorNovelties {
  private readonly coordinationService = inject(CoordinationService);
  
  readonly isOpen = input(false);
  readonly professor = input<ModalityProfessor | null>(null);
  readonly isSaving = input(false);
  readonly close = output<void>();

  readonly idNovedadControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly noveltiesResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }

      return {};
    },
    stream: () => {
      return this.coordinationService.getNoveltiesTypes()
    },
    defaultValue: [] as NoveltiesItem[]
  });

  readonly noveltyOptions = computed(() => {
    return this.noveltiesResource.value().map((novelty) => ({
      value: String(novelty.id),
      label: novelty.tipo
    }))
  });

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.idNovedadControl.reset('');
  }

  onClose(): void {
    if (this.isSaving()) {
      return;
    }

    this.idNovedadControl.reset('');
    this.close.emit()
  }
}