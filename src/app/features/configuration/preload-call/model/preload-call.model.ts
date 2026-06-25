export interface PreloadCallItem {
  id: number;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  nombreCompleto: string;
  periodoUniversidad: string;
  nivelEducativo: string;
}

/** Item crudo del listado */
export interface PreloadCallListApiItem {
  id?: number | string;
  idConvocatoria?: number | string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  nombreCompleto: string;
  periodoUniversidad: string;
  nivelEducativo: string;
}

export function resolvePreloadCallListId(
  item: PreloadCallListApiItem,
): number | null {
  const candidates = [item.id, item.idConvocatoria];

  for (const value of candidates) {
    if (value == null || value === '') {
      continue;
    }

    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function normalizePreloadCallListItem(
  item: PreloadCallListApiItem,
): PreloadCallItem | null {
  const id = resolvePreloadCallListId(item);
  if (id == null) {
    return null;
  }

  return {
    id,
    nombre: item.nombre ?? '',
    descripcion: item.descripcion ?? '',
    fechaInicio: item.fechaInicio ?? '',
    fechaFin: item.fechaFin ?? '',
    nombreCompleto: item.nombreCompleto ?? '',
    periodoUniversidad: item.periodoUniversidad ?? '',
    nivelEducativo: item.nivelEducativo ?? '',
  };
}

/** Respuesta de GET /configuration/preload-call/detail/{id} */
export interface PreloadCallDetailResponse {
  convocatoria: PreloadCallDetailConvocatoria;
  fechas: PreloadCallDetailFecha[];
  convocatoriaTipoContratacion: PreloadCallDetailCotc[];
}

export interface PreloadCallDetailConvocatoria {
  id?: number;
  nombre: string;
  descripcion: string;
  autoriza: PersonaAutorizaConvocatoriaItem;
  periodo: UniversityPeriodItem;
  nivelEducativo: EducationalLevelItem;
}

export interface PreloadCallDetailFecha {
  id?: number;
  codigo: 'CNV' | 'CTI' | 'ISU';
  fechaInicio: string;
  fechaFin: string;
}

export interface PreloadCallDetailCotc {
  id: number;
  idModalidadContratacion: number;
  fechas: PreloadCallDetailCotcFecha[];
}

export interface PreloadCallDetailCotcFecha {
  id: number;
  vacaciones: number | null;
  fechaInicio: string;
  fechaFin: string;
  semanas: number | string;
}

export interface PersonaAutorizaConvocatoriaItem {
  id: number;
  documentoIdentidad: string;
  nombreCompleto: string;
  telefonoCelular: string | null;
}

export interface SearchGeneralPersonParams {
  nombre?: string;
  documento?: string;
  idModalidadContratacion?: number;
}

export interface ModalityFormItem {
  id: string;
  cotcId?: number;
  fechaId?: number;
  tipoModalidad: string;
  tipoModalidadLabel: string;
  fechaInicio: string;
  fechaFin: string;
  diasVacaciones: number | null;
  semanas: number | null;
}

export interface FechaFormMeta {
  codigo: 'CNV' | 'CTI' | 'ISU';
  id?: number;
}

/** Respuesta de GET /configuration/preload-call/list-modality */
export interface ModalityItem {
  id: number;
  nombre: string;
  descripcion: string;
  instructivo: string | null;
  estado: string;
  sigla: string | null;
}

export interface UniversityPeriodItem {
  id: number;
  anio: number;
  periodo: string;
}

/** Respuesta de GET /configuration/preload-call/list-educational-level */
export interface EducationalLevelItem {
  id: number;
  descripcion: string;
}

