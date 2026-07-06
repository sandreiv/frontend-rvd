import { CoordinationCentroCosto } from './coordination.model';
import { TipoActividad } from './professor-activities.model';
import { ProyectoDocenteDto } from './professor-projects.model';

export interface DetailProfessorPreloadApi {
  idCargaDocente: number;
  detalles: DetalleCargaDocenteFormularioApi[];
}

export interface DetalleMateriaApi {
  codigoMateria: string;
  nombre: string;
}

export interface DetalleCargaDocenteFormularioApi {
  tipoActividad: TipoActividad;
  tipoActividadHija: TipoActividad[];
  unidadRegional: { id: number; nombre: string } | null;
  programa: { id: number; nombre: string } | null;
  materia?: DetalleMateriaApi | null;
  grupo: { id: number; nombre: string; capacidad: number } | null;
  centroCosto: CoordinationCentroCosto | null;
  horas: string;
  relacionCargaProyecto: RelacionCargaProyectoFormularioApi[];
}

export interface RelacionCargaProyectoFormularioApi {
  idPersonaProyecto: number;
  idProyecto: number;
  proyecto: ProyectoDocenteDto[];
}
