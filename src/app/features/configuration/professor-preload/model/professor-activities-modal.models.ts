export interface DirectLearningActivity {
  id: string;
  criterio: string;
  unidad: string;
  programa: string;
  materia: string;
  horasPresenciales: number;
  grupo: string;
  cupos: number;
  idTipoActividad: number;
  codigoTipoActividad: string;
  idUnidadRegional: number;
  idPrograma: number;
  codigoMateria: string;
  idGrupo: number;
}

export interface SimpleActivity {
  id: string;
  actividad: string;
  horasDedicacion: number;
  idTipoActividadHija?: number;
  descripcionProyecto?: string;
}
