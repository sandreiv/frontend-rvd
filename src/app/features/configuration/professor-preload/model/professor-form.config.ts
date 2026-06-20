export type ContractModalityKind = 'catedra' | 'tiempoCompletoOcasional';

export interface ProfessorFieldConfig {
  key: string;
  label: string;
  control: 'number' | 'select' | 'text';
  placeholder?: string;
  readonly?: boolean;
}

export const PROFESSOR_FIELDS: Record<ContractModalityKind, ProfessorFieldConfig[]> = {
  tiempoCompletoOcasional: [
    { key: 'numeroPuntos', label: 'Número de puntos', control: 'number' },
    { key: 'valorPunto', label: 'Valor punto', control: 'number' },
    { key: 'asignacionSalarial', label: 'Asignación salarial', control: 'number' },
    {
      key: 'categoriaDocente',
      label: 'Categoría del docente',
      control: 'text',
      readonly: true,
    },
    {
      key: 'fechaLabor',
      label: 'Fecha labor',
      control: 'select',
      placeholder: 'Seleccione el rango',
    },
    { key: 'valorContrato', label: 'Valor del contrato', control: 'number' },
    { key: 'valorPrestaciones', label: 'Valor prestaciones', control: 'number' },
    { key: 'totalContrato', label: 'Total del contrato', control: 'number' },
    { key: 'horasSemanales', label: 'Horas semanales', control: 'number' },
  ],
  catedra: [
    { key: 'valorPunto', label: 'Valor punto', control: 'number' },
    {
      key: 'fechaLabor',
      label: 'Fecha labor',
      control: 'select',
      placeholder: 'Seleccione el rango',
    },
    {
      key: 'categoriaCatedratico',
      label: 'Categoría catedrático',
      control: 'text',
      readonly: true,
    },
    { key: 'numeroSemanas', label: 'Número de semanas', control: 'number' },
    { key: 'valorHora', label: 'Valor hora', control: 'number' },
  ],
};

export function resolveModalityKind(
  nombre: string | null | undefined,
): ContractModalityKind | null {
  if (!nombre) {
    return null;
  }

  const value = nombre.toLocaleLowerCase('es-CO');
  if (value.includes('catedra') || value.includes('cátedra')) {
    return 'catedra';
  }

  if (value.includes('ocasional')) {
    return 'tiempoCompletoOcasional';
  }

  return null;
}
