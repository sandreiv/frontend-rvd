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
      label: 'Categoría del docente',
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

export function resolveAssignmentFields(
  kind: ContractModalityKind | null,
  hasIdentifiedProfessor: boolean,
  lockFechaLabor: boolean,
): ProfessorFieldConfig[] {
  if (!kind) {
    return [];
  }

  return PROFESSOR_FIELDS[kind].map((field) =>
    resolveAssignmentField(
      field,
      kind,
      hasIdentifiedProfessor,
      lockFechaLabor,
    ),
  );
}

export function resolveWeeklyHoursLabel(
  rangoHoras: string | null | undefined,
  exceptionHours: string | null | undefined,
): string {
  const exception = String(exceptionHours ?? '').trim();
  if (exception) {
    return exception;
  }

  return rangoHoras?.trim() ?? '';
}

export function professorDisplayName(
  nombreCompleto: string | null | undefined,
  idPersonaGeneral: number | null | undefined,
): string {
  if (idPersonaGeneral == null) {
    return 'NN';
  }

  return nombreCompleto?.trim() || 'NN';
}

function resolveAssignmentField(
  field: ProfessorFieldConfig,
  kind: ContractModalityKind,
  hasIdentifiedProfessor: boolean,
  lockFechaLabor: boolean,
): ProfessorFieldConfig {
  if (field.key === 'categoriaCatedratico') {
    return resolveCategoriaField(field, kind, hasIdentifiedProfessor);
  }

  if (field.key === 'numeroPuntos' && !hasIdentifiedProfessor) {
    return { ...field, readonly: false };
  }

  if (field.key === 'fechaLabor' && lockFechaLabor) {
    return { ...field, control: 'text', readonly: true };
  }

  return field;
}

function resolveCategoriaField(
  field: ProfessorFieldConfig,
  kind: ContractModalityKind,
  hasIdentifiedProfessor: boolean,
): ProfessorFieldConfig {
  if (kind === 'catedra' && hasIdentifiedProfessor) {
    return {
      ...field,
      control: 'select',
      readonly: false,
      placeholder: 'Seleccione la categoría',
    };
  }

  if (kind === 'tiempoCompletoOcasional' && !hasIdentifiedProfessor) {
    return {
      ...field,
      control: 'select',
      readonly: false,
      placeholder: 'Seleccione la categoría',
    };
  }

  return field;
}

export function formatWorkDateRange(fechaInicio: string, fechaFin: string): string {
  return `${formatWorkDate(fechaInicio)} - ${formatWorkDate(fechaFin)}`;
}

/**
 * Detecta si el periodo universitario de la convocatoria es el
 * segundo periodo del año (ej. "2026-2").
 */
export function isSecondUniversityPeriod(
  periodoUniversidad: string | null | undefined,
): boolean {
  if (!periodoUniversidad?.trim()) {
    return false;
  }

  const periodPart = periodoUniversidad
    .trim()
    .split('-')
    .at(-1)
    ?.trim();

  return periodPart === '2';
}

export function isOnceMesesProfessor(
  onceMeses: string | null | undefined,
): boolean {
  return String(onceMeses ?? '').trim() === '1';
}

export function parseMaxWeeklyHours(rangoHoras: string | null | undefined): number | null {
  if (!rangoHoras?.trim()) {
    return null;
  }

  const parts = rangoHoras.split('-').map((part) => part.trim());
  const max = Number(parts[parts.length - 1]);

  return Number.isFinite(max) ? max : null;
}

export function parseMinWeeklyHours(
  rangoHoras: string | null | undefined,
): number | null {
  if (!rangoHoras?.trim()) {
    return null;
  }

  const parts = rangoHoras
    .split('-')
    .map((part) => part.trim());

  const min = Number(parts[0]);

  return Number.isFinite(min)
    ? min
    : null;
}

function formatWorkDate(value: string): string {
  const datePart = value.substring(0, 10);
  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}


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
