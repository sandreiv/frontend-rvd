export interface PreloadCallItem {
  id?: number;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  nombreCompleto: string;
}

export interface PreloadCallFormValue {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  estadoConvocatoria: string;
  documentoIdentidad: string;
  nombreCompleto: string;
  telefonoCelular: string;
}

export interface PersonaAutorizaConvocatoriaItem {
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

export interface fechasConvocatoriaItem{
  id: number;
  fechaInicio: string;
  fechaFin: string;
  semanas: number;
  onceMeses: number;
  vacaciones: number;
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


