import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { formatSentenceValue } from '../../../../../shared/utils/normalized-text.util';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { PreloadCallService } from '../../data/preload-call.service';
import { buildPreloadCallSavePayload } from '../../model/build-preload-call-save-payload.function';
import { PreloadCallSaveRequest } from '../../model/preload-call-save.model';
import {
  EducationalLevelItem,
  ModalityFormItem,
  PersonaAutorizaConvocatoriaItem,
  PreloadCallDetailResponse,
  UniversityPeriodItem,
} from '../../model/preload-call.model';
import { ModalityFormModal } from '../modality-form-modal/modality-form-modal';
import { ModalityTable } from '../modality-table/modality-table';
import { PreloadCallPersonSearchModal } from '../preload-call-person-search-modal/preload-call-person-search-modal';

@Component({
  selector: 'app-preload-call-form',
  imports: [
    ReactiveFormsModule,
    Label,
    InputField,
    DatePicker,
    CollapsibleSection,
    Button,
    Icon,
    ModalityTable,
    ModalityFormModal,
    PreloadCallPersonSearchModal,
    Select,
  ],
  templateUrl: './preload-call-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloadCallForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly preloadCallService = inject(PreloadCallService);

  private universityPeriods: UniversityPeriodItem[] = [];
  private educationalLevels: EducationalLevelItem[] = [];
  private lastSyncedDetailId: number | null = null;

  readonly mode = input<'create' | 'edit' | 'read'>('create');
  readonly preloadCall = input<PreloadCallDetailResponse | null>(null);
  readonly isSaving = input<boolean>(false);
  readonly closeForm = output<void>();
  readonly submitPreloadCall = output<PreloadCallSaveRequest>();

  readonly isReadOnly = computed(() => this.mode() === 'read');

  readonly searchModalOpen = signal(false);
  readonly modalityModalOpen = signal(false);
  readonly searchResults = signal<PersonaAutorizaConvocatoriaItem[]>([]);
  readonly modalities = signal<ModalityFormItem[]>([]);
  readonly isSearching = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly searchError = signal<string | null>(null);
  readonly authorizerSectionExpanded = signal(false);
  readonly callInfoSectionExpanded = signal(false);
  readonly modalitySectionExpanded = signal(false);

  readonly universityPeriodOptions = signal<SelectOption[]>([]);
  readonly educationalLevelOptions = signal<SelectOption[]>([]);
  readonly modalitySelectOptions = signal<SelectOption[]>([]);

  readonly form = this.fb.group({
    idPersonaNaturalGeneral: [null as number | null],
    documentoIdentidad: [''],
    nombreCompleto: [''],
    telefonoCelular: [''],
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    fechaInicioCtei: [''],
    fechaFinCtei: [''],
    fechaInicioIsu: [''],
    fechaFinIsu: [''],
    periodoUniversidad: ['', Validators.required],
    nivelEducativo: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const isCreateMode = this.mode() === 'create';
      this.authorizerSectionExpanded.set(!isCreateMode);
      this.callInfoSectionExpanded.set(!isCreateMode);
      this.modalitySectionExpanded.set(!isCreateMode);
    });

    effect(() => {
      const detail = this.preloadCall();
      const isCreateMode = this.mode() === 'create';
      const catalogsReady =
        this.universityPeriodOptions().length > 0 &&
        this.educationalLevelOptions().length > 0 &&
        this.modalitySelectOptions().length > 0;

      if (!detail) {
        this.lastSyncedDetailId = null;
        if (isCreateMode) {
          this.resetFormState();
        }
        return;
      }

      if (!catalogsReady) {
        return;
      }

      if (this.lastSyncedDetailId === detail.id) {
        return;
      }

      this.lastSyncedDetailId = detail.id ?? null;
      this.syncFormFromDetail(detail);
    });
  }

  private resetFormState(): void {
    this.form.reset();
    this.modalities.set([]);
    this.saveError.set(null);
    this.searchError.set(null);
  }

  private syncFormFromDetail(detail: PreloadCallDetailResponse): void {
    const cnv = detail.fechas.find((fecha) => fecha.codigo === 'CNV');
    const cti = detail.fechas.find((fecha) => fecha.codigo === 'CTI');
    const isu = detail.fechas.find((fecha) => fecha.codigo === 'ISU');

    this.form.patchValue({
      nombre: detail.convocatoria.nombre,
      descripcion: detail.convocatoria.descripcion,
      idPersonaNaturalGeneral: detail.convocatoria.autoriza.id,
      documentoIdentidad: detail.convocatoria.autoriza.documentoIdentidad,
      nombreCompleto: detail.convocatoria.autoriza.nombreCompleto,
      telefonoCelular: detail.convocatoria.autoriza.telefonoCelular ?? '',
      periodoUniversidad: String(detail.convocatoria.periodo.id),
      nivelEducativo: String(detail.convocatoria.nivelEducativo.id),
      fechaInicio: this.toDateOnly(cnv?.fechaInicio),
      fechaFin: this.toDateOnly(cnv?.fechaFin),
      fechaInicioCtei: this.toDateOnly(cti?.fechaInicio),
      fechaFinCtei: this.toDateOnly(cti?.fechaFin),
      fechaInicioIsu: this.toDateOnly(isu?.fechaInicio),
      fechaFinIsu: this.toDateOnly(isu?.fechaFin),
    });

    this.modalities.set(this.mapDetailModalities(detail));
  }

  private mapDetailModalities(
    detail: PreloadCallDetailResponse,
  ): ModalityFormItem[] {
    return detail.modalidades.map((item) => {
      const tipoModalidad = String(item.idModalidadContratacion);
      const label =
        this.modalitySelectOptions().find((opt) => opt.value === tipoModalidad)
          ?.label ?? tipoModalidad;

      return {
        id: crypto.randomUUID(),
        tipoModalidad,
        tipoModalidadLabel: label,
        diasVacaciones: item.vacaciones,
        fechaInicio: this.toDateOnly(item.fechaInicio),
        fechaFin: this.toDateOnly(item.fechaFin),
        semanas: Number(item.semanas),
      };
    });
  }

  private toDateOnly(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const datePart = value.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
  }

  ngOnInit(): void {
    this.getUniversityPeriods();
    this.getEducationalLevels();
    this.getModalities();
  }

  getUniversityPeriods(): void {
    this.preloadCallService.getUniversityPeriod().subscribe({
      next: (lista) => {
        this.universityPeriods = lista;
        this.universityPeriodOptions.set(
          lista.map((item) => ({
            value: String(item.id),
            label: `${item.anio} - ${item.periodo}`,
          })),
        );
      },
    });
  }

  getEducationalLevels(): void {
    this.preloadCallService.getEducationalLevels().subscribe({
      next: (lista) => {
        this.educationalLevels = lista;
        this.educationalLevelOptions.set(
          lista.map((item) => ({
            value: String(item.id),
            label: formatSentenceValue(item.descripcion),
          })),
        );
      },
    });
  }

  getModalities(): void {
    this.preloadCallService.getModalities().subscribe({
      next: (lista) => {
        this.modalitySelectOptions.set(
          lista.map((item) => ({
            value: String(item.id),
            label: formatSentenceValue(item.nombre),
          })),
        );
      },
    });
  }

  openModalityModal(): void {
    this.modalityModalOpen.set(true);
  }

  closeModalityModal(): void {
    this.modalityModalOpen.set(false);
  }

  onModalitySaved(item: ModalityFormItem): void {
    this.modalities.update((items) => [...items, item]);
    this.closeModalityModal();
  }

  onDeleteModality(item: ModalityFormItem): void {
    this.modalities.update((items) =>
      items.filter((row) => row.id !== item.id),
    );
  }

  onSearchPerson(): void {
    const documento = this.form.controls.documentoIdentidad.value?.trim();
    const nombre = this.form.controls.nombreCompleto.value?.trim();

    if (!documento && !nombre) {
      this.searchError.set(
        'Ingrese documento o nombre para realizar la búsqueda.',
      );
      return;
    }

    this.searchError.set(null);
    this.isSearching.set(true);
    this.searchModalOpen.set(true);
    this.searchResults.set([]);

    this.preloadCallService
      .searchGeneralPerson({ documento, nombre })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (results) => this.searchResults.set(results),
        error: () => {
          this.searchResults.set([]);
          this.searchError.set(
            'No fue posible consultar las personas. Intente de nuevo.',
          );
        },
      });
  }

  onPersonSelected(person: PersonaAutorizaConvocatoriaItem): void {
    this.form.patchValue({
      idPersonaNaturalGeneral: person.id,
      documentoIdentidad: person.documentoIdentidad,
      nombreCompleto: person.nombreCompleto,
      telefonoCelular: person.telefonoCelular ?? '',
    });
    this.closeSearchModal();
  }

  closeSearchModal(): void {
    this.searchModalOpen.set(false);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isReadOnly() || this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.modalities().length === 0) {
      this.saveError.set('Agregue al menos una modalidad.');
      return;
    }

    const idPersona = this.form.controls.idPersonaNaturalGeneral.value;
    if (idPersona == null) {
      this.saveError.set(
        'Seleccione la persona que autoriza desde la búsqueda.',
      );
      return;
    }

    const value = this.form.getRawValue();
    const periodo = this.universityPeriods.find(
      (item) => String(item.id) === value.periodoUniversidad,
    );
    const nivelEducativo = this.educationalLevels.find(
      (item) => String(item.id) === value.nivelEducativo,
    );

    if (!periodo || !nivelEducativo) {
      this.saveError.set('Seleccione periodo y nivel educativo.');
      return;
    }

    const payload = buildPreloadCallSavePayload({
      nombre: value.nombre ?? '',
      descripcion: value.descripcion ?? '',
      idPersonaNaturalGeneral: idPersona,
      documentoIdentidad: value.documentoIdentidad ?? '',
      nombreCompleto: value.nombreCompleto ?? '',
      periodo,
      nivelEducativo,
      fechaInicio: value.fechaInicio ?? '',
      fechaFin: value.fechaFin ?? '',
      fechaInicioCtei: value.fechaInicioCtei ?? '',
      fechaFinCtei: value.fechaFinCtei ?? '',
      fechaInicioIsu: value.fechaInicioIsu ?? '',
      fechaFinIsu: value.fechaFinIsu ?? '',
      modalidades: this.modalities(),
    });

    this.saveError.set(null);
    this.submitPreloadCall.emit(payload);
  }
}
