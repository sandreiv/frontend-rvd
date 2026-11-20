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
} from '@angular/core';

import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin, map } from 'rxjs';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Button } from '../../../../../shared/ui/button/button';
import { Option, Select } from '../../../../../shared/components/form/select/select';

import { HiringCallService } from '../../data/hiring-call.service';
import { ProfessorInformationItem } from '../../model/hiring-call.model';
import { forNext } from '../../../../../core/utils/for-next.function';

import { ContractOperation } from '../draft-contract/draft-contract';

const SELECT_ALL_PROFESSORS = '__SELECT_ALL_PROFESSORS__';
interface BulkProfessorInformation {
  idCargaDocente: number;
  information: ProfessorInformationItem;
}

@Component({
  selector: 'app-bulk-professor-linking',
  imports: [Modal, Icon, Select, Button, ReactiveFormsModule],
  templateUrl: './bulk-professor-linking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkProfessorLinking {
  private readonly hiringCallService = inject(HiringCallService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isOpen = input(false);
  readonly idsCargaDocente = input<number[]>([]);

  readonly close = output<void>();
  readonly success = output<void>();

  readonly selectedIds = signal<number[]>([]);

  readonly professorPicker = this.formBuilder.control('');

  readonly isSubmitting = signal(false);

  readonly contractForm = this.formBuilder.group({
    laborId: ['', [Validators.required]],
  });

  private readonly contractFormStatus = toSignal(this.contractForm.statusChanges, {
    initialValue: this.contractForm.status,
  });


  readonly contractCatalogsResource = rxResource({
    params: () => (this.isOpen() ? { open: true } as const : undefined),
    stream: () => this.hiringCallService.getContractCatalogs(),
  });

  readonly contractCatalogs = computed(() => {
    if (!this.isOpen() || !this.contractCatalogsResource.hasValue()) {
      return null;
    }
    return this.contractCatalogsResource.value();
  });

  readonly laborOptions = computed<Option[]>(() =>
    (this.contractCatalogs()?.labores ?? []).map((item) => ({
      value: String(item.id),
      label: item.descripcion,
    })),
  );

  readonly informationResource = rxResource({
    params: () => {
      const ids = this.isOpen()
        ? [...new Set(this.idsCargaDocente())]
        : [];

      return ids.length ? { ids } : undefined;
    },

    stream: ({ params }) =>
      forkJoin(
        params.ids.map((idCargaDocente) =>
          this.hiringCallService.getProfessorInformation(idCargaDocente)
            .pipe(
              map((information) => ({
                idCargaDocente,
                information,
              })),
            ),
        ),
      ),
  });

  readonly professorRows = computed<BulkProfessorInformation[]>(() => {
    if (!this.isOpen() || !this.informationResource.hasValue()) {
      return [];
    }

    return this.informationResource.value();
  });

  readonly selectableProfessors = computed(() =>
    this.professorRows().filter((row) =>
      this.isProfessorSelectable(row),
    ),
  );

  readonly selectedProfessors = computed(() => {
    const ids = new Set(this.selectedIds());

    return this.selectableProfessors().filter((row) =>
      ids.has(row.idCargaDocente),
    );
  });

  readonly availableProfessorOptions = computed<Option[]>(() => {
    const selected = new Set(this.selectedIds());

    const available = this.selectableProfessors()
      .filter((row) => !selected.has(row.idCargaDocente));

    if (available.length === 0) {
      return [];
    }

    const professorOptions: Option[] = available.map((row) => ({
      value: String(row.idCargaDocente),
      label: `${row.information.nombreCompleto || 'Docente'} - Documento: ${row.information.documentoIdentidad || 'Sin documento'}`,
    }));

    return [
      {
        value: SELECT_ALL_PROFESSORS,
        label: `Seleccionar todos (${available.length} disponibles)`,
      },
      ...professorOptions,
    ];
  });

  readonly isLoadingInformation = computed(() =>
    this.isOpen() && this.informationResource.isLoading(),
  );

  readonly canSubmit = computed(() =>
    this.contractFormStatus() === 'VALID' &&
    this.selectedIds().length > 0 &&
    this.selectedProfessors().length === this.selectedIds().length &&
    !this.isLoadingInformation() &&
    !this.contractCatalogsResource.isLoading() &&
    !this.isSubmitting()
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.selectedIds.set([]);

        this.professorPicker.setValue('', {
          emitEvent: false,
        });

        this.contractForm.reset();
      }
    });
  }

  // Solo permite seleccionar profesores con numero de contrato asignado y no vinculados
  isProfessorSelectable(row: BulkProfessorInformation): boolean {
    const numeroContrato = row.information.numeroContrato?.trim();

    return (
      !!numeroContrato &&
      row.information.contratacionVinculado !== '1'
    );
  }

  onProfessorSelected(value: string): void {

    if (this.isSubmitting()) {
      return;
    }

    if (value === SELECT_ALL_PROFESSORS) {

      const allIds = this.selectableProfessors()
        .map((row) => row.idCargaDocente);

      this.selectedIds.update((current) => [
        ...new Set([...current, ...allIds]),
      ]);

    } else {

      const id = Number(value);

      const professor = this.selectableProfessors().find(
        (row) => row.idCargaDocente === id,
      );

      if (professor && !this.selectedIds().includes(id)) {
        this.selectedIds.update((current) => [
          ...current,
          id,
        ]);
      }
    }

    this.professorPicker.setValue('', {
      emitEvent: false,
    });
  }

  removeSelectedProfessor(idCargaDocente: number): void {
    if (this.isSubmitting()) {
      return;
    }

    this.selectedIds.update((current) =>
      current.filter((id) => id !== idCargaDocente),
    );
  }

  /**
   * Ejecuta la vinculación masiva de docentes.
   */
  submitBulkLinking(): void {

    if (!this.canSubmit()) {
      this.contractForm.markAllAsTouched();
      return;
    }

    const idsCargaDocente = [...this.selectedIds()];

    const idLabor = Number(
      this.contractForm.controls.laborId.value
    );

    if (!Number.isSafeInteger(idLabor) || idLabor <= 0) {
      this.contractForm.controls.laborId.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.hiringCallService
      .vincularDocentesMasivamente(
        idsCargaDocente,
        idLabor
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({

        next: (response) => {

          if (response.totalVinculados !== idsCargaDocente.length) {
            console.error(
              'El total vinculado no coincide con el solicitado:',
              response
            );
            return;
          }

          this.success.emit();
        },

        error: () => {
          
        },

      });
  }


  closeModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.close.emit();
  }
}