import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChild,
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
import { NotificationService } from '../../../../../../../core/service/notification-service';
import { Modal } from '../../../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { Label } from '../../../../../../../shared/components/form/label/label';
import { Select } from '../../../../../../../shared/components/form/select/select';
import { NOVELTY_COMPONENTS } from './novelty-components';
import { isNoveltySaveHost } from '../../../../model/novelty-carga-docente.model';

@Component({
  selector: 'app-alteration-professor-novelties',
  imports: [
    Modal,
    Icon,
    Label,
    Select,
    ReactiveFormsModule,
    NgComponentOutlet,
  ],
  templateUrl: './alteration-professor-novelties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationProfessorNovelties {
  private readonly coordinationService = inject(CoordinationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noveltyOutlet = viewChild(NgComponentOutlet);

  readonly isOpen = input(false);
  readonly professor = input<ModalityProfessor | null>(null);
  readonly contractModality = input<CoordinationContractModality | null>(null);
  readonly coordination = input<CoordinationItem | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  readonly isSaving = signal(false);

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

  readonly noveltyInputs = computed(() => ({
    professor: this.professor(),
    coordination: this.coordination(),
    contractModality: this.contractModality(),
    noveltyId: this.parseNoveltyId(this.selectedNoveltyId()), 
  }));

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.idNovedadControl.markAsTouched();
    if (this.idNovedadControl.invalid) {
      return;
    }

    const host = this.noveltyOutlet()?.componentInstance;
    if (!isNoveltySaveHost(host)) {
      this.notificationService.warning(
        'Esta novedad aún no está disponible para guardar.',
        'Novedad',
      );
      return;
    }

    this.isSaving.set(true);
    host
      .save()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onSaveSuccess(),
        error: (error) => this.onSaveError(error),
      });
  }

  onClose(): void {
    if (this.isSaving()) {
      return;
    }

    this.idNovedadControl.reset('');
    this.close.emit();
  }

  private onSaveSuccess(): void {
    this.isSaving.set(false);
    this.notificationService.success(
      'La novedad se guardó correctamente.',
    );
    this.idNovedadControl.reset('');
    this.saved.emit();
    this.close.emit();
  }

  private onSaveError(error: {
    incomplete?: boolean;
    message?: string;
  }): void {
    this.isSaving.set(false);
    if (!error?.incomplete) {
      return;
    }
    this.notificationService.warning(
      error.message ?? 'Complete los datos de la novedad.',
      'Novedad incompleta',
    );
  }

  private parseNoveltyId(value: string): number | null {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}