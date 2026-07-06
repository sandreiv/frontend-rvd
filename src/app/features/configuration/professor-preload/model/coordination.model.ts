import { PreloadCargaApi } from './preload-carga.model';

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

export interface CoordinationContractModality {
  id: number;
  nombre: string;
}

export interface CoordinationCentroCosto {
  id: number;
  descripcion: string;
}

export interface CoordinationPreloadCallApi {
  id: number;
  nombre: string;
  descripcion: string;
  estado?: string;
  nivelEducativo?: CoordinationLookupItem | null;
  periodoUniversidad?: CoordinationUniversityPeriod | null;
  modalidadesContratacion?: CoordinationContractModality[];
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
  convocatoria: CoordinationPreloadCallApi | null;
  carga: PreloadCargaApi | null;
  centroCosto?: CoordinationCentroCosto | null;
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
  anioUniversidad: number | null;
  estadoCarga: string;
  idCarga: number | null;
  idConvocatoria: number | null;
  idNivelEducativo: number | null;
  convocatoriaNombre: string;
  modalidadesContratacion: CoordinationContractModality[];
  centroCosto: CoordinationCentroCosto | null;
}

export interface ValuePointsPreload {
  valorHora: string;
  valorPunto: string;
  puntosDocente: string;
  asignacionSalarial: string;
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

function resolveEstadoCarga(
  carga: PreloadCargaApi | null | undefined,
): string {
  if (!carga?.estadoCarga) {
    return '';
  }

  return (
    resolveLookupLabel(carga.estadoCarga, 'descripcion') ||
    resolveLookupLabel(carga.estadoCarga, 'nombre')
  );
}

function normalizeCentroCosto(centroCosto: CoordinationCentroCosto | null | undefined): CoordinationCentroCosto | null {
  if (!centroCosto) {
    return null;
  }

  return {
    id: centroCosto.id,
    descripcion: centroCosto.descripcion?.trim() ?? '',
  };
}

function resolveConvocatoriaNombre(convocatoria: CoordinationPreloadCallApi | null | undefined): string {
  if (!convocatoria) {
    return '';
  }

  return (
    convocatoria.nombre?.trim() ||
    convocatoria.descripcion?.trim() ||
    ''
  );
}

export function normalizeCoordinationItem(item: CoordinationApiItem): CoordinationItem {
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
    nivelEducativo: resolveLookupLabel(
      item.convocatoria?.nivelEducativo,
      'descripcion',
    ),
    periodoUniversidad: formatUniversityPeriod(
      item.convocatoria?.periodoUniversidad,
    ),
    anioUniversidad: item.convocatoria?.periodoUniversidad?.anio ?? null,
    estadoCarga: resolveEstadoCarga(item.carga),
    idCarga: item.carga?.id ?? null,
    idConvocatoria: item.convocatoria?.id ?? null,
    idNivelEducativo: item.convocatoria?.nivelEducativo?.id ?? null,
    convocatoriaNombre: resolveConvocatoriaNombre(item.convocatoria),
    modalidadesContratacion:
      item.convocatoria?.modalidadesContratacion ?? [],
    centroCosto: normalizeCentroCosto(item.centroCosto),
  };
}

export interface CareerProfessor {
  idPersonaGeneral: number;
  nombreCompleto: string;
  estado: string;
}

export interface ModalityProfessor {
  idCargaDocente: number;
  idPersonaGeneral: number | null;
  nombreCompleto: string | null;
  estado: string;
  idModalidadContratacion: number;
  idCategoriaCatedratico: number;
  idCarga: number;
  idFechasConvocatoria: number;
  fechaConvocatoriaCodigo: string | null;
  fechaInicio: string;
  fechaFin: string;
  valorContrato: string | null;
  valorPrestaciones: string | null;
  asignacionSalarial: string | null;
  totalContrato: string | null;
  valorHora: string | null;
  puntos: string | null;
  valorPunto: string | null;
  semanas: string | null;
  tieneDetalleActividades?: boolean;
}

export interface ProfessorEscalafon {
  id: number;
  idCategoriaCatedratico: number;
  idModalidadContratacion: number;
  idPersonaGeneral: number;
  puntos: string;
}

export interface ProfessorSearchResult {
  id: number;
  documentoIdentidad: string;
  nombreCompleto: string;
  categoriaCatedratico: CoordinationLookupItem | null;
  escalafon: ProfessorEscalafon | null;
}

export interface WorkDate {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  semanas: string | null;
  vacaciones: string | null;
  rangoHoras: string | null;
}

export interface GetWorkDatesParams {
  idCoordinacion: number;
  idModalidadContratacion: number;
}

export interface CategoriaCatedratico {
  id: number;
  descripcion: string;
}
