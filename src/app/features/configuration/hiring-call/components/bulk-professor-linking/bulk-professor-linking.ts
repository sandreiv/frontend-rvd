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
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { Option, Select } from '../../../../../shared/components/form/select/select';

import { HiringCallService } from '../../data/hiring-call.service';
import { ProfessorInformationItem } from '../../model/hiring-call.model';
import { forNext } from '../../../../../core/utils/for-next.function';

import { ContractOperation } from '../draft-contract/draft-contract';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';

interface BulkProfessorInformation {
  idCargaDocente: number;
  information: ProfessorInformationItem;
}

@Component({
  selector: 'app-bulk-professor-linking',
  imports: [Modal, Icon, DatePicker, Select, InputField, Button, Tooltip, ReactiveFormsModule],
  templateUrl: './bulk-professor-linking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkProfessorLinking {
  private readonly hiringCallService = inject(HiringCallService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isOpen = input(false);
  readonly idsCargaDocente = input<number[]>([]);
  readonly numeroPeriodo = input<string | null>(null);

  readonly close = output<void>();
  readonly success = output<void>();

  readonly selectedIds = signal<number[]>([]);
  readonly isSubmitting = signal(false);

  readonly contractForm = this.formBuilder.group({
    fechaFirma: ['', [Validators.required]],
    formaPagoId: ['', [Validators.required]],
    tipoObjetoId: ['', [Validators.required]],
    formaInicioContratoId: ['', [Validators.required]],
    laborId: ['', [Validators.required]],
    objeto: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
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

  readonly isLoadingInformation = computed(() =>
    this.isOpen() && this.informationResource.isLoading(),
  );

  readonly canSubmit = computed(() =>
    this.contractFormStatus() === 'VALID' &&
    this.selectedIds().length > 0 &&
    this.selectedProfessors().length === this.selectedIds().length &&
    !this.isLoadingInformation() &&
    !this.contractCatalogsResource.isLoading() &&
    !this.isSubmitting() &&
    this.numeroPeriodo() != null
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.selectedIds.set([]);
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

  professorUnavailableReason(row: BulkProfessorInformation,): string {
    if (!row.information.numeroContrato?.trim()) {
      return 'Sin número de contrato asignado';
    }

    if (row.information.contratacionVinculado === '1') {
      return 'Contrato ya vinculado';
    }

    return '';
  }

  isProfessorSelected(idCargaDocente: number): boolean {
    return this.selectedIds().includes(idCargaDocente);
  }

  toggleProfessorSelection(row: BulkProfessorInformation): void {
    if (!this.isProfessorSelectable(row) || this.isSubmitting()) {
      return;
    }

    this.selectedIds.update((current) => {
      if (current.includes(row.idCargaDocente)) {
        return current.filter((id) => id !== row.idCargaDocente);
      }

      return [...current, row.idCargaDocente];
    });
  }


  closeModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.close.emit();
  }
}