import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalityProfessor } from '../../../../model/coordination.model';
import {
  isNoveltyComponentKey,
  NoveltiesItem,
} from '../../../../model/novelties.model';
import { CoordinationService } from '../../../../data/coordination.service';
import { Modal } from '../../../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { Label } from '../../../../../../../shared/components/form/label/label';
import { Select } from '../../../../../../../shared/components/form/select/select';
import { Button } from '../../../../../../../shared/ui/button/button';
import { NOVELTY_COMPONENTS } from './novelty-components';

@Component({
  selector: 'app-alteration-professor-novelties',
  imports: [
    Modal,
    Icon,
    Label,
    Select,
    Button,
    ReactiveFormsModule,
    NgComponentOutlet,
  ],
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

  readonly selectedNoveltyId = toSignal(
    this.idNovedadControl.valueChanges,
    { initialValue: this.idNovedadControl.value },
  );

  readonly noveltiesResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }

      return {};
    },
    stream: () => {
      return this.coordinationService.getNoveltiesTypes();
    },
    defaultValue: [] as NoveltiesItem[],
  });

  readonly noveltyOptions = computed(() => {
    return this.noveltiesResource.value().map((novelty) => ({
      value: String(novelty.id),
      label: novelty.tipo,
    }));
  });

  readonly selectedNoveltyComponent = computed(() => {
    const selectedId = this.selectedNoveltyId();
    const novelty = this.noveltiesResource.value().find((item) => {
      return String(item.id) === selectedId;
    });
    const key = novelty?.componente;
    if (!isNoveltyComponentKey(key)) {
      return null;
    }
    return NOVELTY_COMPONENTS[key];
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
    this.close.emit();
  }
}
