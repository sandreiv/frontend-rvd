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
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { PreloadCallForm } from '../../components/preload-call-form/preload-call-form';
import { PreloadCallTable } from '../../components/preload-call-table/preload-call-table';
import { PreloadCallService } from '../../data/preload-call.service';
import {
  PreloadCallDetailResponse,
  PreloadCallItem,
} from '../../model/preload-call.model';
import { PreloadCallSaveRequest } from '../../model/preload-call-save.model';

@Component({
  selector: 'app-preload-call',
  imports: [SectionFrame, PreloadCallTable, PreloadCallForm],
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
        this.selectedPreloadCall.set({ ...response, id: preloadCall.id });
        this.formMode.set('edit');
        this.showPreloadCallForm.set(true);
      });
  }

  async onSubmitPreloadCall(payload: PreloadCallSaveRequest): Promise<void> {
    this.isSaving.set(true);
    this.successMessage.set(null);

    try {
      await firstValueFrom(this.preloadCallService.savePreloadCall(payload));
      this.successMessage.set('Convocatoria guardada correctamente.');
      this.preloadCallsResource.reload();
      this.closePreloadCallForm();
    } finally {
      this.isSaving.set(false);
    }
  }

  onSelectedPreloadCallIdsChange(ids: string[]): void {
    this.selectedPreloadCallIds.set(ids);
  }

  onDeletePreloadCall(preloadCall: PreloadCallItem): void {
    console.log('Eliminar convocatoria:', preloadCall);
  }

  onRefreshPreloadCallList(): void {
    this.successMessage.set(null);
    this.preloadCallsResource.reload();
  }

  onDeleteAllPreloadCall(ids: string[]): void {
    console.log('Eliminar convocatorias:', ids);
  }
}
