import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { CoordinationService } from '../../data/coordination.service';
import {
  CoordinationContractModality,
  CoordinationItem,
  ModalityProfessor,
} from '../../model/coordination.model';
import {
  createInitialExpandedSections,
  EMPTY_PROFESSOR_LOAD_SUMMARY,
  mapActivitySummaryTables,
  mapContractValueRows,
  mapCostCenterRows,
  PROFESSOR_SUMMARY_SECTIONS,
  ProfessorSummarySectionId,
} from '../../model/professor-summary.model';

const NN_LABEL = 'NN';

@Component({
  selector: 'app-professor-summary',
  imports: [Modal, Button, Icon, CollapsibleSection],
  templateUrl: './professor-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorSummary {
  private readonly coordinationService = inject(CoordinationService);

  isOpen = input(false);
  professor = input<ModalityProfessor | null>(null);
  coordination = input<CoordinationItem | null>(null);
  contractModality = input<CoordinationContractModality | null>(null);
  close = output<void>();

  readonly sections = PROFESSOR_SUMMARY_SECTIONS;

  readonly expandedSections = signal(createInitialExpandedSections());

  readonly summaryResource = rxResource({
    params: () => {
      if (!this.isOpen()) {
        return undefined;
      }

      const idCargaDocente = this.professor()?.idCargaDocente;
      if (idCargaDocente == null) {
        return undefined;
      }

      return { idCargaDocente };
    },
    stream: ({ params }) =>
      this.coordinationService
        .getProfessorLoadSummary(params.idCargaDocente)
        .pipe(catchError(() => of(EMPTY_PROFESSOR_LOAD_SUMMARY))),
    defaultValue: EMPTY_PROFESSOR_LOAD_SUMMARY,
  });

  readonly summary = computed(
    () => this.summaryResource.value() ?? EMPTY_PROFESSOR_LOAD_SUMMARY,
  );

  readonly isLoading = computed(() => this.summaryResource.isLoading());

  readonly professorDisplayName = computed(() => {
    const professor = this.professor();
    if (!professor || professor.idPersonaGeneral == null) {
      return NN_LABEL;
    }
    return professor.nombreCompleto?.trim() || NN_LABEL;
  });

  readonly modalityLabel = computed(
    () => this.contractModality()?.nombre ?? '-',
  );

  readonly coordinationLabel = computed(() => {
    const coordination = this.coordination();
    if (!coordination) {
      return '-';
    }
    return coordination.descripcion || coordination.nombre || '-';
  });

  readonly contractValueRows = computed(() =>
    mapContractValueRows(this.summary().valorContratacion),
  );

  readonly activityTables = computed(() =>
    mapActivitySummaryTables(this.summary().horasActividades),
  );

  readonly costCenterRows = computed(() =>
    mapCostCenterRows(this.summary().centrosCosto),
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        return;
      }

      untracked(() => {
        this.expandedSections.set(createInitialExpandedSections());
      });
    });
  }

  isSectionExpanded(sectionId: ProfessorSummarySectionId): boolean {
    return this.expandedSections()[sectionId];
  }

  onSectionExpandedChange(
    sectionId: ProfessorSummarySectionId,
    expanded: boolean,
  ): void {
    this.expandedSections.update((current) => ({
      ...current,
      [sectionId]: expanded,
    }));
  }

  hoursLabel(hours: number): string {
    return `${hours ?? 0}h`;
  }

  onClose(): void {
    this.close.emit();
  }
}
