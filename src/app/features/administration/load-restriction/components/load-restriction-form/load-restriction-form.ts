/**
 * Aplicación: rvd
 * Archivo: load-restriction-form.ts
 * Ruta: src/app/features/administration/load-restriction/components/load-restriction-form
 * Autor: GRUPO DE DESARROLLO ESPECÍFICO - CIADTI - Universidad de Pamplona
 * Fecha de creación: 22/07/2026
 * Modificaciones:
 * 22/07/2026 - Joel Daniel Arias Duarte - Creación inicial para formulario de restricción de carga por modalidad.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnChanges,
  Output,
  SimpleChanges,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/components/form/input/checkbox';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import {
  TypeaheadOption,
  TypeaheadSelect,
} from '../../../../../shared/components/form/typeahead-select/typeahead-select';
import {
  LoadRestrictionCatalogItem,
  LoadRestrictionCatalogs,
  LoadRestrictionDetail,
  LoadRestrictionFormData,
  LoadRestrictionModalityItem,
} from '../../model/load-restriction.model';

type LoadRestrictionFormGroup = FormGroup<{
  horasEnabled: FormControl<boolean>;
  minimo: FormControl<number | null>;
  maximo: FormControl<number | null>;
  investigacion: FormControl<boolean>;
  formaPagoEnabled: FormControl<boolean>;
  formaPago: FormControl<string>;
  tipoContratoEnabled: FormControl<boolean>;
  tipoContrato: FormControl<string>;
  tipoHorasEnabled: FormControl<boolean>;
  tipoHoras: FormControl<string>;
  excepcionEnabled: FormControl<boolean>;
  idProgramaBusqueda: FormControl<string>;
  idPersonaBusqueda: FormControl<string>;
  categoriaEnabled: FormControl<boolean>;
  idCategoriaCatedratico: FormControl<string>;
  tipoActividadEnabled: FormControl<boolean>;
  idTipoActividad: FormControl<string>;
}>;

const restrictionValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const horasEnabled = control.get('horasEnabled')?.value === true;
  const minimo = control.get('minimo')?.value;
  const maximo = control.get('maximo')?.value;

  const formaPagoEnabled = control.get('formaPagoEnabled')?.value === true;
  const formaPago = String(control.get('formaPago')?.value ?? '');

  const tipoContratoEnabled = Boolean(
    control.get('tipoContratoEnabled')?.value,
  );
  const tipoContrato = String(control.get('tipoContrato')?.value ?? '');

  const tipoHorasEnabled = control.get('tipoHorasEnabled')?.value === true;
  const tipoHoras = String(control.get('tipoHoras')?.value ?? '');

  const excepcionEnabled = control.get('excepcionEnabled')?.value === true;
  
  const categoriaEnabled = control.get('categoriaEnabled')?.value === true;
  const idCategoriaCatedratico = String(control.get('idCategoriaCatedratico')?.value ?? '');

  const tipoActividadEnabled = control.get('tipoActividadEnabled')?.value === true;
  const idTipoActividad = String(control.get('idTipoActividad')?.value ?? '');

  const errors: ValidationErrors = {};

  if (horasEnabled && (minimo == null || minimo === '')) {
    errors['minimoRequired'] = true;
    }

    if (horasEnabled && (maximo == null || maximo === '')) {
    errors['maximoRequired'] = true;
    }

    if (
      horasEnabled &&
      minimo != null &&
      maximo != null &&
      Number(maximo) < Number(minimo)
    ) {
      errors['hoursRange'] = true;
    }

  if (formaPagoEnabled && !formaPago) {
    errors['formaPagoRequired'] = true;
  }

  if (tipoContratoEnabled && !tipoContrato) {
    errors['tipoContratoRequired'] = true;
  }

  if (tipoHorasEnabled && !tipoHoras) {
    errors['tipoHorasRequired'] = true;
  }

  if (categoriaEnabled && !idCategoriaCatedratico) {
    errors['categoriaRequired'] = true;
  }

  if (tipoActividadEnabled && !idTipoActividad) {
    errors['tipoActividadRequired'] = true;
  }

  return Object.keys(errors).length ? errors : null;
};

@Component({
  selector: 'app-load-restriction-form',
  imports: [
    ReactiveFormsModule,
    Label,
    InputField,
    Select,
    Checkbox,
    TypeaheadSelect,
    Button,
  ],
  templateUrl: './load-restriction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadRestrictionForm implements OnChanges {
  modality = input<LoadRestrictionModalityItem | null>(null);
  restriction = input<LoadRestrictionDetail | null>(null);
  catalogs = input<LoadRestrictionCatalogs | null>(null);
  isSaving = input(false);

  @Output() cancel = new EventEmitter<void>();
  @Output() saveRestriction = new EventEmitter<LoadRestrictionFormData>();

  readonly submitted = signal(false);
  readonly filteredPrograms = signal<LoadRestrictionCatalogItem[]>([]);
  readonly filteredPeople = signal<LoadRestrictionCatalogItem[]>([]);
  readonly selectedPrograms = signal<LoadRestrictionCatalogItem[]>([]);
  readonly selectedPeople = signal<LoadRestrictionCatalogItem[]>([]);
  readonly showExcepcionRequired = signal(false);
  readonly showProgramSearch = signal(true);
  readonly showPersonSearch = signal(true);

  readonly formaPagoOptions: Option[] = [
    { value: 'SALARIO', label: 'Salario' },
    { value: 'CATEDRA', label: 'Cátedra' },
  ];

  readonly tipoContratoOptions: Option[] = [
    { value: 'CONTRATO', label: 'Contrato' },
    { value: 'NORMA', label: 'Norma' },
  ];

  readonly tipoHorasOptions: Option[] = [
    { value: 'SEMANAL', label: 'Semanal' },
    { value: 'SEMESTRAL', label: 'Semestral' },
  ];

  readonly form: LoadRestrictionFormGroup = new FormGroup(
    {
      horasEnabled: new FormControl(false, { nonNullable: true }),
      minimo: new FormControl<number | null>({ value: null, disabled: true }),
      maximo: new FormControl<number | null>({ value: null, disabled: true }),
      investigacion: new FormControl(false, { nonNullable: true }),
      formaPagoEnabled: new FormControl(false, { nonNullable: true }),
      formaPago: new FormControl('', { nonNullable: true }),
      tipoContratoEnabled: new FormControl(false, { nonNullable: true }),
      tipoContrato: new FormControl('', { nonNullable: true }),
      tipoHorasEnabled: new FormControl(false, { nonNullable: true }),
      tipoHoras: new FormControl('', { nonNullable: true }),
      excepcionEnabled: new FormControl(false, { nonNullable: true }),
      idProgramaBusqueda: new FormControl(
        { value: '', disabled: true },
        { nonNullable: true },
      ),
      idPersonaBusqueda: new FormControl(
        { value: '', disabled: true },
        { nonNullable: true },
      ),
      categoriaEnabled: new FormControl(false, { nonNullable: true }),
      idCategoriaCatedratico: new FormControl('', { nonNullable: true }),
      tipoActividadEnabled: new FormControl(false, { nonNullable: true }),
      idTipoActividad: new FormControl('', { nonNullable: true }),
    },
    { validators: [restrictionValidator] },
  );

  readonly catalogOptionAdapter = (item: unknown): TypeaheadOption => {
    const option = item as LoadRestrictionCatalogItem;

    return {
      value: String(option.id),
      label: option.label,
      secondaryLabel: option.codigo ?? undefined,
      data: option,
    };
  };

  get categoriaOptions(): Option[] {
    return (this.catalogs()?.categorias ?? []).map((item) => ({
      value: String(item.id),
      label: item.label,
    }));
  }

  get tipoActividadOptions(): Option[] {
    return (this.catalogs()?.tiposActividad ?? []).map((item) => ({
      value: String(item.id),
      label: item.codigo ? `${item.codigo} - ${item.label}` : item.label,
    }));
  }

  get showMinimoRequired(): boolean {
    return this.submitted() && this.form.hasError('minimoRequired');
  }

  get showMaximoRequired(): boolean {
    return this.submitted() && this.form.hasError('maximoRequired');
  }

  get showHoursRangeInvalid(): boolean {
    return this.submitted() && this.form.hasError('hoursRange');
  }

  get showFormaPagoRequired(): boolean {
    return this.submitted() && this.form.hasError('formaPagoRequired');
  }

  get showTipoContratoRequired(): boolean {
    return (
      this.submitted() &&
      this.form.hasError('tipoContratoRequired')
    );
  }

  get showTipoHorasRequired(): boolean {
    return this.submitted() && this.form.hasError('tipoHorasRequired');
  }

  get showCategoriaRequired(): boolean {
    return this.submitted() && this.form.hasError('categoriaRequired');
  }

  get showTipoActividadRequired(): boolean {
    return this.submitted() && this.form.hasError('tipoActividadRequired');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['restriction'] ||
      changes['modality'] ||
      changes['catalogs']
    ) {
      this.patchForm();
    }
  }

  onToggleHoras(checked: boolean): void {
    this.form.controls.horasEnabled.setValue(checked);

    if (checked) {
        this.form.controls.minimo.enable({ emitEvent: false });
        this.form.controls.maximo.enable({ emitEvent: false });
    } else {
        this.form.controls.minimo.setValue(null);
        this.form.controls.maximo.setValue(null);
        this.form.controls.minimo.disable({ emitEvent: false });
        this.form.controls.maximo.disable({ emitEvent: false });
    }

    this.form.updateValueAndValidity();
    }

  onToggleFormaPago(checked: boolean): void {
    this.form.controls.formaPagoEnabled.setValue(checked);
    if (!checked) {
      this.form.controls.formaPago.setValue('');
    }
    this.form.updateValueAndValidity();
  }

  onToggleTipoContrato(checked: boolean): void {
    this.form.controls.tipoContratoEnabled.setValue(checked);

    if (!checked) {
      this.form.controls.tipoContrato.setValue('');
    }

    this.form.updateValueAndValidity();
  }

  onToggleTipoHoras(checked: boolean): void {
    this.form.controls.tipoHorasEnabled.setValue(checked);
    if (!checked) {
      this.form.controls.tipoHoras.setValue('');
    }
    this.form.updateValueAndValidity();
  }

  onToggleExcepcion(checked: boolean): void {
    this.form.controls.excepcionEnabled.setValue(checked);

    if (checked) {
      this.syncExcepcionControls(true);
    } else {
      this.clearExcepcion();
      this.syncExcepcionControls(false);
    }

    this.showExcepcionRequired.set(false);
    this.form.updateValueAndValidity();
  }

  private syncExcepcionControls(enabled: boolean): void {
    if (enabled) {
      this.form.controls.idProgramaBusqueda.enable({ emitEvent: false });
      this.form.controls.idPersonaBusqueda.enable({ emitEvent: false });
      return;
    }

    this.form.controls.idProgramaBusqueda.disable({ emitEvent: false });
    this.form.controls.idPersonaBusqueda.disable({ emitEvent: false });
  }

  onToggleCategoria(checked: boolean): void {
    this.form.controls.categoriaEnabled.setValue(checked);
    if (!checked) {
      this.form.controls.idCategoriaCatedratico.setValue('');
    }
    this.form.updateValueAndValidity();
  }

  onToggleTipoActividad(checked: boolean): void {
    this.form.controls.tipoActividadEnabled.setValue(checked);
    if (!checked) {
      this.form.controls.idTipoActividad.setValue('');
    }
    this.form.updateValueAndValidity();
  }

  onSearchProgram(term: string): void {
    this.filteredPrograms.set(
      this.filterCatalog(this.catalogs()?.programas ?? [], term),
    );
  }

  onSearchPerson(term: string): void {
    this.filteredPeople.set(
      this.filterCatalog(this.catalogs()?.personas ?? [], term),
    );
  }

  onProgramSelected(item: unknown): void {
    const program = item as LoadRestrictionCatalogItem;

    if (!program?.id) {
        return;
    }

    if (this.selectedPrograms().some((selected) => selected.id === program.id)) {
        this.clearProgramSearch();
        return;
    }

    this.selectedPrograms.update((current) => [...current, program]);
    this.filteredPrograms.set([]);
    this.showExcepcionRequired.set(false);

    this.clearProgramSearch();
  }

  private clearProgramSearch(): void {
    this.form.controls.idProgramaBusqueda.setValue('', {
        emitEvent: false,
    });

    this.showProgramSearch.set(false);

    setTimeout(() => {
        this.showProgramSearch.set(true);
    });
  }

  private clearPersonSearch(): void {
    this.form.controls.idPersonaBusqueda.setValue('', {
        emitEvent: false,
    });

    this.showPersonSearch.set(false);

    setTimeout(() => {
        this.showPersonSearch.set(true);
    });
  }

    removeProgram(id: number): void {
    this.selectedPrograms.update((current) =>
        current.filter((item) => item.id !== id),
    );
    }

    onPersonSelected(item: unknown): void {
        const person = item as LoadRestrictionCatalogItem;

        if (!person?.id) {
            return;
        }

        if (this.selectedPeople().some((selected) => selected.id === person.id)) {
            this.clearPersonSearch();
            return;
        }

        this.selectedPeople.update((current) => [...current, person]);
        this.filteredPeople.set([]);
        this.showExcepcionRequired.set(false);

        this.clearPersonSearch();
    }

    removePerson(id: number): void {
    this.selectedPeople.update((current) =>
        current.filter((item) => item.id !== id),
    );
    }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    const modality = this.modality();

    if (!modality?.id || this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    const hasExcepcion =
    this.selectedPrograms().length > 0 || this.selectedPeople().length > 0;

    if (raw.excepcionEnabled && !hasExcepcion) {
    this.showExcepcionRequired.set(true);
    return;
    }

    this.saveRestriction.emit({
      idModalidadContratacion: modality.id,
      minimo: raw.horasEnabled && raw.minimo != null ? String(raw.minimo) : null,
      maximo: raw.horasEnabled && raw.maximo != null ? String(raw.maximo) : null,
      investigacion: raw.investigacion ? '1' : '0',
      formaPago: raw.formaPagoEnabled ? raw.formaPago : null,
      tipoContrato: raw.tipoContratoEnabled ? raw.tipoContrato : null,
      tipoHoras: raw.tipoHorasEnabled ? raw.tipoHoras : null,
      idsProgramasExcepcion: raw.excepcionEnabled
      ? this.selectedPrograms().map((item) => item.id)
      : [],
      idsPersonasExcepcion: raw.excepcionEnabled
      ? this.selectedPeople().map((item) => item.id)
      : [],
      idCategoriaCatedratico: raw.categoriaEnabled
        ? Number(raw.idCategoriaCatedratico)
        : null,
      idTipoActividad: raw.tipoActividadEnabled
        ? Number(raw.idTipoActividad)
        : null,
    });
  }

  private patchForm(): void {
  const item = this.restriction();

  this.submitted.set(false);

  const horasEnabled = item?.minimo != null || item?.maximo != null;

  const excepcionEnabled =
      (item?.idsProgramasExcepcion?.length ?? 0) > 0 ||
      (item?.idsPersonasExcepcion?.length ?? 0) > 0;

    this.form.reset({
      horasEnabled,
      minimo: item?.minimo != null ? Number(item.minimo) : null,
      maximo: item?.maximo != null ? Number(item.maximo) : null,
      investigacion: this.isMarked(item?.investigacion),
      formaPagoEnabled: !!item?.formaPago,
      formaPago: item?.formaPago ?? '',
      tipoContratoEnabled: !!item?.tipoContrato,
      tipoContrato: item?.tipoContrato ?? '',
      tipoHorasEnabled: !!item?.tipoHoras,
      tipoHoras: item?.tipoHoras ?? '',
      excepcionEnabled,
      idProgramaBusqueda: '',
      idPersonaBusqueda: '',
      categoriaEnabled: item?.idCategoriaCatedratico != null,
      idCategoriaCatedratico:
        item?.idCategoriaCatedratico != null
          ? String(item.idCategoriaCatedratico)
          : '',
      tipoActividadEnabled: item?.idTipoActividad != null,
      idTipoActividad:
        item?.idTipoActividad != null ? String(item.idTipoActividad) : '',
    });

    if (horasEnabled) {
      this.form.controls.minimo.enable({ emitEvent: false });
      this.form.controls.maximo.enable({ emitEvent: false });
    } else {
      this.form.controls.minimo.disable({ emitEvent: false });
      this.form.controls.maximo.disable({ emitEvent: false });
    }

    this.syncExcepcionControls(excepcionEnabled);

    this.setSelectedPrograms(item?.idsProgramasExcepcion ?? []);
    this.setSelectedPeople(item?.idsPersonasExcepcion ?? []);
    this.form.updateValueAndValidity();
  }

  private clearExcepcion(): void {
    this.form.controls.idProgramaBusqueda.setValue('');
    this.form.controls.idPersonaBusqueda.setValue('');
    this.selectedPrograms.set([]);
    this.selectedPeople.set([]);
    this.filteredPrograms.set([]);
    this.filteredPeople.set([]);
    this.showExcepcionRequired.set(false);
  }

  private setSelectedPrograms(ids: number[]): void {
    const programs = this.catalogs()?.programas ?? [];

    this.selectedPrograms.set(
        programs.filter((item) => ids.includes(item.id)),
    );
   }

  private setSelectedPeople(ids: number[]): void {
    const people = this.catalogs()?.personas ?? [];

    this.selectedPeople.set(
       people.filter((item) => ids.includes(item.id)),
    );
  }

  private filterCatalog(
    rows: LoadRestrictionCatalogItem[],
    term: string,
  ): LoadRestrictionCatalogItem[] {
    const normalizedTerm = this.normalize(term);

    if (normalizedTerm.length < 2) {
      return [];
    }

    return rows
      .filter((item) => {
        const label = this.normalize(item.label);
        const codigo = this.normalize(item.codigo ?? '');
        const id = this.normalize(String(item.id));

        return (
          label.includes(normalizedTerm) ||
          codigo.includes(normalizedTerm) ||
          id.includes(normalizedTerm)
        );
      })
      .slice(0, 20);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isMarked(value: string | null | undefined): boolean {
    const normalized = String(value ?? '').trim().toUpperCase();

    return (
      normalized === '1' ||
      normalized === 'S' ||
      normalized === 'SI' ||
      normalized === 'TRUE' ||
      normalized === 'ACTIVO'
    );
  }
}