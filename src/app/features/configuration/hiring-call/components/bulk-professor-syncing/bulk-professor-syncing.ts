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
import { ProfessorInformationItem } from '../../model/hiring-call.model';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Option, Select } from '../../../../../shared/components/form/select/select';
import { Button } from '../../../../../shared/ui/button/button';
import { HiringCallService } from '../../data/hiring-call.service';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, map } from 'rxjs';

const INDICADOR_ONCE_MESES = "1";
const NUMERO_PERIODO_SEGUNDO = "2";
const SELECT_ALL_PROFESSORS = '__SELECT_ALL_PROFESSORS__';

interface BulkProfessorInformation {
  idCargaDocente: number;
  information: ProfessorInformationItem;
}

@Component({
  selector: 'app-bulk-professor-syncing',
  imports: [Modal, Icon, Select, Button, ReactiveFormsModule],
  templateUrl: './bulk-professor-syncing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkProfessorSyncing {
  private readonly hiringCallService = inject(HiringCallService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isOpen = input(false);
  readonly idCarga = input<number | null>(null);
  readonly idsCargaDocente = input<number[]>([]);
  readonly numeroPeriodo = input<string | null>(null);

  readonly close = output<void>();
  readonly success = output<void>();

  readonly selectedIds = signal<number[]>([]);
  readonly isSubmitting = signal(false);
  readonly professorPicker = this.formBuilder.control('');

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
    this.selectedIds().length > 0 &&
    this.selectedProfessors().length === this.selectedIds().length &&
    !this.isLoadingInformation() &&
    !this.isSubmitting() &&
    this.numeroPeriodo() != null &&
    this.idCarga() != null
  );

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.selectedIds.set([]);

        this.professorPicker.setValue('', {
          emitEvent: false,
        });
      }
    });
  }

  // Solo permite seleccionar profesores segun los filtros del backend
  // Docentes con contrato, sin contrato y plata, sin contrato y heredados
  isProfessorSelectable(row: BulkProfessorInformation): boolean {
    const professor = row.information;
    const tieneVinculacion = professor.contratacionVinculado === '1';
    const tieneModalidad = !!professor.idModalidadContratacion;
    const esProfesorHeredado = (professor.onceMeses === INDICADOR_ONCE_MESES) && (this.numeroPeriodo() === NUMERO_PERIODO_SEGUNDO);
    console.log(professor)

    return (
      tieneVinculacion ||
      (!tieneVinculacion && !tieneModalidad) ||
      (!tieneVinculacion && tieneModalidad && esProfesorHeredado)
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

  submitBulkSyncing(): void {
    const idCarga = this.idCarga();
    if (!this.canSubmit() || !idCarga) {
      return;
    }

    const idsCargaDocente = [...this.selectedIds()];    
    this.isSubmitting.set(true);

    this.hiringCallService.sincronizarDocentesMasivamente(idsCargaDocente, idCarga)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.totalSincronizados !== idsCargaDocente.length) {
            console.error(
              'El total sincronizado no coincide con el solicitado:',
              response
            );
            return;
          }

          this.success.emit();
        }
      });
  }
  
  closeModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.close.emit();
  }
}