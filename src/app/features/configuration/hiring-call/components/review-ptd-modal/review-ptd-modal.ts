import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forNext } from '../../../../../core/utils/for-next.function';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { mapActivitySummaryTables } from '../../../professor-preload/model/professor-summary.model';
import { HiringCallService } from '../../data/hiring-call.service';
import { ActivityWeights, ApprovePtdRequest, ObservacionPtd, PdtInfoWithWeights, ProfessorInformationItem, RejectPtdRequest, SavePtdPayload, SavePtdRequest, SummaryPtdActivity } from '../../model/hiring-call.model';
import { Button } from '../../../../../shared/ui/button/button';
import { FormArray, FormControl, FormGroup, Validators, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import { finalize, firstValueFrom } from 'rxjs';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { PermissionService } from '../../../../../core/service/permission-service';
import { NotificationService } from '../../../../../core/service/notification-service';
import { Checkbox } from '../../../../../shared/components/form/input/checkbox';
import { PublicSupportDocumentFile } from '../../../../public-view/hiring/model/hiring.model';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';

type PtdReviewSectionId = 'detalle-actividades' | 'ptd-actividades' | 'attachments';

interface PtdReviewSectionConfig {
  id: PtdReviewSectionId;
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

const REVIEW_SECTIONS: PtdReviewSectionConfig[] = [
  {
    id: 'detalle-actividades',
    title: 'Detalle actividades',
    icon: 'academicCap',
    iconBgClass: 'bg-brand-50 dark:bg-brand-500/10',
    iconColorClass: 'text-brand-600 dark:text-brand-400',
  },
  {
    id: 'ptd-actividades',
    title: 'Detalle actividades PTD',
    icon: 'clipboardDocumentList',
    iconBgClass: 'bg-warning-50 dark:bg-warning-500/15',
    iconColorClass: 'text-warning-700 dark:text-warning-400',
  },
  {
    id: 'attachments',
    title: 'Adjuntos',
    icon: 'file',
    iconBgClass: 'bg-sky-50 dark:bg-sky-500/15',
    iconColorClass: 'text-sky-600 dark:text-sky-400',
  },
];

function createInitialExpandedSections(): Record<PtdReviewSectionId, boolean> {
  return {
    'detalle-actividades': false,
    'ptd-actividades': false,
    'attachments': false,
  };
}

@Component({
  selector: 'app-review-ptd-modal',
  imports: [Modal, Icon, CollapsibleSection, Button, ReactiveFormsModule, Checkbox, Tooltip],
  templateUrl: './review-ptd-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPtdModal {
  private readonly hiringCallService = inject(HiringCallService);
  private readonly permissions = inject(PermissionService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input(false);
  readonly idCargaDocente = input<number | null>(null);
  readonly idPeriodoUniversitario = input<number | null>(null);

  readonly successRequest = output<void>();
  readonly close = output<void>();

  readonly isSavingPtd = signal(false);
  readonly savingAction = signal<'approve' | 'reject' | null>(null);
  readonly ptdObservationError = signal(false);
  readonly observationForm = this.fb.group({
    observacion: [''],
  });
  readonly selectedAttachmentIds = signal<ReadonlySet<string>>(new Set());
  readonly expandedSections = signal(createInitialExpandedSections());

  readonly englishLevels: Option[] = [
    { value: 'A1', label: 'A1 (Principiante)' },
    { value: 'A2', label: 'A2 (Principiante)' },
    { value: 'B1', label: 'B1 (Intermedio)' },
    { value: 'B2', label: 'B2 (Intermedio)' },
    { value: 'C1', label: 'C1 (Avanzado)' },
    { value: 'C2', label: 'C2 (Avanzado)' },
  ];
  

  // Construir vista de ptd con actividades
  readonly informationResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) =>
      this.hiringCallService.getProfessorInformation(params.idCargaDocente),
  });

  readonly ptdActivitiesResource = rxResource({
    params: () => this.resolveInformationParams(),
    stream: ({ params }) => this.hiringCallService.listPtdActivities(params.idCargaDocente),
  });

  // Poblar modal PTD
  readonly ptdInfoWithWeightsResource = rxResource({
    params: () => {
      const idCargaDocente = this.idCargaDocente();
      const idPersonaGeneral = this.information()?.idPersonaGeneral;
      const idPeriodoUniversitario = this.idPeriodoUniversitario();

      if (!this.isOpen() || idCargaDocente == null || idPersonaGeneral == null || idPeriodoUniversitario == null) {
        return undefined;
      }

      return { idPersonaGeneral, idCargaDocente, idPeriodoUniversitario };
    },
    stream: ({ params }) => this.hiringCallService.getInfoPtdWithWeights(
      params.idPersonaGeneral,
      params.idCargaDocente,
      params.idPeriodoUniversitario
    )
  });

  // Obtener adjuntos de un PTD
  readonly ptdAttachmentsResource = rxResource({
    params: () => {
      const idCargaDocente = this.idCargaDocente();
      const idPersonaGeneral = this.information()?.idPersonaGeneral;
      const idPeriodoUniversitario = this.idPeriodoUniversitario();

      if (!this.isOpen() || idCargaDocente == null || idPersonaGeneral == null || idPeriodoUniversitario == null) {
        return undefined;
      }

      return { idPersonaGeneral, idCargaDocente, idPeriodoUniversitario };
    },
    stream: ({ params }) => this.hiringCallService.getAttachments(
      params.idPersonaGeneral,
      params.idCargaDocente,
      params.idPeriodoUniversitario
    )
  });

  // Obtener tipos de adjuntos
  readonly supportDocumentCategoriesResource = rxResource({
    stream: () => this.hiringCallService.getAttachmentCategories()
  });


  readonly information = computed(() => {
    if (!this.isOpen() || !this.informationResource.hasValue()) {
      return null;
    }
    return this.informationResource.value();
  });

  readonly ptdActivities = computed(() => {
    if (!this.isOpen() || !this.ptdActivitiesResource.hasValue()) {
      return null;
    }
    return this.ptdActivitiesResource.value();
  });

  readonly ptdInfoWithWeights = computed(() => {
    if (!this.isOpen() || !this.ptdInfoWithWeightsResource.hasValue()) {
      return null;
    }
    return this.ptdInfoWithWeightsResource.value();
  });

  readonly isLoadingReview = computed(
    () => this.isOpen() && (
      this.informationResource.isLoading() ||
      this.ptdActivitiesResource.isLoading() ||
      this.ptdInfoWithWeightsResource.isLoading() ||
      this.ptdAttachmentsResource.isLoading()
    ),
  );

  readonly summaryActivityTables = computed(() => {
    if (!this.isOpen()) {
      return [];
    }
    return mapActivitySummaryTables(this.information()?.horasActividades);
  });

  readonly ptdActivityTables = computed(() => {
    if (!this.isOpen()) {
      return [];
    }
    return this.ptdActivities() ?? [];
  });

  readonly titleName = computed(() => {
    const name = this.information()?.nombreCompleto?.trim();
    return name || 'Revisión al plan de trabajo';
  });

  readonly titleDocument = computed(
    () => this.information()?.documentoIdentidad?.trim() || '',
  );

  readonly headerChips = computed(() =>
    this.buildHeaderChips(this.information()),
  );

  readonly attachmentCategories = computed(() => {
    const availableCategories = this.supportDocumentCategoriesResource.value() ?? [];
    const ptdDocuments = this.ptdAttachmentsResource.value();

    const filesByCategory = new Map(
      (ptdDocuments?.categorias ?? []).map((category) => [
        category.codigo,
        category.archivos ?? [],
      ]),
    );

    return availableCategories.map((category) => ({
      ...category,
      archivos: filesByCategory.get(category.codigo) ?? [],
    }));
  });

  // Verifica que las categorias obligatorias tengan adjuntos para aprobar el PTD
  readonly hasAttachmentsInRequiredCategories = computed(() => {
    return this.attachmentCategories()
      .filter(category => category.obligatorio)
      .every(category => (category.archivos ?? []).length > 0);
  })

  readonly selectedAttachmentCount = computed(() => this.selectedAttachmentIds().size);

  readonly sections = computed (() => REVIEW_SECTIONS);
  readonly observacion = computed(() => this.ptdInfoWithWeights()?.observacion?.descripcion ?? '');
  
  readonly canApprovePtd = computed(() => this.permissions.canApprovePtdTh());
  readonly canRejectPtd = computed(() => this.permissions.canDeclinePtdTh());
  readonly canSubmitReview = computed(() => this.permissions.canReviewPtd());
  readonly showPtdObservationError = computed(() => this.canRejectPtd() && this.ptdObservationError());

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      if (!isOpen) {
        return;
      }

      untracked(() => {
        this.expandedSections.set(createInitialExpandedSections());
        this.resetPtdObservation();
        this.selectedAttachmentIds.set(new Set());
      });
    });
  }

  isSectionExpanded(sectionId: PtdReviewSectionId): boolean {
    return this.expandedSections()[sectionId];
  }

  onSectionExpandedChange(sectionId: PtdReviewSectionId, expanded: boolean): void {
    this.expandedSections.update((current) => ({
      ...current,
      [sectionId]: expanded,
    }));
  }

  isAttachmentSelected(id: string): boolean {
    return this.selectedAttachmentIds().has(id);
  }

  onAttachmentSelectionChange(id: string, checked: boolean): void {
    this.selectedAttachmentIds.update((current) => {
      const updated = new Set(current);

      if (checked) {
        updated.add(id);
      } else {
        updated.delete(id);
      }

      return updated;
    });
  }

  formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '—';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  hoursLabel(hours: number): string {
    return `${hours ?? 0}h`;
  }

  isSecondLanguage(criterio: string): boolean {
    return criterio.trim().toLocaleLowerCase() === 'lengua extranjera'
  }

  getStoredWeight(idTipoActividad: number): string | null {
    const activity = this.findStoredActivity(idTipoActividad);
    return activity?.ponderado != null
      ? `${activity.ponderado} %`
      : null;
  }

  getStoredLevel(idTipoActividad: number): string | null {
    const activity = this.findStoredActivity(idTipoActividad);

    return this.englishLevels.find(level =>
      level.value === activity?.nivel
    )?.label ?? null;
  }

  closeModal(): void {
    if (this.isSavingPtd()) {
      return;
    }

    this.resetPtdObservation();
    this.close.emit();
  }

  /*
  canPreview(archivo: PublicSupportDocumentFile): boolean {
    const extension =
      (archivo.extension ?? '')
      .replace('.', '')
      .trim()
      .toLowerCase();

      return ['pdf', 'jpg', 'jpeg', 'png'].includes(extension);
  }
  */

  async onApprove(): Promise<void> {
    const idPersonaGeneral = this.information()?.idPersonaGeneral;
    const idCargaDocente = this.idCargaDocente();
    const idPeriodoUniversitario = this.idPeriodoUniversitario();

    if (idPersonaGeneral == null || idPeriodoUniversitario == null || idCargaDocente == null || this.isSavingPtd() || !this.canApprovePtd()) {
      return;
    }

    if (!this.hasAllAttachmentsSelected()) {
      this.notificationService.error(
        'Debe seleccionar todos los archivos adjuntos para aprobar el PTD.',
        'Adjuntos pendientes',
      );
      return;
    }


    const request: ApprovePtdRequest = {
      idPersonaGeneral,
      idPeriodoUniversitario,
      idCargaDocente,
      idsDocumentosAdjuntos: this.getSelectedAttachmentIds()
    }

    this.savingAction.set('approve');
    this.isSavingPtd.set(true);

    try {
      await firstValueFrom(this.hiringCallService.approvePtdByTh(request));

      this.notificationService.success(
        'El plan de trabajo fue aprobado correctamente.',
        'PTD aprobado',
      );
      this.finishPtdReview();
    } catch (error) {
      console.error(error);
    } finally {
      this.isSavingPtd.set(false);
      this.savingAction.set(null);
    }
  }

  async onReject(): Promise<void> {
    const idPersonaGeneral = this.information()?.idPersonaGeneral;
    const idCargaDocente = this.idCargaDocente();
    const idPeriodoUniversitario = this.idPeriodoUniversitario();

    if (idPersonaGeneral == null || idPeriodoUniversitario == null || idCargaDocente == null || this.isSavingPtd() || !this.canRejectPtd()) {
      return;
    }

    if (this.observationForm.invalid) {
      this.observationForm.markAllAsTouched();
      return;
    }

    const observacion = this.observationForm.controls.observacion.value?.trim();
    if (!observacion) {
      this.ptdObservationError.set(true);
      return;
    }

    const request: RejectPtdRequest = {
      idPersonaGeneral,
      idPeriodoUniversitario,
      idCargaDocente,
      idsDocumentosAdjuntos: this.getSelectedAttachmentIds(),
      observacion
    }

    this.savingAction.set('reject');
    this.isSavingPtd.set(true);

    try {
      await firstValueFrom(this.hiringCallService.declinePtdByTh(request));

      this.notificationService.success(
        'El plan de trabajo fue rechazado correctamente.',
        'PTD rechazado',
      );
      this.finishPtdReview();
    } catch (error) {
      console.error(error);
    } finally {
      this.isSavingPtd.set(false);
      this.savingAction.set(null);
    }
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

  private findStoredActivity(idTipoActividad: number): ActivityWeights | undefined {
    return (this.ptdInfoWithWeights()?.actividades
      .find((activity: ActivityWeights) => activity.idTipoActividad === idTipoActividad)
    );
  }

  private finishPtdReview(): void {
    this.resetPtdObservation();
    this.successRequest.emit();
    this.close.emit();
  }

  private resetPtdObservation(): void {
    this.observationForm.reset({ observacion: '' });
    this.ptdObservationError.set(false);
  }

  private getSelectedAttachmentIds(): string[] {
    return [...this.selectedAttachmentIds()];
  }

  // Verifica que los adjuntos sin estados sean todos los documentos seleccionados para aprobar
  private hasAllAttachmentsSelected(): boolean {
    const allAttachmentIds = this.attachmentCategories()
      .flatMap(category => category.archivos ?? [])
      .filter(archivo => archivo.estado == null)
      .map(archivo => String(archivo.id));

    const selectedIds = this.selectedAttachmentIds();

    return (
      allAttachmentIds.length === selectedIds.size &&
      allAttachmentIds.every(id => selectedIds.has(id))
    );
  }
}