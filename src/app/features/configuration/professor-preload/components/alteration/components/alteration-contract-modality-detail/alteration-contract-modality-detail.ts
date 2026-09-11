
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CoordinationContractModality, CoordinationItem, isPlantaModality, ModalityProfessor } from '../../../../model/coordination.model';
import { CoordinationService } from '../../../../data/coordination.service';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, map, forkJoin } from 'rxjs';
import { forNext } from '../../../../../../../core/utils/for-next.function';
import { TabBarId, TabBarItem } from '../../../../../../../shared/ui/tab-bar/tab-bar.types';
import { formatSentenceValue } from '../../../../../../../shared/utils/normalized-text.util';
import { resolveModalityKind } from '../../../../model/professor-form.config';
import { TabBar } from '../../../../../../../shared/ui/tab-bar/tab-bar';
type BadgeTone = 'success' | 'brand' | 'warning' | 'error' | 'gray';

interface StatusBadge {
  label: string;
  badgeClass: string;
  dotClass: string;
}

interface ModalityProfessorRow {
  rowKey: string;
  displayName: string;
  professor: ModalityProfessor;
}

interface ModalityProfessorsEntry {
  id: number;
  professors: ModalityProfessor[];
}

const NN_LABEL = 'NN';
const ON_REGISTER_STATE = '0';
const PENDING_VERIFY_STATE = '1';
const VERIFIED_STATE = '2';
const RETURNED_STATE = '3';
const APPROVED_STATE = '4';

const BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ' +
  'text-xs font-medium';
const DOT_BASE = 'size-1.5 rounded-full';

