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
  ProfessorSearchResult,
  ValuePointsPreload,
  WorkDate,
} from '../../model/coordination.model';
import {
  PROFESSOR_FIELDS,
  ProfessorFieldConfig,
  computeContractValues,
  diffInDays,
  formatCurrencyCOP,
  formatWorkDateRange,
  resolveModalityKind,
} from '../../model/professor-form.config';
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

  isOpen = input(false);
  coordinationId = input<number | null>(null);
  anioUniversidad = input<number | null>(null);
  contractModality = input<CoordinationContractModality | null>(null);
  close = output<void>();

  readonly isProfessorActive = signal(true);
  readonly searchResults = signal<ProfessorSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly selectedProfessor = signal<ProfessorSearchResult | null>(null);
  readonly selectedWorkDate = signal<WorkDate | null>(null);
  readonly selectedCategoriaId = signal<number | null>(null);
  readonly manualNumeroPuntos = signal<number | null>(null);

  readonly fields = computed<ProfessorFieldConfig[]>(() => {
    const kind = resolveModalityKind(this.contractModality()?.nombre);
    const baseFields = kind ? PROFESSOR_FIELDS[kind] : [];
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

  readonly effectiveCategoriaId = computed(() =>
    this.isProfessorActive()
      ? this.selectedProfessor()?.categoriaCatedratico?.id ?? null
      : this.selectedCategoriaId(),
  );

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
    params: () => (this.isOpen() && !this.isProfessorActive() ? {} : undefined),
    stream: () => this.coordinationService.getCategoriaCatedratico(),
    defaultValue: [] as CategoriaCatedratico[],
  });

  readonly categoriaOptions = computed<Option[]>(() =>
    this.categoriasResource.value().map((categoria) => ({
      value: String(categoria.id),
      label: categoria.descripcion,
    })),
  );

  readonly asignacionSalarialNum = computed<number | null>(() => {
    const values = this.valuePointsResource.value() as
      | ValuePointsPreload
      | undefined;
    if (!values) {
      return null;
    }
    if (this.isProfessorActive()) {
      const asignacion = Number(values.asignacionSalarial);
      return Number.isNaN(asignacion) ? null : asignacion;
    }
    const valorPunto = Number(values.valorPunto);
    const puntos = this.manualNumeroPuntos();
    if (Number.isNaN(valorPunto) || puntos == null) {
      return null;
    }
    return valorPunto * puntos;
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
      this.isOpen();
      this.contractModality();
      untracked(() => {
        this.isProfessorActive.set(true);
        this.clearSelectionState();
        this.professorForm().reset();
      });
    });

    effect(() => {
      this.isProfessorActive();
      untracked(() => this.clearSelectionState());
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
      if (asignacionSalarial == null) {
        return;
      }

      this.professorForm().patchValue({
        asignacionSalarial: formatCurrencyCOP(asignacionSalarial),
      });

      const workDate = this.selectedWorkDate();
      if (!workDate) {
        return;
      }

      const cantidadDias = diffInDays(workDate.fechaInicio, workDate.fechaFin);
      if (cantidadDias <= 0) {
        return;
      }

      const result = computeContractValues(asignacionSalarial, cantidadDias);
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

  onNumeroPuntosChange(value: string | number): void {
    const puntos = Number(value);
    this.manualNumeroPuntos.set(
      value === '' || Number.isNaN(puntos) ? null : puntos,
    );
  }

  onProfessorSelected(option: TypeaheadOption): void {
    const professor = option.data as ProfessorSearchResult;
    this.selectedProfessor.set(professor);

    const descripcion = professor.categoriaCatedratico?.descripcion ?? '';
    this.professorForm().patchValue({
      categoriaCatedratico: descripcion,
    });
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
