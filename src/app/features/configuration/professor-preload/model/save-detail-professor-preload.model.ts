export interface SaveDetailProfessorPreloadRequest {
  idCargaDocente: number;
  detalles: DetalleCargaDocenteRequest[];
}

export interface DetalleCargaDocenteRequest {
  idTipoActividad: number;
  idTipoActividadHija?: number;
  codigoTipoActividad: string;
  horas: number;
  idUnidadRegional?: number;
  idPrograma?: number;
  codigoMateria?: string;
  idGrupo?: number;
  relacionCargaProyecto: RelacionCargaProyectoRequest[];
  idCentroCosto?: number;
}

export interface RelacionCargaProyectoRequest {
  idPersonaProyecto: number;
  idProyecto: number;
}