const BADGE_TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge:
      'bg-success-50 text-success-700 ' +
      'dark:bg-success-500/15 dark:text-success-400',
    dot: 'bg-success-600 dark:bg-success-400',
  },
  brand: {
    badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
    dot: 'bg-brand-600 dark:bg-brand-400',
  },
  warning: {
    badge:
      'bg-warning-50 text-warning-700 ' +
      'dark:bg-warning-500/15 dark:text-warning-400',
    dot: 'bg-warning-500 dark:bg-warning-400',
  },
  error: {
    badge: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
    dot: 'bg-error-500 dark:bg-error-400',
  },
  gray: {
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400 dark:bg-gray-500',
  },
};
@Component({
  selector: 'app-alteration-contract-modality-detail',
  imports: [TabBar],
  templateUrl: './alteration-contract-modality-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlterationContractModalityDetail {

  private readonly coordinationService = inject(CoordinationService);

  readonly coordination = input.required<CoordinationItem>();
  readonly refreshKey = input(0);

  readonly selectedContractModalityId = signal<TabBarId | null>(null);

  readonly contractModalities = computed(
    () => this.coordination().modalidadesContratacion,
  );

  readonly sortedContractModalities = computed(() =>
    this.sortContractModalities(this.contractModalities()),
  );

  readonly modalityProfessorsResource = rxResource({
    params: () => this.resolveProfessorsParams(),
    stream: ({ params }) => this.loadProfessorsByModality(params),
    defaultValue: {} as Record<number, ModalityProfessor[]>,
  });

  readonly modalityProfessorsMap = computed(() =>
    this.modalityProfessorsResource.value(),
  );

  readonly modalityProfessors = computed<ModalityProfessor[]>(() => {
    const selectedId = this.selectedContractModalityId();
    if (selectedId == null) {
      return [];
    }
    return this.modalityProfessorsMap()[Number(selectedId)] ?? [];
  });

  readonly currentProfessorRows = computed<ModalityProfessorRow[]>(() =>
    this.buildProfessorRows(this.modalityProfessors()),
  );

  readonly modalityTabs = computed<TabBarItem[]>(() => {
    const professorsByModality = this.modalityProfessorsMap();
    const tabs: TabBarItem[] = [];
    forNext(this.sortedContractModalities(), (modality) => {
      tabs.push(this.toModalityTabItem(modality, professorsByModality));
    });
    return tabs;
  });

  readonly hasAnyModality = computed(() => this.modalityTabs().length > 0);

  readonly isLoadingProfessors = computed(() =>
    this.modalityProfessorsResource.isLoading(),
  );

  readonly selectedModalityLabel = computed(() => {
    const selectedId = this.selectedContractModalityId();
    const modality = this.sortedContractModalities().find(
      (item) => item.id === selectedId,
    );
    return formatSentenceValue(modality?.nombre) || 'esta modalidad';
  });

  constructor() {
    effect(() => {
      const tabs = this.modalityTabs();
      const currentId = this.selectedContractModalityId();

      if (!tabs.length) {
        this.selectedContractModalityId.set(null);
        return;
      }

      const hasCurrent = tabs.some((tab) => tab.id === currentId);
      if (!hasCurrent) {
        this.selectedContractModalityId.set(tabs[0].id);
      }
    });
  }

  onContractModalityChange(id: TabBarId | null): void {
    this.selectedContractModalityId.set(id);
  }

  professorStatusBadge(professor: ModalityProfessor): StatusBadge | null {
    if (!professor.estado) {
      return null;
    }

    switch (professor.estado) {
      case ON_REGISTER_STATE:
        return this.buildStatusBadge('En registro', 'gray');
      case PENDING_VERIFY_STATE:
        return this.buildStatusBadge('Enviado para verificar', 'warning');
      case VERIFIED_STATE:
        return this.buildStatusBadge('Verificado', 'brand');
      case RETURNED_STATE:
        return this.buildStatusBadge('Devuelto', 'error');
      case APPROVED_STATE:
        return this.buildStatusBadge('Aprobada', 'success');
      default:
        return this.buildStatusBadge('Estado desconocido', 'gray');
    }
  }

  private resolveProfessorsParams(): {
    idCarga: number;
    modalityIds: number[];
    refreshKey: number;
  } | undefined {
    const modalities = this.sortedContractModalities();
    const idCarga = this.coordination().idCarga;
    if (!modalities.length || idCarga == null) {
      return undefined;
    }

    const modalityIds: number[] = [];
    forNext(modalities, (modality) => {
      modalityIds.push(modality.id);
    });

    return {
      idCarga,
      modalityIds,
      refreshKey: this.refreshKey(),
    };
  }

  private loadProfessorsByModality(params: {
    idCarga: number;
    modalityIds: number[];
  }): Observable<Record<number, ModalityProfessor[]>> {
    const requests: Observable<ModalityProfessorsEntry>[] = [];
    forNext(params.modalityIds, (id) => {
      requests.push(
        this.coordinationService
          .listProfessorsByModality(params.idCarga, id)
          .pipe(map((professors) => ({ id, professors }))),
      );
    });

    return forkJoin(requests).pipe(
      map((entries) => this.toModalityProfessorsMap(entries)),
    );
  }

  private buildProfessorRows(
    professors: ModalityProfessor[],
  ): ModalityProfessorRow[] {
    const rows: ModalityProfessorRow[] = [];
    forNext(professors, (professor, index) => {
      const rowId =
        professor.idCargaDocente || professor.idPersonaGeneral || index;
      rows.push({
        rowKey: `professor-${rowId}`,
        displayName: this.resolveProfessorName(professor),
        professor,
      });
    });
    return rows;
  }

  private sortContractModalities(
    modalities: CoordinationContractModality[],
  ): CoordinationContractModality[] {
    return [...modalities].sort(
      (left, right) =>
        this.resolveModalitySortOrder(left) -
        this.resolveModalitySortOrder(right),
    );
  }

  private resolveModalitySortOrder(
    modality: CoordinationContractModality,
  ): number {
    if (isPlantaModality(modality)) {
      return 2;
    }

    const kind = resolveModalityKind(modality.nombre);
    if (kind === 'tiempoCompletoOcasional') {
      return 0;
    }
    if (kind === 'catedra') {
      return 1;
    }

    return 3;
  }

  private toModalityTabItem(
    modality: CoordinationContractModality,
    professorsByModality: Record<number, ModalityProfessor[]>,
  ): TabBarItem {
    const professors = professorsByModality[modality.id] ?? [];

    if (isPlantaModality(modality)) {
      return {
        id: modality.id,
        label: modality.nombre,
        badge: `${professors.length}`,
      };
    }

    const verified = professors.filter(
      (professor) => professor.estado !== ON_REGISTER_STATE,
    ).length;

    return {
      id: modality.id,
      label: modality.nombre,
      badge: `${verified}/${professors.length}`,
    };
  }

  private toModalityProfessorsMap(
    entries: ModalityProfessorsEntry[],
  ): Record<number, ModalityProfessor[]> {
    const result: Record<number, ModalityProfessor[]> = {};
    forNext(entries, (entry) => {
      result[entry.id] = entry.professors;
    });
    return result;
  }

  private resolveProfessorName(professor: ModalityProfessor): string {
    if (professor.idPersonaGeneral == null) {
      return NN_LABEL;
    }
    return professor.nombreCompleto?.trim() || NN_LABEL;
  }

  private buildStatusBadge(label: string, tone: BadgeTone): StatusBadge {
    const palette = BADGE_TONES[tone];
    return {
      label,
      badgeClass: `${BADGE_BASE} ${palette.badge}`,
      dotClass: `${DOT_BASE} ${palette.dot}`,
    };
  }

}
