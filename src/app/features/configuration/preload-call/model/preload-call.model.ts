export interface PreloadCallItem{
    id: number;
    idPeriodoUniversidad: number;
    idNivelEducativo: number;
    personaGeneral: PersonaGeneralItem;
    nombre: string;
    descripcion: string;
    estado: string;
    fechasConvocatoria: FechasConvocatoriaItem;
}

export interface PersonaGeneralItem{
    id: number;
    nombre: string;
}

export interface FechasConvocatoriaItem{
    fechaInicio: string;
    fechaFin: string;
}