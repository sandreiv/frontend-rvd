import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { HiringCallService } from '../../data/hiring-call.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { forNext } from '../../../../../core/utils/for-next.function';
import { ProfessorInformationItem } from '../../model/hiring-call.model';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { mapActivitySummaryTables, mapCostCenterRows } from '../../../professor-preload/model/professor-summary.model';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { Button } from '../../../../../shared/ui/button/button';
import { mapNoveltyContractValueRows } from '../../../professor-preload/model/novelty-summary.model';

type DraftSectionId = 'informacion-cdp-valores' | 'centros-costo' | 'detalle-actividades';

interface DraftSectionConfig {
  id: DraftSectionId;
  title: string;
  icon: AppIconName;
  iconBgClass: string;
  iconColorClass: string;
}

interface HeaderChip {
  id: string;
  label: string;
  icon?: AppIconName;
}

const DRAFT_SECTIONS: DraftSectionConfig[] = [
  {
    id: 'informacion-cdp-valores',
    title: 'Información CDP - Valores de contratación',
    icon: 'identification',
    iconBgClass: 'bg-success-50 dark:bg-success-500/10',
    iconColorClass: 'text-success-600 dark:text-success-400',
  },
  {
    id: 'centros-costo',
    title: 'Centros de costo',
    icon: 'briefcase',
    iconBgClass: 'bg-warning-50 dark:bg-warning-500/10',
    iconColorClass: 'text-warning-600 dark:text-warning-400',
  },
  {
    id: 'detalle-actividades',
    title: 'Detalle de actividades',
    icon: 'academicCap',
    iconBgClass: 'bg-brand-50 dark:bg-brand-500/10',
    iconColorClass: 'text-brand-600 dark:text-brand-400',
  },
];

function createInitialExpandedSections(): Record<DraftSectionId, boolean> {
  return {
    'informacion-cdp-valores': false,
    'centros-costo': false,
    'detalle-actividades': false,
  };
}

