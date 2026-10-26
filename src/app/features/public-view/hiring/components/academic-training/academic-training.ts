import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { DatePicker } from '../../../../../shared/components/form/date-picker/date-picker';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Label } from '../../../../../shared/components/form/label/label';
import {
    Select,
    type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import {
    TypeaheadSelect,
    type TypeaheadOption,
} from '../../../../../shared/components/form/typeahead-select/typeahead-select';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';

import {
    PublicAcademicLevel,
    PublicAcademicTitle,
    PublicAcademicTrainingSave,
    PublicCountry,
    PublicAcademicTraining,
} from '../../model/hiring.model';

@Component({
    selector: 'app-public-academic-training',
    imports: [
        ReactiveFormsModule,
        Label,
        InputField,
        Select,
        TypeaheadSelect,
        DatePicker,
        Button,
        Icon,
        NgTemplateOutlet,
    ],
    templateUrl: './academic-training.html',
    changeDetection:
        ChangeDetectionStrategy.OnPush,
})
export class AcademicTraining {
    private readonly fb = inject(FormBuilder);

    readonly academicLevels =
        input<PublicAcademicLevel[]>([]);

    readonly academicTitles =
        input<PublicAcademicTitle[]>([]);

    readonly countries =
        input<PublicCountry[]>([]);

    readonly titlesLoading =
        input(false);

    readonly saving =
        input(false);

    readonly readOnly=
        input(false);    

    readonly academicLevelChange =
        output<number>();

    readonly titleQueryChange =
        output<string>();

    readonly saveTraining =
        output<PublicAcademicTrainingSave>();

    readonly latestTraining =
        input<PublicAcademicTraining | null>(
            null,
        );

    readonly loadingLatest =
        input(false);

    readonly latestLoadError =
        input(false);

    readonly creating =
        signal(false);

    private ultimoNivelSeleccionado = '';

    readonly tituloPrecargado =
        signal<TypeaheadOption | null>(null);    

    readonly academicLevelOptions =
        computed<SelectOption[]>(() =>
            this.academicLevels().map(
                (item) => ({
                    value: String(item.id),
                    label: item.descripcion,
                }),
            ),
        );

    readonly countryOptions =
        computed<SelectOption[]>(() =>
            this.countries().map(
                (item) => ({
                    value: item.id,
                    label: item.nombre,
                }),
            ),
        );

    readonly titleOptions =
        computed<TypeaheadOption[]>(() => {

            /*
            * Opciones obtenidas mediante
            * la búsqueda normal del backend.
            */
            const options =
                this.academicTitles().map(
                    (item) => ({
                        value: String(item.id),
                        label: item.nombre,
                        data: item,
                    }),
                );

            /*
            * Título precargado desde el
            * último estudio académico.
            */
            const precargado =
                this.tituloPrecargado();

            /*
            * Si no hay título precargado,
            * mantenemos el comportamiento
            * habitual del selector.
            */
            if (!precargado) {
                return options;
            }

            /*
            * Evitamos duplicar el título
            * si ya aparece en los resultados.
            */
            const existe =
                options.some(
                    (option) =>
                        option.value ===
                        precargado.value,
                );

            if (existe) {
                return options;
            }

            /*
            * Incorporamos el último título
            * para que el TypeaheadSelect
            * pueda mostrar su nombre.
            */
            return [
                precargado,
                ...options,
            ];
        });

    readonly form =
        this.fb.nonNullable.group({
            idNivelAcademico: [
                '',
                Validators.required,
            ],

            idTitulo: [
                '',
                Validators.required,
            ],

            institucion: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(160),
                ],
            ],

            fechaGrado: [
                '',
                Validators.required,
            ],

            idPais: [
                '',
                Validators.required,
            ],
        });

    onAcademicLevelChange(
        value: string,
    ): void {

        if (
            value ===
            this.ultimoNivelSeleccionado
        ) {
            return;
        }

        this.ultimoNivelSeleccionado =
            value;

        this.tituloPrecargado.set(null);

        this.form.controls.idTitulo.setValue('');

        const id = Number(value);

        if (
            !value ||
            !Number.isFinite(id)
        ) {
            return;
        }

        this.academicLevelChange.emit(id);
    }

    onTitleQueryChange(
        query: string,
    ): void {

        const normalizedQuery =
            query.trim();

        if (normalizedQuery) {
            this.tituloPrecargado.set(null);
        }

        this.titleQueryChange.emit(
            normalizedQuery,
        );
    }

    onSubmit(): void {

        if (this.readOnly()) {
            return;
        }

        if (
            this.form.invalid ||
            this.saving()
        ) {
            this.form.markAllAsTouched();
            return;
        }

        const value =
            this.form.getRawValue();

        this.saveTraining.emit({
            idNivelAcademico:
                Number(value.idNivelAcademico),

            idTitulo:
                Number(value.idTitulo),

            institucion:
                value.institucion.trim(),

            fechaGrado:
                value.fechaGrado,

            idPais:
                value.idPais,
        });
    }

    startNewTraining(): void {

        if (this.readOnly()) {
            return;
        }

        const latest =
            this.latestTraining();

        this.resetForm();

        if (latest) {

            this.ultimoNivelSeleccionado =
                String(latest.idNivelAcademico);

            this.tituloPrecargado.set({

                value:
                    String(latest.idTitulo),

                label:
                    latest.titulo,

                data: {
                    id:
                        latest.idTitulo,

                    idNivelAcademico:
                        latest.idNivelAcademico,

                    nombre:
                        latest.titulo,
                },
            });

            this.form.patchValue({

                idNivelAcademico:
                    String(latest.idNivelAcademico),

                idTitulo:
                    String(latest.idTitulo),

                institucion:
                    latest.institucion ?? '',

                fechaGrado:
                    latest.fechaGrado
                        ?.slice(0, 10) ?? '',

                idPais:
                    latest.idPais ?? '',

            });
        }

        this.creating.set(true);

        if (latest) {

            this.academicLevelChange.emit(
                latest.idNivelAcademico,
            );
        }
    }

    cancelNewTraining(): void {
        this.resetForm();
        this.creating.set(false);
    }

    showLatestTraining(): void {
        this.resetForm();
        this.creating.set(false);
    }

    resetView(): void {
        this.resetForm();
        this.creating.set(false);
    }

    resetForm(): void {

        this.ultimoNivelSeleccionado = '';

        this.tituloPrecargado.set(null);

        this.form.reset({
            idNivelAcademico: '',
            idTitulo: '',
            institucion: '',
            fechaGrado: '',
            idPais: '',
        });
    }

    formatDate(
        value: string | null,
    ): string {
        if (!value) {
            return '—';
        }

        const parts = value.split('-');

        if (parts.length !== 3) {
            return value;
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
}