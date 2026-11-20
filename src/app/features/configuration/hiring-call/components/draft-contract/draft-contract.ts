import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { HiringCallService } from '../../data/hiring-call.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { forNext } from '../../../../../core/utils/for-next.function';
import { ContractAnexo, ProfessorInformationItem } from '../../model/hiring-call.model';
import { AppIconName } from '../../../../../shared/ui/icon/icons';
import { mapActivitySummaryTables, mapCostCenterRows } from '../../../professor-preload/model/professor-summary.model';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { Button } from '../../../../../shared/ui/button/button';
import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import { mapNoveltyContractValueRows } from '../../../professor-preload/model/novelty-summary.model';

type DraftSectionId = 'informacion-cdp-valores' | 'centros-costo' | 'detalle-actividades';
export type ContractOperation = 'GENERAR' | 'VINCULAR';

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
  imports: [Modal, Icon, CollapsibleSection, Button, ReactiveFormsModule, InputField, DatePicker, Select],
  templateUrl: './draft-contract.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftContract {

  private readonly hiringCallService = inject(HiringCallService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isOpen = input(false);
  readonly idCargaDocente = input<number | null>(null);
  readonly idPeriodoUniversitario = input<number | null>(null);
  readonly idCoordinacion = input<number | null>(null);
  readonly numeroPeriodo = input<string | null>(null);
  readonly nombreUnidad = input<string | null>(null);
  readonly nombreCoordinacion = input<string | null>(null);

  readonly close = output<void>();

  readonly expandedSections = signal(createInitialExpandedSections());

  readonly isDownloadingContract = signal(false);
  readonly contractOperation = signal<ContractOperation>('VINCULAR');

  /**
   * Panel desplegable con los datos que el usuario debe diligenciar antes de
   * generar el anexo (número de anexo y fecha de ingreso).
   */
  readonly isContractPanelOpen = signal(false);

  readonly contractForm = this.formBuilder.group({
    numeroAnexo: ['', [Validators.required, Validators.maxLength(15)]],
    fechaFirma: ['', [Validators.required]],
    fechaInicio: ['', [Validators.required]],
    fechaFin: [{ value: '', disabled: true }],
    formaPagoId: ['', [Validators.required]],
    tipoObjetoId: ['', [Validators.required]],
    formaInicioContratoId: ['', [Validators.required]],
    laborId: ['', [Validators.required]],
    objeto: ['', [Validators.required]],
    descripcion: ['', [Validators.required]]
  });

  /**
   * Catálogos de los dos selects del panel: forma de pago
   * (BIENESV3.FORMAPAGO) y tipo de objeto contractual (CONTRATOS.TIPOOBJETO).
   */
  readonly contractCatalogsResource = rxResource({
    params: () => (this.isOpen() ? { open: true } as const : undefined),
    stream: () => this.hiringCallService.getContractCatalogs(),
  });

  /**
   * Datos del anexo del contrato ya generado. Se cargan al abrir el panel del
   * anexo para que el usuario vea lo que ya fue diligenciado y pueda
   * modificarlo (en generar) o solo la labor docente (en vincular).
   */
  readonly contractAnexoResource = rxResource({
    params: () => {
      const idCargaDocente = this.idCargaDocente();
      if (!this.isContractPanelOpen() || idCargaDocente == null) {
        return undefined;
      }

      return { idCargaDocente };
    },
    stream: ({ params }) => this.hiringCallService.getContractAnexo(params.idCargaDocente),
  });

  /**
   * Datos del anexo ya guardados del contrato del docente (null si todavía
   * no se generó el contrato).
   */
  readonly anexoGenerado = computed(() => {
    const resource = this.contractAnexoResource;

    if (!resource.hasValue()) {
      return null;
    }

    return resource.value() ?? null;
  });

  /**
   * En la vinculación los datos del anexo ya vienen diligenciados: se
   * muestran bloqueados y en gris para que solo se diligencie la labor.
   *
   * <p>Mientras se consultan los datos ya guardados se mantienen bloqueados
   * por seguridad. Si el docente no tiene contrato generado (carga antigua)
   * los campos quedan editables para que la vinculación no quede a medias.</p>
   */
  readonly isAnexoReadonly = computed(() => {
    if (this.contractOperation() !== 'VINCULAR') {
      return false;
    }

    const status = this.contractAnexoResource.status();
    if (status === 'loading' || status === 'reloading') {
      return true;
    }

    return this.anexoGenerado() !== null;
  });

  /**
   * En la vinculación los datos que ya traíos del contrato quedan
   * bloqueados: solo se diligencia la labor docente.
   */
  readonly isVinculacionBloqueada = computed(() => this.contractOperation() === 'VINCULAR');

  readonly contractCatalogs = computed(() => {
    if (!this.isOpen() || !this.contractCatalogsResource.hasValue()) {
      return null;
    }
    return this.contractCatalogsResource.value();
  });

  readonly formaPagoOptions = computed<Option[]>(() =>
    (this.contractCatalogs()?.formasPago ?? []).map((item) => ({
      value: String(item.id),
      label: item.descripcion,
    })),
  );

  readonly tipoObjetoOptions = computed<Option[]>(() =>
    (this.contractCatalogs()?.tiposObjeto ?? []).map((item) => ({
      value: String(item.id),
      label: item.descripcion,
    })),
  );

  readonly formaInicioContratoOptions = computed<Option[]>(() =>
    (this.contractCatalogs()?.formasInicioContrato ?? []).map((item) => ({
      value: String(item.id),
      label: item.descripcion
    }))
  );

  readonly laborOptions = computed<Option[]>(() =>
    (this.contractCatalogs()?.labores ?? []).map((item) => ({
      value: String(item.id),
      label: item.descripcion
    }))
  );

  private readonly contractFormStatus = toSignal(this.contractForm.statusChanges, {
    initialValue: this.contractForm.status,
  });

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
      this.hiringCallService.getHiringValuesInformation(params.idCargaDocente, params.numeroPeriodo),
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

  /**
   * El botón Diligenciar contrato solo se habilita con los dos campos llenos
   * y sin peticiones en curso.
   */
  readonly canDownloadContract = computed(
    () =>
      this.contractFormStatus() === 'VALID' &&
      !this.isDownloadingContract() &&
      !this.isLoadingContract() &&
      !this.isContractLinked()
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.isContractPanelOpen.set(false);
        this.contractForm.reset();
      }
    });

    // Los datos del anexo ya diligenciados al generar el contrato se
    // precargan: al generar el contrato el usuario los ve y los puede
    // modificar; al vincular el docente solo queda por diligenciar la labor.
    effect(() => {
      this.precargarAnexo(this.anexoGenerado());
    });

    // Al vincular, los datos del anexo que ya traídos del contrato quedan
    // bloqueados: solo se diligencia la labor docente.
    effect(() => {
      this.isAnexoReadonly();
      this.syncAnexoDisabledState();
    });
  }

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

  readonly isContractLinked = computed(() => this.information()?.contratacionVinculado === '1');
  readonly hasContractNumber = computed(() => !!this.information()?.numeroContrato?.trim());
  readonly canLinkContract = computed(
    () =>
      this.hasContractNumber() &&
      !this.isContractLinked() &&
      !this.isDownloadingContract() &&
      !this.isLoadingContract(),
  );
  readonly submitContractLabel = computed(() => {
    if (this.isDownloadingContract()) {
      return this.contractOperation() === 'GENERAR'
        ? 'Generando contrato...'
        : 'Vinculando docente...';
    }

    return this.contractOperation() === 'GENERAR'
      ? 'Generar contrato'
      : 'Vincular docente';
  });


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

  
  private configureContractFormValidation(operation: ContractOperation): void {
    const controls = this.contractForm.controls;

    controls.numeroAnexo.setValidators([Validators.required, Validators.maxLength(15)]);
    controls.fechaFin.setValidators([Validators.required]);

    if (operation === 'VINCULAR') {
      controls.numeroAnexo.disable({ emitEvent: false });
      controls.fechaInicio.disable({ emitEvent: false });
    } else {
      controls.numeroAnexo.enable({ emitEvent: false });
      controls.fechaInicio.enable({ emitEvent: false });
    }
    controls.fechaFin.disable({ emitEvent: false });

    // Los datos del anexo son obligatorios en las dos operaciones: al generar
    // el contrato y al vincular al docente.
    const anexoControls = [
      controls.fechaFirma,
      controls.formaPagoId,
      controls.tipoObjetoId,
      controls.formaInicioContratoId,
      controls.objeto,
      controls.descripcion,
    ];

    forNext(anexoControls, (control) => {
      control.setValidators([Validators.required]);
      control.updateValueAndValidity({ emitEvent: false });
    });

    // La labor docente solo aplica cuando se vincula al docente.
    if (operation === 'VINCULAR') {
      controls.laborId.setValidators([Validators.required]);
    } else {
      controls.laborId.clearValidators();
      controls.laborId.setValue('');
    }
    controls.laborId.updateValueAndValidity({ emitEvent: false });

    controls.numeroAnexo.updateValueAndValidity({ emitEvent: false });
    controls.fechaInicio.updateValueAndValidity({ emitEvent: false });
    controls.fechaFin.updateValueAndValidity({ emitEvent: false });

    this.contractForm.updateValueAndValidity();
    this.contractForm.markAsUntouched();
  }
  
  /**
   * Precarga los datos del anexo ya diligenciados.
   *
   * <p>Solo se llenan los campos que están vacíos: así el usuario ve lo que
   * ya había registrado y lo puede modificar, sin que se pise lo que acaba
   * de escribir en la misma sesión.</p>
   */
  private precargarAnexo(anexo: ContractAnexo | null): void {
    if (!anexo) {
      return;
    }

    const controls = this.contractForm.controls;

    if (!controls.numeroAnexo.value && anexo.numeroAnexo) {
      controls.numeroAnexo.setValue(anexo.numeroAnexo);
    }
    if (!controls.fechaFirma.value && anexo.fechaFirma) {
      controls.fechaFirma.setValue(anexo.fechaFirma);
    }
    if (!controls.formaPagoId.value && anexo.idFormaPago != null) {
      controls.formaPagoId.setValue(String(anexo.idFormaPago));
    }
    if (!controls.tipoObjetoId.value && anexo.idTipoObjeto != null) {
      controls.tipoObjetoId.setValue(String(anexo.idTipoObjeto));
    }
    if (!controls.formaInicioContratoId.value && anexo.idFormaInicioContrato != null) {
      controls.formaInicioContratoId.setValue(String(anexo.idFormaInicioContrato));
    }
    if (!controls.objeto.value && anexo.objeto) {
      controls.objeto.setValue(anexo.objeto);
    }
    if (!controls.descripcion.value && anexo.descripcion) {
      controls.descripcion.setValue(anexo.descripcion);
    }
  }

  /**
   * Bloquea los datos del anexo que ya quedaron diligenciados al generar el
   * contrato. Al vincular el docente solo queda editable la labor docente.
   */
  private syncAnexoDisabledState(): void {
    const controls = this.contractForm.controls;
    const readonly = this.isAnexoReadonly();

    const anexoControls = [
      controls.fechaFirma,
      controls.formaPagoId,
      controls.tipoObjetoId,
      controls.formaInicioContratoId,
      controls.objeto,
      controls.descripcion,
    ];

    forNext(anexoControls, (control) => {
      if (readonly) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
      control.updateValueAndValidity({ emitEvent: false });
    });

    this.contractForm.updateValueAndValidity();
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
   * Abre o cierra el panel donde se diligencian los datos del anexo.
   */
  toggleContractPanel(operation?: ContractOperation): void {
    if (this.isDownloadingContract()) {
      return;
    }
    if (!operation) {
      this.isContractPanelOpen.set(false);
      return;
    }
    if (this.isContractLinked()) {
      return;
    }

    this.contractForm.reset();
    this.contractForm.controls.numeroAnexo.setValue(this.information()?.numeroContrato?.trim() ?? '');
    this.contractForm.controls.fechaInicio.setValue(this.information()?.fechaInicio ?? '');
    this.contractForm.controls.fechaFin.setValue(this.information()?.fechaFin ?? '');
    this.contractOperation.set(operation);
    this.configureContractFormValidation(operation);
    this.syncAnexoDisabledState();
    this.isContractPanelOpen.set(true);
  }

  /**
   * Valida el formulario y, si está completo, genera el anexo.
   */
  submitContract(): void {
    if (!this.canDownloadContract()) {
      this.contractForm.markAllAsTouched();
      return;
    }

    if (this.contractOperation() === 'VINCULAR') {
      this.vincularDocente();
      return;
    }

    this.downloadContract();
  }

  /**
   * Vincula al docente con el contrato ya generado.
   *
   * <p>La vinculacion no genera el anexo en PDF: solo completa las tablas de
   * vinculacion del docente. El PDF se descargo en el paso de generacion del
   * contrato.</p>
   */
  vincularDocente(): void {
    const idCargaDocente = this.idCargaDocente();
    const numeroPeriodo = this.numeroPeriodo();

    if (idCargaDocente == null || numeroPeriodo == null || this.isDownloadingContract()) {
      return;
    }

    const { laborId } = this.contractForm.getRawValue();

    this.isDownloadingContract.set(true);

    this.hiringCallService
      .vincularDocente(idCargaDocente, numeroPeriodo, laborId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDownloadingContract.set(false)),
      )
      .subscribe({
        next: () => {
          this.close.emit();
        }
      });
  }

  /**
   * Descarga el anexo de contratación con el número de anexo y la fecha de
   * ingreso diligenciados por el usuario.
   */
  downloadContract(): void {
    const idCargaDocente = this.idCargaDocente();
    const numeroPeriodo = this.numeroPeriodo();
    if (idCargaDocente == null || numeroPeriodo == null || this.isDownloadingContract()) {
      return;
    }

    const {
      numeroAnexo, fechaFirma, fechaInicio, fechaFin, formaPagoId,
      tipoObjetoId, formaInicioContratoId, objeto, descripcion
    } = this.contractForm.getRawValue();

    this.isDownloadingContract.set(true);

    const payload = {
      numeroAnexo,
      fechaFirma,
      fechaInicio,
      fechaFin,
      formaPago: formaPagoId,
      tipoObjeto: tipoObjetoId,
      formaInicioContrato: formaInicioContratoId,
      objeto,
      descripcion
    }

    this.hiringCallService
      .downloadContractPdf(idCargaDocente, numeroPeriodo, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDownloadingContract.set(false)),
      )
      .subscribe({
        next: ({ blob, fileName }) => {
          this.triggerBrowserDownload(blob, fileName);
          this.close.emit();
        }
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

  private resolveInformationParams(): { idCargaDocente: number, idPeriodoUniversitario: number, idCoordinacion: number, numeroPeriodo: string } | undefined {
    if (!this.isOpen()) {
      return undefined;
    }

    const idCargaDocente = this.idCargaDocente();
    const idPeriodoUniversitario = this.idPeriodoUniversitario();
    const idCoordinacion = this.idCoordinacion();
    const numeroPeriodo = this.numeroPeriodo();
    if (idCargaDocente == null || idPeriodoUniversitario == null || idCoordinacion == null || numeroPeriodo == null) {
      return undefined;
    }

    return { idCargaDocente, idPeriodoUniversitario, idCoordinacion, numeroPeriodo };
  }
}
