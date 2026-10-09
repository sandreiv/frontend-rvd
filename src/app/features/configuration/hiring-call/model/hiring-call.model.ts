import {
  PreloadCallItem,
} from '../../preload-call/model/preload-call.model';

export type HiringCallItem = PreloadCallItem;

export interface HiringModalityItem {
  id: number;
  nombre: string;
}

export interface HiringProfessorItem {
  id: number;
  nombreCompleto: string;
  idModalidad: number | null;
}

export interface ProfessorInformationItem {
  idPersonaGeneral: number | null;
  nombreCompleto: string | null;
  documentoIdentidad: string | null;
  direccionDomicilio: string | null;
  correoPersonal: string | null;
  correoInstitucional: string | null;
  modalidadContratacion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  categoriaDocente: string | null;
  puntos: string | null;
  horasActividades: ActividadPtd[];
}

export interface ActividadPtdDetalle {
  unidad: string | null;
  programa: string | null;
  materia: string | null;
  grupo: string | null;
  horas: number;
}

export interface ActividadPtd {
  tipo: string;
  codigo: string;
  nombre: string;
  totalHoras: number;
  detalles: ActividadPtdDetalle[] | null;
}
