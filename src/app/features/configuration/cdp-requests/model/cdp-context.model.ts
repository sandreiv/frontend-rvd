import { CoordinationItem, CoordinationLookupItem, CoordinationUniversityPeriod } from "../../professor-preload/model/coordination.model";

export interface CdpContext {
  idUnidadAcademica: number;
  unidadAcademica: string;
  idFacultad: number;
  facultad: string;
}

export interface FacultyRequestCdpApiItem {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string | null;
  esAcademica: string;
  unidadRegional: CoordinationLookupItem;
  unidadArea: CoordinationLookupItem;
  metodologia: CoordinationLookupItem | null;
  modalidad: CoordinationLookupItem | null;
  periodoUniversidad: CoordinationUniversityPeriod;
  solicitud: SolicitudesItem;
}

export interface SolicitudesItem {
  id: number;
  estado: string;
  observacion: string;
  anexos: {
    nombre: string,
    path: string
  }[]
}

export interface FacultyCoordinationItem extends CoordinationItem {
  solicitud: SolicitudesItem
}


export function normalizeFacultyRequestCdpItem(item: FacultyRequestCdpApiItem): FacultyCoordinationItem {
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
    periodoUniversidad: formatUniversityPeriod(item.periodoUniversidad),
    idPeriodoUniversidad: item.periodoUniversidad.id ?? null,
    anioUniversidad: item.periodoUniversidad.anio ?? null,
    solicitud: item.solicitud,

    nivelEducativo: '',
    estadoCarga: '',
    idCarga: null,
    idConvocatoria: null,
    idNivelEducativo: null,
    convocatoriaNombre: '',
    modalidadesContratacion: [],
    centroCosto: null,
    canEditPreassignment: false,
    editBlockReason: null,
    editionMode: 'NORMAL_ACTIVE',
  };
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

function resolveLookupLabel(
  item: CoordinationLookupItem | null | undefined,
  field: 'nombre' | 'descripcion' = 'nombre',
): string {
  if (!item) {
    return '';
  }

  return item[field]?.trim() ?? '';
}