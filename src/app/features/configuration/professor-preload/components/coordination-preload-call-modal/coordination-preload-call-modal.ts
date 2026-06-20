import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize, map, switchMap } from 'rxjs';
import { Label } from '../../../../../shared/components/form/label/label';
import {
  Select,
  type Option,
} from '../../../../../shared/components/form/select/select';
import { Button } from '../../../../../shared/ui/button/button';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { CoordinationService } from '../../data/coordination.service';
import {
  CoordinationItem,
  CoordinationPreloadCallApi,
} from '../../model/coordination.model';

@Component({
  selector: 'app-coordination-preload-call-modal',
  imports: [Modal, Label, Select, Button],
  templateUrl: './coordination-preload-call-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationPreloadCallModal {
  private readonly coordinationService = inject(CoordinationService);

  isOpen = input(false);
  coordination = input.required<CoordinationItem>();

  close = output<void>();
  saved = output<CoordinationItem>();

  readonly selectedPreloadCallId = signal('');
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly activePreloadCallsResource = rxResource({
    stream: () => this.coordinationService.getActivePreloadCall(),
    defaultValue: [] as CoordinationPreloadCallApi[],
  });

  readonly preloadCallOptions = computed<Option[]>(() =>
    this.activePreloadCallsResource.value().map((item) => ({
      value: String(item.id),
      label: item.nombre,
    })),
  );

  readonly isLoadingOptions = computed(() =>
    this.activePreloadCallsResource.isLoading(),
  );

  readonly canSave = computed(
    () =>
      !!this.selectedPreloadCallId() &&
      !this.isSaving() &&
      !this.isLoadingOptions(),
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.selectedPreloadCallId.set('');
        this.saveError.set(null);
        return;
      }

      this.activePreloadCallsResource.reload();
    });
  }

  onPreloadCallChange(preloadCallId: string): void {
    this.selectedPreloadCallId.set(preloadCallId);
    this.saveError.set(null);
  }

  onSave(): void {
    const idConvocatoria = Number(this.selectedPreloadCallId());
    if (!idConvocatoria) {
      return;
    }

    const coordinationId = this.coordination().id;
    const request = { idCoordinacion: coordinationId, idConvocatoria };

    this.isSaving.set(true);
    this.saveError.set(null);

    this.coordinationService
      .savePreload(request)
      .pipe(
        switchMap(() =>
          this.coordinationService.getCoordinations(idConvocatoria),
        ),
        map((items) => {
          const updated = items.find((item) => item.id === coordinationId);
          if (!updated) {
            throw new Error('No se encontró la coordinación actualizada.');
          }
          return updated;
        }),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: (updated) => this.saved.emit(updated),
        error: () =>
          this.saveError.set(
            'No fue posible asignar la convocatoria. Intente nuevamente.',
          ),
      });
  }
}
