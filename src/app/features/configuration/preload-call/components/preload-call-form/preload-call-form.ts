import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CollapsibleSection } from '../../../../../shared/components/form/collapsible-section/collapsible-section';
import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import { PreloadCallService } from '../../data/preload-call.service';
import {
  ModalityFormItem,
  ModalityItem,
  PersonaAutorizaConvocatoriaItem,
  PreloadCallItem,
} from '../../model/preload-call.model';
import { ModalityFormModal } from '../modality-form-modal/modality-form-modal';
import { ModalityTable } from '../modality-table/modality-table';
import { PreloadCallPersonSearchModal } from '../preload-call-person-search-modal/preload-call-person-search-modal';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';

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
  ],
  templateUrl: './preload-call-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloadCallForm {
  private readonly fb = inject(FormBuilder);
  private readonly preloadCallService = inject(PreloadCallService);

  readonly mode = input<'create' | 'edit' | 'read'>('create');
  readonly preloadCall = input<PreloadCallItem | null>(null);
  readonly closeForm = output<void>();

  readonly isReadOnly = computed(() => this.mode() === 'read');

  readonly searchModalOpen = signal(false);
  readonly modalityModalOpen = signal(false);
  readonly searchResults = signal<PersonaAutorizaConvocatoriaItem[]>([]);
  readonly modalities = signal<ModalityFormItem[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly authorizerSectionExpanded = signal(false);
  readonly callInfoSectionExpanded = signal(false);
  readonly modalitySectionExpanded = signal(false);

  readonly modalitiesCatalogResource = rxResource({
    stream: () => this.preloadCallService.getModalities(),
    defaultValue: [] as ModalityItem[],
  });

  readonly modalitySelectOptions = computed(() =>
    this.modalitiesCatalogResource.value().map((item) => ({
      value: String(item.id),
      label: item.nombre,
    })),
  );

  readonly form = this.fb.group({
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
  });

  constructor() {
    effect(() => {
      const isCreateMode = this.mode() === 'create';
      this.authorizerSectionExpanded.set(!isCreateMode);
      this.callInfoSectionExpanded.set(!isCreateMode);
      this.modalitySectionExpanded.set(!isCreateMode);
    });

    effect(() => {
      const item = this.preloadCall();
      if (!item) {
        return;
      }
      this.form.patchValue({
        descripcion: item.descripcion,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
        nombreCompleto: item.nombreCompleto,
      });
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
      documentoIdentidad: person.documentoIdentidad,
      nombreCompleto: person.nombreCompleto,
      telefonoCelular: person.telefonoCelular ?? '',
    });
    this.closeSearchModal();
  }

  closeSearchModal(): void {
    this.searchModalOpen.set(false);
  }
}
