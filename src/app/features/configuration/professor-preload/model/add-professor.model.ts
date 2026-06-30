export interface ConvocatoriaDates {
  id: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface AddProfessorRequest {
  idCargaDocente?: number;
  idCarga: number;
  idPersonaGeneral: number | null;
  idModalidadContratacion: number;
  idCategoriaCatedratico: number;
  fechasConvocatoria: ConvocatoriaDates;
  semanas: string;
  valorPunto?: string;
  valorContrato?: string;
  valorPrestaciones?: string;
  totalContrato?: string;
  asignacionSalarial?: string;
  puntos?: string;
  valorHora?: string;
}
