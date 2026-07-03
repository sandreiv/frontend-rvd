export interface SaveActivityDistributionRequest {
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
  relacionesProyecto: RelacionCargaProyectoRequest[];
}

export interface RelacionCargaProyectoRequest {
  idPersonaProyecto: number;
  idProyecto: number;
}
