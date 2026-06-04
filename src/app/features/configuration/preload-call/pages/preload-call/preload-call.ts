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
import { BreadcrumbTitle } from '../../../../../core/service/breadcrumb-title';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { PreloadCallForm } from '../../components/preload-call-form/preload-call-form';
import { PreloadCallTable } from '../../components/preload-call-table/preload-call-table';
import { PreloadCallService } from '../../data/preload-call.service';
import { PreloadCallItem } from '../../model/preload-call.model';

const PRELOAD_CALL_LOAD_ERROR = 'No fue posible cargar las convocatorias de precarga.';

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

  readonly preloadCalls = computed(
    () => this.preloadCallsResource.value(),
  );
  readonly isLoading = computed(
    () => this.preloadCallsResource.isLoading(),
  );
  readonly errorMessage = computed(() =>
    this.preloadCallsResource.error() ? PRELOAD_CALL_LOAD_ERROR : null,
  );

  readonly selectedPreloadCallIds = signal<string[]>([]);
  readonly selectedPreloadCall = signal<PreloadCallItem | null>(null);
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

  selectedPreloadCallIdsChange(ids: string[]): void {
    this.selectedPreloadCallIds.set(ids);
  }

  openReadOnlyPreloadCallForm(preloadCall: PreloadCallItem): void {
    this.selectedPreloadCall.set(preloadCall);
    this.formMode.set('edit');
    this.showPreloadCallForm.set(true);
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
