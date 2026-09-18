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
  viewChild,
  untracked,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import {
  rxResource,
  takeUntilDestroyed,
  toSignal,
} from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CoordinationContractModality,
  CoordinationItem,
  ModalityProfessor,
} from '../../../../model/coordination.model';
import {
  isNoveltyComponentKey,
  NoveltiesItem,
} from '../../../../model/novelties.model';
import { CoordinationService } from '../../../../data/coordination.service';
import { SaveNovedadCargaDocenteRequest, SaveNoveltyProjectActivitiesRequest } from '../../../../model/novelty-carga-docente.model';
import { NotificationService } from '../../../../../../../core/service/notification-service';
import { Modal } from '../../../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { Label } from '../../../../../../../shared/components/form/label/label';
import { Select } from '../../../../../../../shared/components/form/select/select';
import { NOVELTY_COMPONENTS } from './novelty-components';
import { NoveltyComponentState } from './novelty-component-state';
import { Button } from '../../../../../../../shared/ui/button/button';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-alteration-professor-novelties',
  imports: [
    Modal,
    Icon,
    Label,
    Select,
    ReactiveFormsModule,
    NgComponentOutlet,
    Button
],
  providers: [NoveltyComponentState],
  templateUrl: './alteration-professor-novelties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationProfessorNovelties {
  private readonly coordinationService = inject(CoordinationService);
  private readonly notificationService = inject(NotificationService);
  readonly noveltyState = inject(NoveltyComponentState);

  readonly isOpen = input(false);
  readonly professor = input<ModalityProfessor | null>(null);
  readonly contractModality = input<CoordinationContractModality | null>(null);
  readonly coordination = input<CoordinationItem | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  readonly saving = signal(false);

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
    stream: () => this.coordinationService.getNoveltiesTypes(),
    defaultValue: [] as NoveltiesItem[],
  });

  readonly noveltyOptions = computed(() => {
    return this.noveltiesResource.value().map((novelty) => ({
      value: String(novelty.id),
      label: novelty.tipo,
    }));
  });

  readonly selectedNoveltyKey = computed(() => {
    const selectedId = this.selectedNoveltyId();
    const novelty = this.noveltiesResource.value().find((item) => {
      return String(item.id) === selectedId;
    });
    const key = novelty?.componente;
    return isNoveltyComponentKey(key) ? key : null;
  });

  readonly selectedNoveltyComponent = computed(() => {
    const key = this.selectedNoveltyKey();
    return key == null ? null : NOVELTY_COMPONENTS[key];
  });

  readonly noveltyInputs = computed(() => ({
    professor: this.professor(),
    coordination: this.coordination(),
    contractModality: this.contractModality(),
    noveltyId: this.parseNoveltyId(this.selectedNoveltyId()), 
  }));

  constructor() {
    effect(() => {
      this.selectedNoveltyId();
      untracked(() => this.noveltyState.clear());
    });
  }

  async onSave(): Promise<void> {
    if (this.saving() || this.idNovedadControl.invalid) {
      return;
    }

    const professor = this.professor();
    const payload = this.noveltyState.payload();
    const idNovedad = Number(this.selectedNoveltyId());
    if (
      professor?.idCargaDocente == null ||
      payload == null ||
      !Number.isFinite(idNovedad)
    ) {
      return;
    }

    this.saving.set(true);
    try {
      const saved = await this.persistNovelty(
        idNovedad,
        professor.idCargaDocente,
      );
      if (!saved) {
        return;
      }
      this.notificationService.success(
        'La novedad fue registrada correctamente.',
        'Novedad registrada',
      );
      this.saved.emit();
      this.saving.set(false);
      this.resetModal();
    } finally {
      this.saving.set(false);
    }
  }

  onClose(): void {
    if (this.saving()) {
      return;
    }
    this.resetModal();
  }

  private resetModal(): void {
    this.idNovedadControl.reset('');
    this.noveltyState.clear();
    this.close.emit();
  }

  private persistNovelty(
    idNovedad: number,
    idCargaDocente: number,
  ): Promise<boolean> {
    const payload = this.noveltyState.payload();
    if (payload?.component === 'asign-name-nn') {
      return this.saveAssignNameNn(
        idNovedad,
        idCargaDocente,
        payload.idPersonaGeneral,
      );
    }
    if (payload?.component === 'change-contract-modality') {
      const request = {
        ...payload.request,
        idNovedad,
        idCargaDocente,
      };
      return this.saveChangeContractModality(request);
    }
    if (payload?.component === 'change-project-activities') {
      const request: SaveNoveltyProjectActivitiesRequest = {
        detallesNuevos: payload.saveRequest.detalles,
        detallesActualizados: payload.updateRequests,
        idNovedad,
        idCargaDocente
      };
      return this.saveChangeProjectActivities(request);
    }

    return Promise.resolve(false);
  }

  private async saveAssignNameNn(
    idNovedad: number,
    idCargaDocente: number,
    idPersonaGeneral: number,
  ): Promise<boolean> {
    await firstValueFrom(
      this.coordinationService.assignNameToNn({
        idCargaDocente,
        idNovedad,
        idPersonaGeneral,
      }),
    );
    return true;
  }

  private async saveChangeContractModality(request: SaveNovedadCargaDocenteRequest): Promise<boolean> {
    await firstValueFrom(
      this.coordinationService.saveContractModalityProfessor(request),
    );
    return true;
  }

  private async saveChangeProjectActivities(request: SaveNoveltyProjectActivitiesRequest): Promise<boolean> {
    const { detallesNuevos, detallesActualizados } = request;
    if (detallesNuevos.length === 0 && detallesActualizados.length === 0) {
      this.notificationService.warning(
        'Agrega al menos una actividad o proyecto asociado para guardar.',
        'Sin actividades',
      );
      return false;
    }

    await firstValueFrom(
      this.coordinationService.saveNoveltyProjectActivities(request),
    );

    return true;
  }

  private parseNoveltyId(value: string): number | null {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}
