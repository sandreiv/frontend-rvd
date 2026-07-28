import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Label } from '../../../../../shared/components/form/label/label';
import {
  Option,
  Select,
} from '../../../../../shared/components/form/select/select';
import {
  TypeaheadOption,
  TypeaheadSelect,
} from '../../../../../shared/components/form/typeahead-select/typeahead-select';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { CoordinationService } from '../../data/coordination.service';
import {
  CategoriaCatedratico,
  CoordinationContractModality,
  ModalityProfessor,
  ProfessorSearchResult,
  ValuePointsPreload,
  WorkDate,
} from '../../model/coordination.model';
import {
  ContractValues,
  PROFESSOR_FIELDS,
  ProfessorFieldConfig,
  computeContractValues,
  diffInDays,
  formatCurrencyCOP,
  formatWorkDateRange,
  resolveModalityKind,
} from '../../model/professor-form.config';
import { AddProfessorRequest } from '../../model/add-professor.model';
import { SearchGeneralPersonParams } from '../../../preload-call/model/preload-call.model';

@Component({
  selector: 'app-professor-add-modal',
  imports: [
    Modal,
    Label,
    Select,
    TypeaheadSelect,
    Button,
    Icon,
    Tooltip,
    InputField,
    ReactiveFormsModule
  ],
  templateUrl: './professor-add-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorAddModal {
  private readonly coordinationService = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

  isOpen = input(false);
  coordinationId = input<number | null>(null);
  idCarga = input<number | null>(null);
  anioUniversidad = input<number | null>(null);
  contractModality = input<CoordinationContractModality | null>(null);
  mode = input<'create' | 'edit'>('create');
  editingProfessor = input<ModalityProfessor | null>(null);
  readOnly = input(false);
  readOnlyReason = input<string | null>(null);
  close = output<void>();
  saved = output<void>();
  existingLoadSelected = output<ProfessorSearchResult>();

  readonly isEditMode = computed(() => this.mode() === 'edit');

  readonly modalTitle = computed(() =>
    this.isEditMode() ? 'Ver detalle preasignación' : 'Agregar nuevo docente',
  );

  readonly modalSubtitle = computed(() =>
    this.isEditMode()
      ? 'Consulta y actualiza la preasignación del docente.'
      : 'Agregar un docente nuevo a la precarga.',
  );

  readonly saveButtonLabel = computed(() => {
    if (this.readOnly()) {
      return 'Solo lectura';
    }

    return this.isEditMode() ? 'Actualizar' : 'Guardar detalle de precarga';
  });

  readonly editingDisplayName = computed(() => {
    const editing = this.editingProfessor();
    if (!editing) {
      return '';
    }
    if (editing.idPersonaGeneral == null) {
      return 'NN';
    }
    return editing.nombreCompleto?.trim() || 'NN';
  });

  readonly isProfessorActive = signal(true);
  readonly searchResults = signal<ProfessorSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly isSaving = signal(false);
  readonly selectedProfessor = signal<ProfessorSearchResult | null>(null);
  readonly selectedWorkDate = signal<WorkDate | null>(null);
  readonly selectedCategoriaId = signal<number | null>(null);
  readonly manualNumeroPuntos = signal<number | null>(null);

  readonly fields = computed<ProfessorFieldConfig[]>(() => {
    const kind = resolveModalityKind(this.contractModality()?.nombre);
    const baseFields = kind ? PROFESSOR_FIELDS[kind] : [];

   
    if (this.isEditMode() && kind === 'catedra') {
      return baseFields.map((field) => {
        if (field.key === 'categoriaCatedratico') {
          return {
            ...field,
            control: 'select' as const,
            readonly: false,
            placeholder: 'Seleccione la categoría',
          };
        }

        return field;
      });
    }

    
    if (this.isProfessorActive()) {
      return baseFields;
    }

    
    return baseFields.map((field) => {
      if (field.key === 'categoriaCatedratico') {
        return {
          ...field,
          control: 'select' as const,
          readonly: false,
          placeholder: 'Seleccione la categoría',
        };
      }

      if (field.key === 'numeroPuntos') {
        return { ...field, readonly: false };
      }

      return field;
    });
  });

  readonly modalityKind = computed(() => resolveModalityKind(this.contractModality()?.nombre),);

  readonly effectiveCategoriaId = computed(() => {
    if (this.isEditMode() && this.isProfessorActive()) {
      return this.editingProfessor()?.idCategoriaCatedratico ?? null;
    }
    return this.isProfessorActive()
      ? this.selectedProfessor()?.categoriaCatedratico?.id ?? null
      : this.selectedCategoriaId();
  });

  private readonly workDatesResource = rxResource({
    params: () => {
      const coordinationId = this.coordinationId();
      const modalityId = this.contractModality()?.id;
      if (coordinationId == null || modalityId == null) {
        return undefined;
      }
      return { coordinationId, modalityId };
    },
    stream: ({ params }) =>
      this.coordinationService.getWorkDates(
        params.coordinationId,
        params.modalityId,
      ),
    defaultValue: [] as WorkDate[],
  });

  readonly workDates = computed(() => this.workDatesResource.value());

  readonly fechaLaborOptions = computed<Option[]>(() =>
    this.workDates().map((workDate) => ({
      value: String(workDate.id),
      label: formatWorkDateRange(workDate.fechaInicio, workDate.fechaFin),
    })),
  );

  private readonly valuePointsResource = rxResource<ValuePointsPreload,{ anio: number; idCategoriaCatedratico: number, idPersonaGeneral: number | null } | undefined>({
    params: () => {
      if (this.isEditMode() && this.isProfessorActive()) {
        return undefined;
      }
      const anio = this.anioUniversidad();
      const idCategoriaCatedratico = this.effectiveCategoriaId();
      if (anio == null || idCategoriaCatedratico == null) {
        return undefined;
      }
      const idPersonaGeneral = this.selectedProfessor()?.escalafon?.idPersonaGeneral ?? null;
      return { anio, idCategoriaCatedratico, idPersonaGeneral };
    },
    stream: ({ params }) =>
      this.coordinationService.getValuePointsPreload(
        params!.anio,
        params!.idCategoriaCatedratico,
        params!.idPersonaGeneral ?? null,
      ),
  });

  private readonly categoriasResource = rxResource({
    params: () => {
      const modalityId = this.contractModality()?.id;
      const needsCatalog = !this.isProfessorActive() || this.isEditMode();
      if (!this.isOpen() || !needsCatalog || modalityId == null) {
        return undefined;
      }
      return { idModalidadContratacion: modalityId };
    },
    stream: ({ params }) =>
      this.coordinationService.getCategoriaCatedratico(
        params.idModalidadContratacion,
      ),
    defaultValue: [] as CategoriaCatedratico[],
  });

  readonly categoriaOptions = computed<Option[]>(() =>
    this.categoriasResource.value().map((categoria) => ({
      value: String(categoria.id),
      label: categoria.descripcion,
    })),
  );

  readonly asignacionSalarialNum = computed<number | null>(() => {
    if (this.isEditMode() && this.isProfessorActive()) {
      const stored = this.editingProfessor()?.asignacionSalarial;
      return stored == null || Number.isNaN(stored) ? null : stored;
    }
    const values = this.valuePointsResource.value() as
      | ValuePointsPreload
      | undefined;
    if (!values) {
      return null;
    }
    if (this.isProfessorActive()) {
      const asignacion = values.asignacionSalarial;
      return asignacion == null || Number.isNaN(asignacion)
        ? null
        : asignacion;
    }
    const valorPunto = values.valorPunto;
    const puntos = this.manualNumeroPuntos();
    if (valorPunto == null || Number.isNaN(valorPunto) || puntos == null) {
      return null;
    }
    return valorPunto * puntos;
  });

  readonly contractValues = computed<ContractValues | null>(() => {
    if (this.modalityKind() !== 'tiempoCompletoOcasional') {
      return null;
    }
    const asignacion = this.asignacionSalarialNum();
    const workDate = this.selectedWorkDate();
    if (asignacion == null || !workDate) {
      return null;
    }
    const cantidadDias = diffInDays(workDate.fechaInicio, workDate.fechaFin);
    if (cantidadDias <= 0) {
      return null;
    }
    return computeContractValues(asignacion, cantidadDias);
  });

  readonly professorForm = signal<FormGroup>(new FormGroup({}));

  private readonly searchTerm$ = new Subject<string>();

  constructor() {
    effect(() => {
      const controls = Object.fromEntries(
        this.fields().map((field) => [
          field.key,
          new FormControl({ value: '', disabled: !!field.readonly }),
        ]),
      );
      this.professorForm.set(new FormGroup(controls));
    });

    effect(() => {
      const form = this.professorForm();
      const fields = this.fields();

      if (this.readOnly()) {
        form.disable({ emitEvent: false });
        return;
      }

      fields.forEach((field) => {
        const control = form.get(field.key);

        if (!control) {
          return;
        }

        if (field.readonly) {
          control.disable({ emitEvent: false });
          return;
        }

        control.enable({ emitEvent: false });
      });
    });

    effect(() => {
      this.isOpen();
      this.contractModality();
      const editing = this.editingProfessor();
      untracked(() => {
        this.isProfessorActive.set(
          editing ? editing.idPersonaGeneral != null : true,
        );
        this.clearSelectionState();
        this.professorForm().reset();
      });
    });

    effect(() => {
      const editing = this.editingProfessor();
      const open = this.isOpen();
      const form = this.professorForm();
      const dates = this.workDates();
      const categorias = this.categoriasResource.value();
      if (!open || !editing) {
        return;
      }
      untracked(() =>
        this.prefillFromEditing(editing, form, dates, categorias),
      );
    });

    effect(() => {
      this.isProfessorActive();
      untracked(() => {
        if (this.isEditMode()) {
          return;
        }
        this.clearSelectionState();
      });
    });

    effect(() => {
      const requiresMinimun = !this.isProfessorActive();
      const control = this.professorForm().get('numeroPuntos');
      if (!control) {
        return;
      }

      control.setValidators(requiresMinimun ? [Validators.min(375)] : []);
      control.updateValueAndValidity({ emitEvent: false });
    });

    effect(() => {
      const values = this.valuePointsResource.value() as
        | ValuePointsPreload
        | undefined;
      if (!values) {
        return;
      }

      const kind = this.modalityKind();
      if (kind === 'catedra') {
        this.professorForm().patchValue({
          valorHora: formatCurrencyCOP(values.valorHora),
        });
        return;
      }
      if (kind === 'tiempoCompletoOcasional') {
        this.professorForm().patchValue({
          valorPunto: formatCurrencyCOP(values.valorPunto),
        });
        if (this.isProfessorActive()) {
          this.professorForm().patchValue({
            numeroPuntos: values.puntosDocente,
          });
        }
      }
    });

    effect(() => {
      if (this.modalityKind() !== 'tiempoCompletoOcasional') {
        return;
      }

      const asignacionSalarial = this.asignacionSalarialNum();
      if (asignacionSalarial != null) {
        this.professorForm().patchValue({
          asignacionSalarial: formatCurrencyCOP(asignacionSalarial),
        });
      }

      const result = this.contractValues();
      if (!result) {
        return;
      }

      this.professorForm().patchValue({
        valorContrato: formatCurrencyCOP(result.valorContrato),
        valorPrestaciones: formatCurrencyCOP(result.valorPrestaciones),
        totalContrato: formatCurrencyCOP(result.totalContrato),
      });
    });

    this.searchTerm$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isSearching.set(true)),
        switchMap((term) =>
          this.coordinationService
            .searchProfesor(this.buildSearchParams(term))
            .pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      });
  }

  readonly professorOptionAdapter = (item: unknown): TypeaheadOption => {
    const person = item as ProfessorSearchResult;
    return {
      value: String(person.id),
      label: `${person.documentoIdentidad} - ${person.nombreCompleto}`,
      data: person,
    };
  };

  onSearchProfessor(query: string): void {
    this.searchTerm$.next(query);
  }

  onFechaLaborChange(workDateId: string): void {
    const workDate = this.workDates().find(
      (item) => String(item.id) === workDateId,
    );
    if (!workDate) {
      return;
    }

    this.selectedWorkDate.set(workDate);
    this.professorForm().patchValue({
      semanas: workDate.semanas ?? '',
      vacaciones: workDate.vacaciones ?? '',
      horasSemanales: workDate.rangoHoras ?? '',
    });
  }

  onCategoriaChange(categoriaId: string): void {
    const id = Number(categoriaId);
    this.selectedCategoriaId.set(Number.isNaN(id) ? null : id);
  }

  private clearSelectionState(): void {
    this.selectedProfessor.set(null);
    this.selectedCategoriaId.set(null);
    this.selectedWorkDate.set(null);
    this.manualNumeroPuntos.set(null);
    this.searchResults.set([]);
  }

  private prefillFromEditing(
    editing: ModalityProfessor,
    form: FormGroup,
    dates: WorkDate[],
    categorias: CategoriaCatedratico[],
  ): void {
    const workDate =
      dates.find((item) => item.id === editing.idFechasConvocatoria) ?? null;
    if (workDate) {
      this.selectedWorkDate.set(workDate);
    }

    if (editing.idPersonaGeneral != null) {
      this.prefillActiveProfessor(editing, form, workDate, categorias);
    } else {
      this.prefillNnProfessor(editing, form, workDate);
    }
  }

  private prefillNnProfessor(
    editing: ModalityProfessor,
    form: FormGroup,
    workDate: WorkDate | null,
  ): void {
    this.selectedCategoriaId.set(editing.idCategoriaCatedratico);
    const puntos = editing.puntos != null ? Number(editing.puntos) : null;
    this.manualNumeroPuntos.set(
      puntos == null || Number.isNaN(puntos) ? null : puntos,
    );

    form.patchValue({
      categoriaCatedratico: String(editing.idCategoriaCatedratico),
      numeroPuntos: editing.puntos ?? '',
      fechaLabor: String(editing.idFechasConvocatoria),
    });
    this.patchWorkDateFields(form, workDate);
  }

  private prefillActiveProfessor(
    editing: ModalityProfessor,
    form: FormGroup,
    workDate: WorkDate | null,
    categorias: CategoriaCatedratico[],
  ): void {
    const categoria = categorias.find(
      (item) => item.id === editing.idCategoriaCatedratico,
    );

    const categoriaValue =
      this.modalityKind() === 'catedra'
        ? String(editing.idCategoriaCatedratico)
        : categoria?.descripcion ?? String(editing.idCategoriaCatedratico);

    form.patchValue({
      categoriaCatedratico: categoriaValue,
      fechaLabor: String(editing.idFechasConvocatoria),
    });
    this.patchWorkDateFields(form, workDate);

    if (this.modalityKind() === 'catedra') {
      form.patchValue({ valorHora: formatCurrencyCOP(editing.valorHora) });
      return;
    }

    form.patchValue({
      numeroPuntos: editing.puntos ?? '',
      valorPunto: formatCurrencyCOP(editing.valorPunto),
      asignacionSalarial: formatCurrencyCOP(editing.asignacionSalarial),
      valorContrato: formatCurrencyCOP(editing.valorContrato),
      valorPrestaciones: formatCurrencyCOP(editing.valorPrestaciones),
      totalContrato: formatCurrencyCOP(editing.totalContrato),
    });
  }

  private patchWorkDateFields(
    form: FormGroup,
    workDate: WorkDate | null,
  ): void {
    if (!workDate) {
      return;
    }

    form.patchValue({
      semanas: workDate.semanas ?? '',
      vacaciones: workDate.vacaciones ?? '',
      horasSemanales: workDate.rangoHoras ?? '',
    });
  }

  onNumeroPuntosChange(value: string | number): void {
    const puntos = Number(value);
    this.manualNumeroPuntos.set(
      value === '' || Number.isNaN(puntos) ? null : puntos,
    );
  }

  onProfessorSelected(option: TypeaheadOption): void {
    const professor = option.data as ProfessorSearchResult;
    if (professor.cargaDocente) {
      this.existingLoadSelected.emit(professor);
      return;
    }

    this.selectedProfessor.set(professor);

    const descripcion = professor.categoriaCatedratico?.descripcion ?? '';
    this.professorForm().patchValue({
      categoriaCatedratico: descripcion,
    });
  }

  onSubmit(): void {

    if (this.readOnly()) {
      return;
    }
    
    if (this.isSaving()) {
      return;
    }

    if (this.selectedProfessor()?.cargaDocente) {
      return;
    }

    const form = this.professorForm();
    const payload = this.buildPayload();
    if (form.invalid || !payload) {
      form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const editingId = this.editingProfessor()?.idCargaDocente;
    const request$ =
      this.isEditMode() && editingId != null
        ? this.coordinationService.updateProfessor(editingId, payload)
        : this.coordinationService.addProfessor(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit();
        this.close.emit();
      },
      error: () => this.isSaving.set(false),
    });
  }

  private buildPayload(): AddProfessorRequest | null {
    if (this.isEditMode() && this.isProfessorActive()) {
      return this.buildStoredPayload();
    }

    const idCarga = this.idCarga();
    const idModalidadContratacion = this.contractModality()?.id;
    const idCategoriaCatedratico = this.effectiveCategoriaId();
    const workDate = this.selectedWorkDate();
    if (
      idCarga == null ||
      idModalidadContratacion == null ||
      idCategoriaCatedratico == null ||
      !workDate
    ) {
      return null;
    }

    const base: AddProfessorRequest = {
      ...this.editPayloadId(),
      idCarga,
      idPersonaGeneral:
        this.selectedProfessor()?.escalafon?.idPersonaGeneral ?? null,
      idModalidadContratacion,
      idCategoriaCatedratico,
      fechasConvocatoria: {
        id: workDate.id,
        fechaInicio: workDate.fechaInicio,
        fechaFin: workDate.fechaFin,
      },
      semanas: workDate.semanas ?? '',
    };

    if (this.modalityKind() === 'catedra') {
      return {
        ...base,
        valorPunto: this.resolveValorPunto(),
        valorHora: this.resolveValorHora(),
      };
    }

    const contract = this.contractValues();
    return {
      ...base,
      puntos: this.puntosString(),
      valorPunto: this.resolveValorPunto(),
      asignacionSalarial: this.toAmount(this.asignacionSalarialNum()),
      valorContrato: this.toAmount(contract?.valorContrato),
      valorPrestaciones: this.toAmount(contract?.valorPrestaciones),
      totalContrato: this.toAmount(contract?.totalContrato),
    };
  }

  private buildStoredPayload(): AddProfessorRequest | null {
    const editing = this.editingProfessor();
    const idCarga = this.idCarga();
    if (!editing || idCarga == null) {
      return null;
    }

    const workDate = this.selectedWorkDate();
    const base: AddProfessorRequest = {
      idCargaDocente: editing.idCargaDocente ?? undefined,
      idCarga,
      idPersonaGeneral: editing.idPersonaGeneral,
      idModalidadContratacion: editing.idModalidadContratacion,
      idCategoriaCatedratico: editing.idCategoriaCatedratico,
      fechasConvocatoria: {
        id: workDate?.id ?? editing.idFechasConvocatoria,
        fechaInicio: workDate?.fechaInicio ?? editing.fechaInicio,
        fechaFin: workDate?.fechaFin ?? editing.fechaFin,
      },
      semanas: String(workDate?.semanas ?? editing.semanas ?? ''),
    };

    if (this.modalityKind() === 'catedra') {
      return {
        ...base,
        valorPunto: editing.valorPunto,
        valorHora: editing.valorHora,
      };
    }

    const contract = this.contractValues();
    return {
      ...base,
      puntos: editing.puntos ?? '',
      valorPunto: editing.valorPunto,
      asignacionSalarial: editing.asignacionSalarial,
      valorContrato: contract
        ? this.toAmount(contract.valorContrato)
        : editing.valorContrato,
      valorPrestaciones: contract
        ? this.toAmount(contract.valorPrestaciones)
        : editing.valorPrestaciones,
      totalContrato: contract
        ? this.toAmount(contract.totalContrato)
        : editing.totalContrato,
    };
  }

  private editPayloadId(): { idCargaDocente?: number } {
    const editing = this.editingProfessor();
    return this.isEditMode() && editing
      ? { idCargaDocente: editing.idCargaDocente ?? undefined }
      : {};
  }

  private resolveValorPunto(): number | null {
    const values = this.valuePointsResource.value() as
      | ValuePointsPreload
      | undefined;
    return this.toAmount(values?.valorPunto);
  }

  private puntosString(): string {
    if (this.isProfessorActive()) {
      const values = this.valuePointsResource.value() as
        | ValuePointsPreload
        | undefined;
      const puntos = values?.puntosDocente;
      return puntos == null ? '' : String(puntos);
    }
    const puntos = this.manualNumeroPuntos();
    return puntos == null ? '' : String(puntos);
  }

  private resolveValorHora(): number | null {
    const values = this.valuePointsResource.value() as
      | ValuePointsPreload
      | undefined;
    return this.toAmount(values?.valorHora);
  }

  private toAmount(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) {
      return null;
    }
    return Math.round(value * 100) / 100;
  }

  private buildSearchParams(term: string): SearchGeneralPersonParams {
    const value = term.trim();
    const idModalidadContratacion = this.contractModality()?.id;
    if (/^\d+$/.test(value)) {
      return { documento: value, idModalidadContratacion };
    }

    return { nombre: value, idModalidadContratacion };
  }
}
