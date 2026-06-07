import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbTitle } from '../../../../../core/service/breadcrumb-title';
import { NewModal } from '../../../../../shared/ui/new-modal/new-modal';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { PreloadCallForm } from '../../components/preload-call-form/preload-call-form';
import { PreloadCallTable } from '../../components/preload-call-table/preload-call-table';
import { PreloadCallService } from '../../data/preload-call.service';
import {
  PreloadCallDetailResponse,
  PreloadCallItem,
} from '../../model/preload-call.model';
import { buildPreloadCallDeletePayload } from '../../model/build-preload-call-delete-payload.function';
import { PreloadCallSaveRequest } from '../../model/preload-call-save.model';

@Component({
  selector: 'app-preload-call',
  imports: [SectionFrame, PreloadCallTable, PreloadCallForm, NewModal],
  templateUrl: './preload-call.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloadCall implements OnInit, OnDestroy {
  private readonly preloadCallService = inject(PreloadCallService);
  private readonly breadcrumbTitleService = inject(BreadcrumbTitle);

  readonly preloadCallsResource = rxResource({
    stream: () => this.preloadCallService.getPreloadCallList(),
    defaultValue: [] as PreloadCallItem[],
  });

  readonly preloadCalls = computed(() => this.preloadCallsResource.value());
  readonly isLoading = computed(() => this.preloadCallsResource.isLoading());

  readonly selectedPreloadCallIds = signal<string[]>([]);
  readonly selectedPreloadCall =
    signal<PreloadCallDetailResponse | null>(null);
  readonly showPreloadCallForm = signal(false);
  readonly isSaving = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly formMode = signal<'create' | 'edit' | 'read'>('create');

  readonly isDeleteModalOpen = signal(false);
  readonly deleteMode = signal<'single' | 'bulk'>('single');
  readonly preloadCallToDelete = signal<PreloadCallItem | null>(null);
  readonly idsToDelete = signal<string[]>([]);
  readonly isDeleting = signal(false);

  readonly deleteModalTitle = computed(() =>
    this.deleteMode() === 'single'
      ? 'Eliminar convocatoria precarga'
      : 'Eliminar convocatorias precarga',
  );

  readonly deleteModalMessage = computed(() => {
    if (this.deleteMode() === 'single') {
      const record = this.preloadCallToDelete();
      return `¿Deseas eliminar la convocatoria "${record?.descripcion ?? ''}"?`;
    }

    return `¿Deseas eliminar ${this.idsToDelete().length} convocatoria(s)?`;
  });

  readonly deleteModalButtonText = computed(() =>
    this.isDeleting() ? 'Eliminando...' : 'Eliminar',
  );

  ngOnInit(): void {
    this.breadcrumbTitleService.setPageTitle('Convocatoria precarga');
  }

  ngOnDestroy(): void {
    this.breadcrumbTitleService.clearPageTitle();
  }

  openPreloadCallForm(): void {
    this.selectedPreloadCall.set(null);
    this.formMode.set('create');
    this.showPreloadCallForm.set(true);
  }

  closePreloadCallForm(): void {
    this.showPreloadCallForm.set(false);
    this.selectedPreloadCall.set(null);
    this.formMode.set('create');
  }

  openEditPreloadCallForm(preloadCall: PreloadCallItem): void {
    if (!preloadCall?.id) {
      return;
    }

    this.preloadCallService
      .getPreloadCallDetails(preloadCall.id)
      .subscribe((response) => {
        this.selectedPreloadCall.set(response);
        this.formMode.set('edit');
        this.showPreloadCallForm.set(true);
      });
  }

  async onSubmitPreloadCall(payload: PreloadCallSaveRequest): Promise<void> {
    const mode = this.formMode();
    this.isSaving.set(true);
    this.successMessage.set(null);

    try {
      if (mode === 'edit') {
        const id = this.selectedPreloadCall()?.convocatoria?.id;

        if (!id) {
          return;
        }

        await firstValueFrom(
          this.preloadCallService.updatePreloadCall(id, payload),
        );
        console.log('Convocatoria seleccionada', id)
        console.log('Convocatoria actualizada', payload);
        
        this.successMessage.set('Convocatoria actualizada correctamente.');
      } else {
        await firstValueFrom(
          this.preloadCallService.savePreloadCall(payload),
        );
        this.successMessage.set('Convocatoria guardada correctamente.');
      }

      this.preloadCallsResource.reload();
      this.closePreloadCallForm();
    } catch (error) {
      console.error('Error al guardar convocatoria:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  onSelectedPreloadCallIdsChange(ids: string[]): void {
    this.selectedPreloadCallIds.set(ids);
  }

  onDeletePreloadCall(preloadCall: PreloadCallItem): void {
    this.openSingleDeleteModal(preloadCall);
  }

  onRefreshPreloadCallList(): void {
    this.successMessage.set(null);
    this.preloadCallsResource.reload();
  }

  onDeleteAllPreloadCall(ids: string[]): void {
    this.openBulkDeleteModal(ids);
  }

  openSingleDeleteModal(record: PreloadCallItem): void {
    if (!record?.id) {
      return;
    }

    this.deleteMode.set('single');
    this.preloadCallToDelete.set(record);
    this.idsToDelete.set([]);
    this.isDeleteModalOpen.set(true);
  }

  openBulkDeleteModal(ids: string[]): void {
    if (!ids.length) {
      return;
    }

    this.deleteMode.set('bulk');
    this.preloadCallToDelete.set(null);
    this.idsToDelete.set(ids);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleteModalOpen.set(false);
    this.preloadCallToDelete.set(null);
    this.idsToDelete.set([]);
  }

  async confirmDelete(): Promise<void> {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.successMessage.set(null);

    try {
      if (this.deleteMode() === 'single') {
        await this.deletePreloadCallById(this.preloadCallToDelete()?.id);
      } else {
        console.log('idsToDelete', this.idsToDelete());
        await this.bulkDeletePreloadCalls(this.idsToDelete());
      }

      this.successMessage.set('Convocatoria(s) eliminada(s) correctamente.');
      this.preloadCallsResource.reload();
      this.isDeleteModalOpen.set(false);
      this.preloadCallToDelete.set(null);
      this.idsToDelete.set([]);
    } catch (error) {
      console.error('Error eliminando convocatoria:', error);
    } finally {
      this.isDeleting.set(false);
    }
  }

  private async deletePreloadCallById(id: number | undefined): Promise<void> {
    if (!id) {
      return;
    }

    const detail = await firstValueFrom(
      this.preloadCallService.getPreloadCallDetails(id),
    );
    const payload = buildPreloadCallDeletePayload(detail);

    await firstValueFrom(
      this.preloadCallService.deletePreloadCall(id, payload),
    );

    this.afterPreloadCallDeleted(id);
  }

  private async bulkDeletePreloadCalls(ids: string[]): Promise<void> {
    const payloads = await Promise.all(
      ids.map(async (idStr) => {
        const id = Number(idStr);
        const detail = await firstValueFrom(
          this.preloadCallService.getPreloadCallDetails(id),
        );
        return buildPreloadCallDeletePayload(detail);
      }),
    );

    await firstValueFrom(
      this.preloadCallService.bulkDeletePreloadCall(payloads),
    );

    console.log('payloads', payloads);

    ids.forEach((idStr) => this.afterPreloadCallDeleted(Number(idStr)));
    this.selectedPreloadCallIds.set([]);
  }

  private afterPreloadCallDeleted(id: number): void {
    this.selectedPreloadCallIds.update((selectedIds) =>
      selectedIds.filter((selectedId) => selectedId !== String(id)),
    );

    const editingId = this.selectedPreloadCall()?.convocatoria?.id;
    if (editingId === id) {
      this.closePreloadCallForm();
    }
  }
}
