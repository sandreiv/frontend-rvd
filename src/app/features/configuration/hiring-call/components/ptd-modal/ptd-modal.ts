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
import { forNext } from '../../../../../core/utils/for-next.function';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { mapActivitySummaryTables } from '../../../professor-preload/model/professor-summary.model';
import { HiringCallService } from '../../data/hiring-call.service';
import { ProfessorInformationItem } from '../../model/hiring-call.model';

type PtdSectionId = 'detalle-actividades' | 'observaciones';

interface PtdSectionConfig {
  id: PtdSectionId;
  title: string;
  icon: AppIconName;
  iconBgClass: string;
  iconColorClass: string;
}

const PTD_SECTIONS: PtdSectionConfig[] = [
  {
    id: 'detalle-actividades',
    title: 'Detalle actividades',
    icon: 'academicCap',
    iconBgClass: 'bg-brand-50 dark:bg-brand-500/10',
    iconColorClass: 'text-brand-600 dark:text-brand-400',
  },
  {
    id: 'observaciones',
    title: 'Observación',
    icon: 'chatBubbleBottomCenterText',
    iconBgClass: 'bg-error-50 dark:bg-error-500/10',
    iconColorClass: 'text-error-500 dark:text-error-400',
  },
];

function createInitialExpandedSections(): Record<PtdSectionId, boolean> {
  return {
    'detalle-actividades': false,
    observaciones: false,
  };
}

interface HeaderChip {
  id: string;
  label: string;
  icon?: AppIconName;
}

@Component({
  selector: 'app-ptd-modal',
  imports: [Modal, Icon, CollapsibleSection],
  templateUrl: './ptd-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PtdModal {
  private readonly hiringCallService = inject(HiringCallService);

  readonly isOpen = input(false);
  readonly idCargaDocente = input<number | null>(null);
  readonly close = output<void>();

  readonly observation = signal('');
  readonly sections = PTD_SECTIONS;
  readonly expandedSections = signal(createInitialExpandedSections());

  readonly informationResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) =>
      this.hiringCallService.getProfessorInformation(params.idCargaDocente),
  });

  readonly information = computed(() => {
    if (!this.isOpen() || !this.informationResource.hasValue()) {
      return null;
    }
    return this.informationResource.value();
  });

  readonly isLoading = computed(
    () => this.isOpen() && this.informationResource.isLoading(),
  );

  readonly activityTables = computed(() => {
    if (!this.isOpen()) {
      return [];
    }
    return mapActivitySummaryTables(this.information()?.horasActividades);
  });

  readonly titleName = computed(() => {
    const name = this.information()?.nombreCompleto?.trim();
    return name || 'Plan de trabajo';
  });

  readonly titleDocument = computed(
    () => this.information()?.documentoIdentidad?.trim() || '',
  );

  readonly headerChips = computed(() =>
    this.buildHeaderChips(this.information()),
  );

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      const idCargaDocente = this.idCargaDocente();

      if (!isOpen || idCargaDocente == null) {
        return;
      }

      untracked(() => {
        this.expandedSections.set(createInitialExpandedSections());
        this.observation.set('');
      });
    });
  }

  isSectionExpanded(sectionId: PtdSectionId): boolean {
    return this.expandedSections()[sectionId];
  }

  onSectionExpandedChange(sectionId: PtdSectionId, expanded: boolean): void {
    this.expandedSections.update((current) => ({
      ...current,
      [sectionId]: expanded,
    }));
  }

  hoursLabel(hours: number): string {
    return `${hours ?? 0}h`;
  }

  onObservationInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.observation.set(textarea.value);
  }

  private resolveInformationParams(): { idCargaDocente: number } | undefined {
    if (!this.isOpen()) {
      return undefined;
    }

    const idCargaDocente = this.idCargaDocente();
    if (idCargaDocente == null) {
      return undefined;
    }

    return { idCargaDocente };
  }

  private buildHeaderChips(
    information: ProfessorInformationItem | null,
  ): HeaderChip[] {
    if (!information) {
      return [];
    }

    const chips: HeaderChip[] = [];
    const candidates: Array<HeaderChip | null> = [
      this.toChip('modalidad', null, information.modalidadContratacion),
      this.toChip('categoria', 'Categoría', information.categoriaDocente),
      this.toChip('puntos', 'Puntos', information.puntos),
      this.toDateChip(information.fechaInicio, information.fechaFin),
      this.toChip('direccion', 'Dirección', information.direccionDomicilio),
      this.toChip('correo-personal', 'Personal', information.correoPersonal),
      this.toChip(
        'correo-institucional',
        'Institucional',
        information.correoInstitucional,
      ),
    ];

    forNext(candidates, (chip) => {
      if (chip) {
        chips.push(chip);
      }
    });

    return chips;
  }

  private toChip(
    id: string,
    prefix: string | null,
    value: string | number | null | undefined,
    icon?: AppIconName,
  ): HeaderChip | null {
    const text = this.displayText(value);
    if (text === '-') {
      return null;
    }

    return {
      id,
      label: prefix ? `${prefix} · ${text}` : text,
      icon,
    };
  }

  private toDateChip(
    fechaInicio: string | null | undefined,
    fechaFin: string | null | undefined,
  ): HeaderChip | null {
    const start = this.displayDate(fechaInicio);
    const end = this.displayDate(fechaFin);

    if (start === '-' && end === '-') {
      return null;
    }

    if (start === '-') {
      return { id: 'fechas', label: end, icon: 'calendar' };
    }

    if (end === '-') {
      return { id: 'fechas', label: start, icon: 'calendar' };
    }

    return {
      id: 'fechas',
      label: `${start} — ${end}`,
      icon: 'calendar',
    };
  }

  private displayText(value: string | number | null | undefined): string {
    if (value == null) {
      return '-';
    }

    const text = String(value).trim();
    return text || '-';
  }

  private displayDate(value: string | null | undefined): string {
    const text = value?.trim();
    if (!text) {
      return '-';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (!match) {
      return text;
    }

    return `${match[3]}/${match[2]}/${match[1]}`;
  }
}
