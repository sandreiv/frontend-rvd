export interface PreloadCallItem {
  id: number;
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
    descripcion: item.descripcion ?? '',
    fechaInicio: item.fechaInicio ?? '',
    fechaFin: item.fechaFin ?? '',
    nombreCompleto: item.nombreCompleto ?? '',
    periodoUniversidad: item.periodoUniversidad ?? '',
    nivelEducativo: item.nivelEducativo ?? '',
  };
}

/** Respuesta de GET /configuration/preload-call/details/{id} */
export interface PreloadCallDetailResponse {
  id?: number;
  convocatoria: PreloadCallDetailConvocatoria;
  fechas: PreloadCallDetailFecha[];
  modalidades: PreloadCallDetailModality[];
}

export interface PreloadCallDetailConvocatoria {
  nombre: string;
  descripcion: string;
  autoriza: PersonaAutorizaConvocatoriaItem;
  periodo: UniversityPeriodItem;
  nivelEducativo: EducationalLevelItem;
}

export interface PreloadCallDetailFecha {
  codigo: 'CNV' | 'CTI' | 'ISU';
  fechaInicio: string;
  fechaFin: string;
}

export interface PreloadCallDetailModality {
  idModalidadContratacion: number;
  vacaciones: number;
  semanas: number | string;
  fechaInicio: string;
  fechaFin: string;
}

export interface PreloadCallFormValue {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  estadoConvocatoria: string;
  documentoIdentidad: string;
  nombreCompleto: string;
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
}

export interface ModalityFormItem {
  id: string;
  tipoModalidad: string;
  tipoModalidadLabel: string;
  fechaInicio: string;
  fechaFin: string;
  diasVacaciones: number | null;
  semanas: number | null;
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
export interface fechasConvocatoriaItem{
  id: number;
  fechaInicio: string;
  fechaFin: string;
  semanas: number;
  onceMeses: number;
  vacaciones: number;
  codigo: string;
  convocatoria: PreloadCallItem;
  tipoContratacion: TipoContratacionItem;
}

export interface TipoActividadItem{
  id: number;
  idPadre: number;
  nombre: string;
  descripcion: string;
  orden: number;
  estado: string;
  codigo: string;
  componente: string;
}

export interface TipoContratacionItem{
  id:number;
  convocatoria: PreloadCallItem;
  modalidadContratacion: ModalidadContratacionItem;
}

export interface ModalidadContratacionItem{
  id: number;
  nombre: string;
  descripcion: string;
  porcentajeMaximoAnticipo: number;
  porcentajeMinimoAnticipo: number;
  instructivo: string;
  estado: string;
  sigla: string;
  idClaseModalidad: number;
}


