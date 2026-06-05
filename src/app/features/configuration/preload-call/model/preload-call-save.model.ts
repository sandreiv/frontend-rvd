import {
  EducationalLevelItem,
  ModalityFormItem,
  UniversityPeriodItem,
} from './preload-call.model';

export interface PreloadCallSaveRequest {
  convocatoria: PreloadCallSaveConvocatoria;
  fechas: PreloadCallSaveFecha[];
  modalidades: PreloadCallSaveModality[];
}

export interface PreloadCallSaveConvocatoria {
  nombre: string;
  descripcion: string;
  autoriza: PreloadCallSaveAutoriza;
  periodo: PreloadCallSavePeriodo;
  nivelEducativo: PreloadCallSaveNivelEducativo;
}

export interface PreloadCallSaveAutoriza {
  id: number;
  documentoIdentidad: string;
  nombreCompleto: string;
}

export interface PreloadCallSavePeriodo {
  id: number;
  periodo: string;
  ano: number;
}

export interface PreloadCallSaveNivelEducativo {
  id: number;
  descripcion: string;
}

export type PreloadCallFechaCodigo = 'CNV' | 'CTI' | 'ISU';

export interface PreloadCallSaveFecha {
  codigo: PreloadCallFechaCodigo;
  fechaInicio: string;
  fechaFin: string;
}

export interface PreloadCallSaveModality {
  idModalidadContratacion: number;
  vacaciones: number;
  semanas: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface BuildPreloadCallSavePayloadParams {
  nombre: string;
  descripcion: string;
  idPersonaNaturalGeneral: number;
  documentoIdentidad: string;
  nombreCompleto: string;
  periodo: UniversityPeriodItem;
  nivelEducativo: EducationalLevelItem;
  fechaInicio: string;
  fechaFin: string;
  fechaInicioCtei: string;
  fechaFinCtei: string;
  fechaInicioIsu: string;
  fechaFinIsu: string;
  modalidades: ModalityFormItem[];
}
