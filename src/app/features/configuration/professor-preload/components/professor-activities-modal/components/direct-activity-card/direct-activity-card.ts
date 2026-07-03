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
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Label } from '../../../../../../../shared/components/form/label/label';
import {
  Option,
  Select,
} from '../../../../../../../shared/components/form/select/select';
import { InputField } from '../../../../../../../shared/components/form/input/input-field';
import { Button } from '../../../../../../../shared/ui/button/button';
import { Icon } from '../../../../../../../shared/ui/icon/icon';
import { CoordinationService } from '../../../../data/coordination.service';
import {
  DIRECT_ACTIVITY_CASCADE_FIELDS,
  DIRECT_ACTIVITY_READONLY_FIELDS,
  DirectActivityFieldConfig,
} from '../../../../model/professor-activities.config';
import {
  GrupoMateria,
  MateriaAcademica,
  ProgramaAcademico,
  TipoActividad,
  TipoActividadCriterio,
  UnidadRegional,
} from '../../../../model/professor-activities.model';
import { DirectLearningActivity } from '../../../../model/professor-activities-modal.models';

@Component({
  selector: 'app-direct-activity-card',
  imports: [
    ReactiveFormsModule,
    Label,
    Select,
    InputField,
    Button,
    Icon,
  ],
  templateUrl: './direct-activity-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectActivityCard {
  private readonly coordinationService = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

  tipoActividad = input<TipoActividad | null>(null);
  idCoordinacion = input.required<number>();
  idNivelEducativo = input.required<number>();
  addFormOpen = input(false);
  activities = input<DirectLearningActivity[]>([]);

  addFormOpenChange = output<boolean>();
  activitiesChange = output<DirectLearningActivity[]>();

  readonly cascadeFields = DIRECT_ACTIVITY_CASCADE_FIELDS;
  readonly readonlyFields = DIRECT_ACTIVITY_READONLY_FIELDS;

  readonly form = new FormGroup({
    idCriterio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    idUnidadRegional: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    idPrograma: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    codigoMateria: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    idGrupo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    semestre: new FormControl<number | null>({ value: null, disabled: true }),
    creditos: new FormControl<number | null>({ value: null, disabled: true }),
    cupoMaximo: new FormControl<number | null>({ value: null, disabled: true }),
    horasPresenciales: new FormControl<number | null>({ value: null, disabled: true }),
    total: new FormControl<number | null>({ value: null, disabled: true }),
  });

  private readonly selectedUnidadId = signal<number | null>(null);
  private readonly selectedProgramaId = signal<number | null>(null);
  private readonly selectedCodigoMateria = signal<string | null>(null);

  private readonly criteriaResource = rxResource({
    params: () => {
      const idTipoActividad = this.tipoActividad()?.id;
      if (idTipoActividad == null) {
        return undefined;
      }
      return { idTipoActividad };
    },
    stream: ({ params }) =>
      this.coordinationService.listCriteria(params.idTipoActividad),
    defaultValue: [] as TipoActividadCriterio[],
  });

  private readonly regionalUnitsResource = rxResource({
    params: () => {
      const idCoordinacion = this.idCoordinacion();
      if (idCoordinacion == null) {
        return undefined;
      }
      return { idCoordinacion };
    },
    stream: ({ params }) =>
      this.coordinationService.listRegionalUnits(params.idCoordinacion),
    defaultValue: [] as UnidadRegional[],
  });

  private readonly programsResource = rxResource({
    params: () => {
      const idUnidadRegional = this.selectedUnidadId();
      const idNivelEducativo = this.idNivelEducativo();
      if (idUnidadRegional == null || idNivelEducativo == null) {
        return undefined;
      }
      return { idUnidadRegional, idNivelEducativo };
    },
    stream: ({ params }) =>
      this.coordinationService.listPrograms(
        params.idUnidadRegional,
        params.idNivelEducativo,
      ),
    defaultValue: [] as ProgramaAcademico[],
  });

  private readonly subjectsResource = rxResource({
    params: () => {
      const idPrograma = this.selectedProgramaId();
      const idCoordinacion = this.idCoordinacion();
      if (idPrograma == null || idCoordinacion == null) {
        return undefined;
      }
      return { idPrograma, idCoordinacion };
    },
    stream: ({ params }) =>
      this.coordinationService.listSubjects(
        params.idPrograma,
        params.idCoordinacion,
      ),
    defaultValue: [] as MateriaAcademica[],
  });

  private readonly groupsResource = rxResource({
    params: () => {
      const codigoMateria = this.selectedCodigoMateria();
      if (!codigoMateria) {
        return undefined;
      }
      return { codigoMateria };
    },
    stream: ({ params }) =>
      this.coordinationService.listSubjectGroups(params.codigoMateria),
    defaultValue: [] as GrupoMateria[],
  });

  readonly criteriaOptions = computed<Option[]>(() =>
    this.toOptions(
      this.criteriaResource.value(),
      (item) => String(item.id),
      (item) => item.nombre,
    ),
  );

  readonly regionalUnitOptions = computed<Option[]>(() =>
    this.toOptions(
      this.regionalUnitsResource.value(),
      (item) => String(item.id),
      (item) => item.nombre,
    ),
  );

  readonly programOptions = computed<Option[]>(() =>
    this.toOptions(
      this.programsResource.value(),
      (item) => String(item.id),
      (item) => item.nombre,
    ),
  );

  readonly subjectOptions = computed<Option[]>(() =>
    this.buildSubjectOptionsByPeriodo(this.subjectsResource.value()),
  );

  readonly groupOptions = computed<Option[]>(() =>
    this.toOptions(
      this.groupsResource.value(),
      (item) => String(item.id),
      (item) => item.nombre,
    ),
  );

  constructor() {
    this.setupCascadeListeners();
    effect(() => {
      const subjects = this.subjectsResource.value();
      untracked(() => {
        const codigoMateria = this.form.controls.codigoMateria.value;
        if (!codigoMateria) {
          return;
        }
        const materia = subjects.find(
          (item) => item.codigoMateria === codigoMateria,
        );
        if (materia && !materia.tieneGrupo) {
          this.clearSubjectSelection();
        }
      });
    });
  }

  toggleAddForm(): void {
    this.addFormOpenChange.emit(!this.addFormOpen());
  }

  cancelAddForm(): void {
    this.resetForm();
    this.addFormOpenChange.emit(false);
  }

  onAddActivity(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const activity = this.buildActivityRow();
    if (!activity) {
      return;
    }

    this.activitiesChange.emit([...this.activities(), activity]);
    this.resetForm();
    this.addFormOpenChange.emit(false);
  }

  removeActivity(activityId: string): void {
    this.activitiesChange.emit(
      this.activities().filter((item) => item.id !== activityId),
    );
  }

  optionsForField(field: DirectActivityFieldConfig): Option[] {
    switch (field.key) {
      case 'idCriterio':
        return this.criteriaOptions();
      case 'idUnidadRegional':
        return this.regionalUnitOptions();
      case 'idPrograma':
        return this.programOptions();
      case 'codigoMateria':
        return this.subjectOptions();
      case 'idGrupo':
        return this.groupOptions();
      default:
        return [];
    }
  }

  isSelectDisabled(fieldKey: DirectActivityFieldConfig['key']): boolean {
    if (fieldKey === 'idCriterio' || fieldKey === 'idUnidadRegional') {
      return false;
    }
    if (fieldKey === 'idPrograma') {
      return !this.form.controls.idUnidadRegional.value;
    }
    if (fieldKey === 'codigoMateria') {
      return !this.form.controls.idPrograma.value;
    }
    if (fieldKey === 'idGrupo') {
      return !this.form.controls.codigoMateria.value;
    }
    return false;
  }

  private setupCascadeListeners(): void {
    this.form.controls.idUnidadRegional.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedUnidadId.set(value ? Number(value) : null);
        this.resetFromProgram();
      });

    this.form.controls.idPrograma.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedProgramaId.set(value ? Number(value) : null);
        this.resetFromSubject();
      });

    this.form.controls.codigoMateria.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedCodigoMateria.set(value || null);
        this.resetFromGroup();
        this.applySubjectDefaults(value);
      });

    this.form.controls.idGrupo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyGroupCapacity(value));
  }

  private resetFromProgram(): void {
    this.form.patchValue({
      idPrograma: '',
      codigoMateria: '',
      idGrupo: '',
    });
    this.selectedProgramaId.set(null);
    this.selectedCodigoMateria.set(null);
    this.clearReadonlyFields();
  }

  private resetFromSubject(): void {
    this.clearSubjectSelection();
  }

  private clearSubjectSelection(): void {
    this.form.patchValue({
      codigoMateria: '',
      idGrupo: '',
    });
    this.selectedCodigoMateria.set(null);
    this.clearReadonlyFields();
  }

  private resetFromGroup(): void {
    this.form.patchValue({ idGrupo: '' });
    const materia = this.findSelectedSubject();
    if (materia) {
      this.patchReadonlyFromSubject(materia);
      return;
    }
    this.clearReadonlyFields();
  }

  private applySubjectDefaults(codigoMateria: string): void {
    if (!codigoMateria) {
      return;
    }
    const materia = this.findSubjectByCode(codigoMateria);
    if (!materia || !materia.tieneGrupo) {
      this.clearSubjectSelection();
      return;
    }
    this.patchReadonlyFromSubject(materia);
  }

  private applyGroupCapacity(idGrupo: string): void {
    if (!idGrupo) {
      this.form.patchValue({ cupoMaximo: null });
      return;
    }
    const grupo = this.groupsResource
      .value()
      .find((item) => item.id === Number(idGrupo));
    if (grupo) {
      this.form.patchValue({ cupoMaximo: grupo.capacidad });
    }
  }

  private patchReadonlyFromSubject(materia: MateriaAcademica): void {
    this.form.patchValue({
      semestre: materia.periodo,
      creditos: materia.ponderacionAcademica,
      horasPresenciales: materia.horasDirectas,
      total: materia.horasDirectas,
      cupoMaximo: null,
    });
  }

  private clearReadonlyFields(): void {
    this.form.patchValue({
      semestre: null,
      creditos: null,
      cupoMaximo: null,
      horasPresenciales: null,
      total: null,
    });
  }

  private resetForm(): void {
    this.form.reset({
      idCriterio: '',
      idUnidadRegional: '',
      idPrograma: '',
      codigoMateria: '',
      idGrupo: '',
      semestre: null,
      creditos: null,
      cupoMaximo: null,
      horasPresenciales: null,
      total: null,
    });
    this.selectedUnidadId.set(null);
    this.selectedProgramaId.set(null);
    this.selectedCodigoMateria.set(null);
  }

  private buildActivityRow(): DirectLearningActivity | null {
    const criterio = this.findCriteria();
    const unidad = this.findRegionalUnit();
    const programa = this.findProgram();
    const materia = this.findSelectedSubject();
    const grupo = this.findSelectedGroup();
    const tipoActividad = this.tipoActividad();

    if (
      !criterio ||
      !unidad ||
      !programa ||
      !materia ||
      !grupo ||
      !tipoActividad
    ) {
      return null;
    }

    return {
      id: this.createActivityId(),
      criterio: criterio.nombre,
      unidad: unidad.nombre,
      programa: programa.nombre,
      materia: materia.nombre,
      horasPresenciales: materia.horasDirectas,
      grupo: grupo.nombre,
      cupos: grupo.capacidad,
      idTipoActividad: tipoActividad.id,
      codigoTipoActividad: tipoActividad.codigo,
      idUnidadRegional: unidad.id,
      idPrograma: programa.id,
      codigoMateria: materia.codigoMateria,
      idGrupo: grupo.id,
    };
  }

  private findCriteria(): TipoActividadCriterio | undefined {
    const id = this.form.controls.idCriterio.value;
    return this.criteriaResource
      .value()
      .find((item) => String(item.id) === id);
  }

  private findRegionalUnit(): UnidadRegional | undefined {
    const id = this.form.controls.idUnidadRegional.value;
    return this.regionalUnitsResource
      .value()
      .find((item) => String(item.id) === id);
  }

  private findProgram(): ProgramaAcademico | undefined {
    const id = this.form.controls.idPrograma.value;
    return this.programsResource
      .value()
      .find((item) => String(item.id) === id);
  }

  private findSubjectByCode(
    codigoMateria: string,
  ): MateriaAcademica | undefined {
    return this.subjectsResource
      .value()
      .find((item) => item.codigoMateria === codigoMateria);
  }

  private findSelectedSubject(): MateriaAcademica | undefined {
    const codigo = this.form.controls.codigoMateria.value;
    if (!codigo) {
      return undefined;
    }
    return this.findSubjectByCode(codigo);
  }

  private findSelectedGroup(): GrupoMateria | undefined {
    const id = this.form.controls.idGrupo.value;
    return this.groupsResource
      .value()
      .find((item) => String(item.id) === id);
  }

  private createActivityId(): string {
    return `direct-${Date.now()}`;
  }

  private buildSubjectOptionsByPeriodo(
    subjects: MateriaAcademica[],
  ): Option[] {
    const sorted = [...subjects].sort((left, right) => {
      if (left.periodo !== right.periodo) {
        return left.periodo - right.periodo;
      }
      return left.nombre.localeCompare(right.nombre, 'es-CO');
    });

    return sorted.map((item) => ({
      value: item.codigoMateria,
      label: item.nombre,
      group: `Semestre ${item.periodo}`,
      disabled: !item.tieneGrupo,
    }));
  }

  private toOptions<T>(
    items: T[],
    resolveValue: (item: T) => string,
    resolveLabel: (item: T) => string,
  ): Option[] {
    return items.map((item) => ({
      value: resolveValue(item),
      label: resolveLabel(item),
    }));
  }
}
