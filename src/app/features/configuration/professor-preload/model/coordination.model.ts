export interface CoordinationLookupItem {
  id: number;
  nombre?: string;
  descripcion?: string;
}

export interface CoordinationUniversityPeriod {
  id: number;
  anio: number;
  periodo: string;
}

export interface CoordinationApiItem {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string | null;
  esAcademica: string;
  unidadRegional: CoordinationLookupItem;
  unidadArea: CoordinationLookupItem;
  metodologia: CoordinationLookupItem | null;
  modalidad: CoordinationLookupItem | null;
  nivelEducativo: CoordinationLookupItem | null;
  periodoUniversidad: CoordinationUniversityPeriod | null;
  estadoCarga: CoordinationLookupItem | null;
  idConvocatoria: number | null;
}

export interface CoordinationItem {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  esAcademica: string;
  unidadRegional: string;
  unidadArea: string;
  metodologia: string;
  modalidad: string;
  nivelEducativo: string;
  periodoUniversidad: string;
  estadoCarga: string;
  idConvocatoria: number | null;
}

export const UNASSIGNED_PRELOAD_CALL_FILTER = 'none';

function resolveLookupLabel(
  item: CoordinationLookupItem | null | undefined,
  field: 'nombre' | 'descripcion' = 'nombre',
): string {
  if (!item) {
    return '';
  }

  return item[field]?.trim() ?? '';
}

function formatUniversityPeriod(
  period: CoordinationUniversityPeriod | null | undefined,
): string {
  if (!period) {
    return '';
  }

  return `${period.anio}-${period.periodo}`;
}

function formatAcademicFlag(value: string | null | undefined): string {
  if (value === '1') {
    return 'Sí';
  }

  if (value === '0') {
    return 'No';
  }

  return value?.trim() ?? '';
}

export function normalizeCoordinationItem(
  item: CoordinationApiItem,
): CoordinationItem {
  return {
    id: item.id,
    nombre: item.nombre?.trim() ?? '',
    descripcion: item.descripcion?.trim() ?? '',
    codigo: item.codigo?.trim() ?? '',
    esAcademica: formatAcademicFlag(item.esAcademica),
    unidadRegional: resolveLookupLabel(item.unidadRegional),
    unidadArea: resolveLookupLabel(item.unidadArea),
    metodologia: resolveLookupLabel(item.metodologia, 'descripcion'),
    modalidad: resolveLookupLabel(item.modalidad, 'descripcion'),
    nivelEducativo: resolveLookupLabel(item.nivelEducativo, 'descripcion'),
    periodoUniversidad: formatUniversityPeriod(item.periodoUniversidad),
    estadoCarga: resolveLookupLabel(item.estadoCarga, 'descripcion'),
    idConvocatoria: item.idConvocatoria ?? null,
  };
}
