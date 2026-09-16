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

import {
  signal,
} from '@angular/core';

import {
  firstValueFrom,
} from 'rxjs';

import {
  NotificationService,
} from '../../../../../../../core/service/notification-service';

import {
  NoveltyComponentState,
} from './novelty-component-state';

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
  providers: [
    NoveltyComponentState,
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

  readonly selectedNoveltyKey = computed(() => {
  const selectedId =
    this.selectedNoveltyId();

  const novelty =
    this.noveltiesResource
      .value()
      .find((item) => {
        return String(item.id) === selectedId;
      });

  const key = novelty?.componente;

  return isNoveltyComponentKey(key)
      ? key
      : null;
  });

  readonly selectedNoveltyComponent =
    computed(() => {

      const key =
        this.selectedNoveltyKey();

      return key == null
        ? null
        : NOVELTY_COMPONENTS[key];
    });

  readonly selectedNoveltyInputs =
    computed<Record<string, unknown>>(() => {

      const key =
        this.selectedNoveltyKey();

      if (key === 'asign-name-nn') {
        return {
          professor: this.professor(),
        };
      }

      return {};
    });


  readonly noveltyState =
  inject(NoveltyComponentState);

  private readonly notificationService =
    inject(NotificationService);

  readonly saved = output<void>();

  readonly saving =
    signal(false);

  readonly isBusy =
    computed(
      () =>
        this.isSaving() ||
        this.saving(),
    );  

  async onSave(): Promise<void> {

    if (
      this.isBusy() ||
      this.idNovedadControl.invalid
    ) {
      return;
    }

    const professor =
      this.professor();

    if (
      professor?.idCargaDocente == null
    ) {
      return;
    }

    const idNovedad =
      Number(
        this.selectedNoveltyId(),
      );

    const component =
      this.selectedNoveltyKey();

    const payload =
      this.noveltyState.payload();

    if (
      !Number.isFinite(idNovedad) ||
      payload == null
    ) {
      return;
    }

    this.saving.set(true);

    try {

      switch (component) {

        case 'asign-name-nn': {

          if (
            payload.component !==
            'asign-name-nn'
          ) {
            return;
          }

          await firstValueFrom(
            this.coordinationService
              .assignNameToNn({
                idCargaDocente:
                  professor.idCargaDocente,

                idNovedad,

                idPersonaGeneral:
                  payload.idPersonaGeneral,
              }),
          );

          break;
        }

        default:
          return;
      }

      this.notificationService.success(
        'La novedad fue registrada correctamente.',
        'Novedad registrada',
      );

      this.saved.emit();

      this.onClose();

    } finally {

      this.saving.set(false);
    }
  }

  onClose(): void {

    if (this.isBusy()) {
      return;
    }

    this.idNovedadControl.reset('');

    this.noveltyState.clear();

    this.close.emit();
  }
}