@Component({
  selector: 'app-draft-contract',
  imports: [Modal, Icon, CollapsibleSection, Button],
  templateUrl: './draft-contract.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftContract {

  private readonly hiringCallService = inject(HiringCallService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = input(false);
  readonly idCargaDocente = input<number | null>(null);
  readonly idPeriodoUniversitario = input<number | null>(null);
  readonly idCoordinacion = input<number | null>(null);
  readonly nombreUnidad = input<string | null>(null);
  readonly nombreCoordinacion = input<string | null>(null);

  readonly close = output<void>();

  readonly expandedSections = signal(createInitialExpandedSections());

  readonly isDownloadingContract = signal(false);

  readonly informationResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) =>
      this.hiringCallService.getProfessorInformation(params.idCargaDocente),
  });

  readonly ptdInfoWithWeightsResource = rxResource({
    params: () => {
      const informationParams = this.resolveInformationParams();
      const idPersonaGeneral = this.information()?.idPersonaGeneral;

      if (informationParams == null || idPersonaGeneral == null) {
        return undefined;
      }

      return { ...informationParams, idPersonaGeneral};
    },
    stream: ({ params }) => this.hiringCallService.getInfoPtdWithWeights(
      params.idPersonaGeneral,
      params.idCargaDocente,
      params.idPeriodoUniversitario
    )
  });

  readonly hiringCdpResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) =>
      this.hiringCallService.getHiringCdpInformation(params.idPeriodoUniversitario, params.idCoordinacion),
  });

  readonly hiringValuesResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) =>
      this.hiringCallService.getHiringValuesInformation(params.idCargaDocente),
  });

  readonly information = computed(() => {
    if (!this.isOpen() || !this.informationResource.hasValue()) {
      return null;
    }
    return this.informationResource.value();
  });

  readonly ptdInfoWithWeights = computed(() => {
    if (!this.isOpen() || !this.ptdInfoWithWeightsResource.hasValue()) {
      return null;
    }
    return this.ptdInfoWithWeightsResource.value();
  });

  readonly hiringCdpInformation = computed(() => {
    if (!this.isOpen() || !this.hiringCdpResource.hasValue()) {
      return null;
    }

    return this.hiringCdpResource.value();
  });

  readonly hiringValuesInformation = computed(() => {
    if (!this.isOpen() || !this.hiringValuesResource.hasValue()) {
      return null;
    }

    return this.hiringValuesResource.value();
  });


  readonly isLoadingContract = computed(
    () => this.isOpen() && (
      this.informationResource.isLoading() ||
      this.ptdInfoWithWeightsResource.isLoading() ||
      this.hiringCdpResource.isLoading() ||
      this.hiringValuesResource.isLoading()
    ),
  );

  readonly summaryActivityTables = computed(() => {
    if (!this.isOpen()) {
      return [];
    }
    return mapActivitySummaryTables(this.information()?.horasActividades);
  });

  readonly observacion = computed(() => this.ptdInfoWithWeights()?.observacion?.descripcion ?? '');

  readonly costCenterRows = computed(() => mapCostCenterRows(this.hiringValuesInformation()?.centrosCosto));

  readonly assignedCdp = computed(() => this.hiringCdpInformation() ?? null);

  readonly contractValueRows = computed(() => mapNoveltyContractValueRows(this.hiringValuesInformation()?.valorContratacion));

  
  readonly titleName = computed(() => {
    const name = this.information()?.nombreCompleto?.trim();
    return name || 'Contrato';
  });

  readonly titleDocument = computed(
    () => this.information()?.documentoIdentidad?.trim() || '',
  );

  readonly headerChips = computed(() =>
    this.buildHeaderChips(this.information()),
  );

  readonly sections = computed(() => DRAFT_SECTIONS);


  isSectionExpanded(sectionId: DraftSectionId): boolean {
    return this.expandedSections()[sectionId];
  }

  onSectionExpandedChange(sectionId: DraftSectionId, expanded: boolean): void {
    this.expandedSections.update((current) => ({
      ...current,
      [sectionId]: expanded,
    }));
  }

  hoursLabel(hours: number): string {
    return `${hours ?? 0}h`;
  }

  
  private buildHeaderChips(
    information: ProfessorInformationItem | null,
  ): HeaderChip[] {
    if (!information) {
      return [];
    }

    const chips: HeaderChip[] = [];
    const candidates: Array<HeaderChip | null> = [
      this.toChip('unidad', 'Unidad regional', this.nombreUnidad()),
      this.toChip('coordinacion', null, this.nombreCoordinacion()),
      this.toChip('modalidad', null, information.modalidadContratacion),
      this.toChip('categoria', 'Categoría', information.categoriaDocente),
      this.toChip('puntos', 'Puntos', information.puntos),
      this.toChip('forma-pago', 'Forma de pago', information.formaPago),
      this.toChip('categorizacion', 'Estado categorización', information.estadoCategorizacion),
      this.toChip('asignacion', 'Asignación salarial', this.displayCurrency(information.asignacionSalarial)),
      this.toChip('horas', 'Horas', information.horas),
      this.toDateChip(information.fechaInicio, information.fechaFin),
      this.toChip('direccion', 'Dirección', information.direccionDomicilio),
      this.toChip('correo-personal', 'Personal', information.correoPersonal),
      this.toChip('correo-institucional', 'Institucional', information.correoInstitucional),
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

  private displayCurrency(value: number | null | undefined): string | null {
    if (value == null || Number.isNaN(value)) {
      return null;
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private displayText(value: string | number | null | undefined): string {
    if (value == null) {
      return '-';
    }

    const text = String(value).trim();
    return text || '-';
  }

  public displayDate(value: string | null | undefined): string {
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

  /**
   * Descarga el anexo de contratación del docente que se está diligenciando.
   */
  downloadContract(): void {
    const idCargaDocente = this.idCargaDocente();

    if (idCargaDocente == null || this.isDownloadingContract()) {
      return;
    }

    this.isDownloadingContract.set(true);
    this.hiringCallService
      .downloadContractPdf(idCargaDocente)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDownloadingContract.set(false)),
      )
      .subscribe(({ blob, fileName }) => {
        this.triggerBrowserDownload(blob, fileName);
      });
  }

  private triggerBrowserDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  private resolveInformationParams(): { idCargaDocente: number, idPeriodoUniversitario: number, idCoordinacion: number } | undefined {
    if (!this.isOpen()) {
      return undefined;
    }

    const idCargaDocente = this.idCargaDocente();
    const idPeriodoUniversitario = this.idPeriodoUniversitario();
    const idCoordinacion = this.idCoordinacion();
    if (idCargaDocente == null || idPeriodoUniversitario == null || idCoordinacion == null) {
      return undefined;
    }

    return { idCargaDocente, idPeriodoUniversitario, idCoordinacion };
  }
}
