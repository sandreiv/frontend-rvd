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
import { Modal } from '../../../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { CollapsibleSection } from '../../../../../../../shared/components/form/collapsible-section/collapsible-section';
import { CoordinationService } from '../../../../data/coordination.service';
import {
  CoordinationContractModality,
  CoordinationItem,
  isPlantaModality,
  ModalityProfessor,
} from '../../../../model/coordination.model';
import {
  mapActivitySummaryTables,
  mapCostCenterRows,
} from '../../../../model/professor-summary.model';
import {
  createInitialNoveltyExpandedSections,
  EMPTY_PROFESSOR_NOVELTY_SUMMARY,
  mapNoveltyContractValueRows,
  mapNoveltyHistoryRows,
  NOVELTY_SUMMARY_SECTIONS,
  NoveltySummarySectionId,
} from '../../../../model/novelty-summary.model';

const NN_LABEL = 'NN';

@Component({
  selector: 'app-novelty-summary',
  imports: [Modal, Icon, CollapsibleSection],
  templateUrl: './novelty-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoveltySummary {
  private readonly coordinationService = inject(CoordinationService);

  isOpen = input(false);
  professor = input<ModalityProfessor | null>(null);
  coordination = input<CoordinationItem | null>(null);
  contractModality = input<CoordinationContractModality | null>(null);
  close = output<void>();

  readonly sections = NOVELTY_SUMMARY_SECTIONS;

  readonly isPlanta = computed(() => {
    const modality = this.contractModality();
    return modality != null && isPlantaModality(modality);
  });

  readonly visibleSections = computed(() =>
    this.sections.filter(
      (section) =>
        !(this.isPlanta() && section.id === 'valores-contratacion'),
    ),
  );

  readonly expandedSections = signal(
    createInitialNoveltyExpandedSections(),
  );

  readonly summaryResource = rxResource({
    params: () => this.resolveSummaryParams(),
    stream: ({ params }) =>
      this.coordinationService
        .getProfessorNoveltySummary(params.idCargaDocente)
        .pipe(catchError(() => of(EMPTY_PROFESSOR_NOVELTY_SUMMARY))),
    defaultValue: EMPTY_PROFESSOR_NOVELTY_SUMMARY,
  });

  readonly summary = computed(
    () => this.summaryResource.value() ?? EMPTY_PROFESSOR_NOVELTY_SUMMARY,
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
    mapNoveltyContractValueRows(this.summary().valorContratacion),
  );

  readonly activityTables = computed(() =>
    mapActivitySummaryTables(this.summary().horasActividades),
  );

  readonly costCenterRows = computed(() =>
    mapCostCenterRows(this.summary().centrosCosto),
  );

  readonly observations = computed(() => this.summary().observaciones ?? []);

  readonly noveltyRows = computed(() =>
    mapNoveltyHistoryRows(this.summary().novedades),
  );

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      const idCargaDocente = this.professor()?.idCargaDocente;

      if (!isOpen || idCargaDocente == null) {
        return;
      }

      untracked(() => {
        this.expandedSections.set(createInitialNoveltyExpandedSections());
      });
    });
  }

  isSectionExpanded(sectionId: NoveltySummarySectionId): boolean {
    return this.expandedSections()[sectionId];
  }

  onSectionExpandedChange(
    sectionId: NoveltySummarySectionId,
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

  observationDateLabel(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) {
      return value;
    }

    const [, year, month, day, hour, minute] = match;
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  private resolveSummaryParams(): { idCargaDocente: number } | undefined {
    if (!this.isOpen()) {
      return undefined;
    }

    const idCargaDocente = this.professor()?.idCargaDocente;
    if (idCargaDocente == null) {
      return undefined;
    }

    return { idCargaDocente };
  }
}
