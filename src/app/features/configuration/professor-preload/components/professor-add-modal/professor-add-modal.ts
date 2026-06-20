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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { Select } from '../../../../../shared/components/form/select/select';
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
  CoordinationContractModality,
  ProfessorSearchResult,
} from '../../model/coordination.model';
import {
  PROFESSOR_FIELDS,
  ProfessorFieldConfig,
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
    ReactiveFormsModule,
  ],
  templateUrl: './professor-add-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorAddModal {
  private readonly coordinationService = inject(CoordinationService);

  isOpen = input(false);
  contractModality = input<CoordinationContractModality | null>(null);
  close = output<void>();

  readonly isProfessorActive = signal(true);
  readonly searchResults = signal<ProfessorSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly selectedProfessor = signal<ProfessorSearchResult | null>(null);

  readonly fields = computed<ProfessorFieldConfig[]>(() => {
    const kind = resolveModalityKind(this.contractModality()?.nombre);
    return kind ? PROFESSOR_FIELDS[kind] : [];
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

  onProfessorSelected(option: TypeaheadOption): void {
    const professor = option.data as ProfessorSearchResult;
    this.selectedProfessor.set(professor);

    const descripcion = professor.categoriaCatedratico?.descripcion ?? '';
    this.professorForm().patchValue({
      categoriaDocente: descripcion,
      categoriaCatedratico: descripcion,
    });
  }

  private buildSearchParams(term: string): SearchGeneralPersonParams {
    const value = term.trim();
    if (/^\d+$/.test(value)) {
      return { documento: value };
    }

    return { nombre: value };
  }
}
