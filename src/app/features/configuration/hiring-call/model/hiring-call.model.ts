import {
  PreloadCallItem,
} from '../../preload-call/model/preload-call.model';
import { NoveltyValorContratacionSummaryApi } from '../../professor-preload/model/novelty-summary.model';
import { CentroCostoSummaryApi } from '../../professor-preload/model/professor-summary.model';

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
  formaPago: string | null;
  estadoCategorizacion: string | null;
  asignacionSalarial: number | null;
  horas: string | null;
  categoriaDocente: string | null;
  puntos: string | null;
  valorHora: number | null;
  horasActividades: ActividadPtd[];
}

export interface ActividadPtdDetalle {
  unidad: string | null;
  programa: string | null;
  materia: string | null;
  grupo: string | null;
  horas: number;
  horasTeoricas: number,
  horasPracticas: number,
  ponderacionAcademica: number
}

export interface ActividadPtd {
  tipo: string;
  codigo: string;
  nombre: string;
  totalHoras: number;
  detalles: ActividadPtdDetalle[] | null;
}

export interface SummaryPtdActivity {
  id: number
  codigo: string
  detalles: SummaryPtdActivityDetail[]
  criterio: string
  tipo: string
  totalHoras: number | null
}

export interface SummaryPtdActivityDetail {
  id: number | null;
  esDeNovedad: number | null;
  descripcion: string;
}

export interface SavePtdPayload {
  nivel: string | null;
  ponderado: number;
  idDetalleCargaDocente: number | null;
  idDetalleNovedadCargaDocente: number | null;
  idTipoActividad: number;
  idPersonaGeneral: number;
  idPeriodoUniversitario: number;
}

export interface ObservacionPtd {
  descripcion: string,
  idCargaDocente: number
}

export interface SavePtdRequest {
  registros: SavePtdPayload[],
  observacion: ObservacionPtd
}

export interface ActivityWeights {
  nivel: string | null;
  ponderado: number;
  idTipoActividad: number;
}

export interface PdtInfoWithWeights {
  actividades: ActivityWeights[],
  observacion: ObservacionPtd
}

export interface PtdStatesProfessors {
  idPersonaGeneral: number;
  estado: string;
}

export interface ApprovePtdRequest {
  idPersonaGeneral: number;
  idPeriodoUniversitario: number;
  idCargaDocente: number;
  idsDocumentosAdjuntos: string[];
}

export interface RejectPtdRequest {
  idPersonaGeneral: number;
  idPeriodoUniversitario: number;
  idCargaDocente: number;
  idsDocumentosAdjuntos: string[];
  observacion: string
}

export interface HiringCdpInformationApi {
  idCdp: number;
  numero: string;
  fecha: string;
  vigencia: string;
  rubros: string;
  idSolicitudRvd: number;
}

export interface HiringValuesInformationApi {
  valorContratacion: NoveltyValorContratacionSummaryApi | null;
  centrosCosto: CentroCostoSummaryApi[]
}