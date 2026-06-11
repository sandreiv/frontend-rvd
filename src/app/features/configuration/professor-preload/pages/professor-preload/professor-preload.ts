import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { Button } from '../../../../../shared/ui/button/button';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { CoordinationDetail } from '../../components/coordination/coordination-detail/coordination-detail';
import { CoordinationTable } from '../../components/coordination/coordination-table/coordination-table';
import { ProfessorPreloadService } from '../../data/professor-preload';
import {
  CoordinationItem,
  UNASSIGNED_PRELOAD_CALL_FILTER,
} from '../../model/coordination.model';
import { PreloadCallItem } from '../../../preload-call/model/preload-call.model';

@Component({
  selector: 'app-professor-preload',
  imports: [
    Button,
    Select,
    SectionFrame,
    CoordinationTable,
    CoordinationDetail,
  ],
  templateUrl: './professor-preload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorPreload implements OnInit {
  private readonly professorPreloadService = inject(ProfessorPreloadService);

  readonly activePreloadCallsResource = rxResource({
    stream: () => this.professorPreloadService.getActivePreloadCall(),
    defaultValue: [] as PreloadCallItem[],
  });

  readonly selectedPreloadCallId = signal(UNASSIGNED_PRELOAD_CALL_FILTER);
  readonly appliedFilterPreloadCallId = signal<string | null>(null);
  readonly selectedCoordinationIds = signal<string[]>([]);
  readonly selectedCoordination = signal<CoordinationItem | null>(null);
  readonly showCoordinationDetail = signal(false);

  readonly coordinationsResource = rxResource({
    stream: () => {
      const filterId = this.appliedFilterPreloadCallId();
      if (filterId === null) {
        return of([] as CoordinationItem[]);
      }

      const idConvocatoria =
        filterId === UNASSIGNED_PRELOAD_CALL_FILTER
          ? undefined
          : Number(filterId);

      return this.professorPreloadService.getCoordinations(idConvocatoria);
    },
    defaultValue: [] as CoordinationItem[],
  });

  readonly preloadCallOptions = computed<SelectOption[]>(() => [
    {
      value: UNASSIGNED_PRELOAD_CALL_FILTER,
      label: 'Sin convocatoria asignada',
    },
    ...this.activePreloadCallsResource.value().map((item) => ({
      value: String(item.id),
      label: item.descripcion,
    })),
  ]);

  readonly coordinations = computed(() => this.coordinationsResource.value());

  readonly isLoadingPreloadCalls = computed(() =>
    this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(() =>
    this.coordinationsResource.isLoading(),
  );

  readonly hasAppliedFilter = computed(
    () => this.appliedFilterPreloadCallId() !== null,
  );

  ngOnInit(): void {
    this.onApplyCoordinationFilter();
  }

  onPreloadCallChange(preloadCallId: string): void {
    this.selectedPreloadCallId.set(preloadCallId);
  }

  onApplyCoordinationFilter(): void {
    this.appliedFilterPreloadCallId.set(this.selectedPreloadCallId());
    this.selectedCoordinationIds.set([]);
    this.coordinationsResource.reload();
  }

  onRefreshCoordinations(): void {
    this.coordinationsResource.reload();
  }

  onStartPreassignment(coordination: CoordinationItem): void {
    this.selectedCoordination.set(coordination);
    this.showCoordinationDetail.set(true);
  }

  onBackToCoordinationList(): void {
    this.showCoordinationDetail.set(false);
  }
}
