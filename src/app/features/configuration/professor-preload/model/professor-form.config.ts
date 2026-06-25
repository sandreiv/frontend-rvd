export type ContractModalityKind = 'catedra' | 'tiempoCompletoOcasional';

export interface ProfessorFieldConfig {
  key: string;
  label: string;
  control: 'number' | 'select' | 'text';
  placeholder?: string;
  readonly?: boolean;
  role?: 'categoria';
}

export const PROFESSOR_FIELDS: Record<ContractModalityKind, ProfessorFieldConfig[]> = {
  tiempoCompletoOcasional: [
    { 
      key: 'numeroPuntos', 
      label: 'Número de puntos', 
      control: 'number',
      readonly: true,
    },
    { 
      key: 'valorPunto', 
      label: 'Valor punto', 
      control: 'text',
      readonly: true,
    },
    { 
      key: 'asignacionSalarial', 
      label: 'Asignación salarial', 
      control: 'text',
      readonly: true,
    },
    {
      key: 'categoriaCatedratico',
      label: 'Categoría catedrático',
      control: 'text',
      readonly: true
    },
    {
      key: 'fechaLabor',
      label: 'Fecha labor',
      control: 'select',
      placeholder: 'Seleccione el rango',
    },
    {
      key: 'semanas',
      label: 'Número de semanas',
      control: 'number',
      readonly: true,
    },
    {
      key: 'vacaciones',
      label: 'Días de vacaciones',
      control: 'number',
      readonly: true,
    },
    {
      key: 'valorContrato',
      label: 'Valor del contrato',
      control: 'text',
      readonly: true,
    },
    {
      key: 'valorPrestaciones',
      label: 'Valor prestaciones',
      control: 'text',
      readonly: true,
    },
    {
      key: 'totalContrato',
      label: 'Total del contrato',
      control: 'text',
      readonly: true,
    },
    {
      key: 'horasSemanales',
      label: 'Horas semanales',
      control: 'text',
      readonly: true,
    },
  ],
  catedra: [
    {
      key: 'categoriaCatedratico',
      label: 'Categoría catedrático',
      control: 'text',
      readonly: true,
    },
    {
      key: 'fechaLabor',
      label: 'Fecha labor',
      control: 'select',
      placeholder: 'Seleccione el rango',
    },
    {
      key: 'semanas',
      label: 'Número de semanas',
      control: 'number',
      readonly: true,
    },
    { 
      key: 'valorHora', 
      label: 'Valor hora', 
      control: 'text',
      readonly: true,
    },
  ],
};

export function resolveModalityKind(nombre: string | null | undefined,): ContractModalityKind | null {
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

export function formatWorkDateRange(fechaInicio: string, fechaFin: string): string {
  return `${formatWorkDate(fechaInicio)} - ${formatWorkDate(fechaFin)}`;
}

function formatWorkDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

//const PRIMA_LEGAL = 1376873;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface ContractValues {
  valorContrato: number;
  valorPrestaciones: number;
  totalContrato: number;
}

export function diffInDays(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio).getTime();
  const fin = new Date(fechaFin).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin)) {
    return 0;
  }

  return Math.round((fin - inicio) / MS_PER_DAY);
}

export function computeContractValues(asignacionSalarial: number, cantidadDias: number,): ContractValues {
  const valorContrato = (asignacionSalarial / 30) * cantidadDias;
  const cesantias = (asignacionSalarial * cantidadDias) / 360;
  const intereses = ((cesantias * cantidadDias) / 360) * 0.12;
  const valorVacaciones = (asignacionSalarial * cantidadDias) / 720;
  const primaLegal = cesantias;
  const valorPrestaciones = cesantias + intereses + primaLegal + valorVacaciones;

  return {
    valorContrato: roundTo2(valorContrato),
    valorPrestaciones: roundTo2(valorPrestaciones),
    totalContrato: roundTo2(valorContrato + valorPrestaciones),
  };
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyCOP(value: number | string | null): string {
  if (value == null || value === '') {
    return '';
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return '';
  }

  return currencyFormatter.format(numeric);
}
