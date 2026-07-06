import {
  DetailProfessorPreloadApi,
  DetalleCargaDocenteFormularioApi,
} from './detail-professor-preload.model';
import {
  DirectLearningActivity,
  SimpleActivity,
} from './professor-activities-modal.models';
import {
  ProfessorProjectRow,
  ProjectActivityCodigo,
  ProyectoDocenteDto,
} from './professor-projects.model';

export interface ProfessorActivitiesModalState {
  actividadesFAD: DirectLearningActivity[];
  actividadesFAI: SimpleActivity[];
  actividadesAC: SimpleActivity[];
  associatedProjectsCTEI: ProfessorProjectRow[];
  associatedProjectsISU: ProfessorProjectRow[];
  hasSavedDetail: boolean;
}

export function mapDetailProfessorPreloadToModalState(
  response: DetailProfessorPreloadApi | null,
): ProfessorActivitiesModalState {
  const state = createEmptyModalState();

  if (!response?.detalles?.length) {
    return state;
  }

  state.hasSavedDetail = true;

  let fadIndex = 0;
  let criteriaIndex = 0;

  for (const detalle of response.detalles) {
    const codigo = detalle.tipoActividad.codigo;

    if (codigo === 'FAD') {
      state.actividadesFAD.push(mapFadDetalle(detalle, fadIndex));
      fadIndex += 1;
      continue;
    }

    if (codigo === 'FAI') {
      state.actividadesFAI.push(mapCriteriaDetalle(detalle, criteriaIndex));
      criteriaIndex += 1;
      continue;
    }

    if (codigo === 'AC') {
      state.actividadesAC.push(mapCriteriaDetalle(detalle, criteriaIndex));
      criteriaIndex += 1;
      continue;
    }

    if (codigo === 'CTEI' || codigo === 'ISU') {
      const row = mapProjectDetalle(detalle);
      if (row) {
        state[projectStateKey(codigo)].push(row);
      }
    }
  }

  return state;
}

function createEmptyModalState(): ProfessorActivitiesModalState {
  return {
    actividadesFAD: [],
    actividadesFAI: [],
    actividadesAC: [],
    associatedProjectsCTEI: [],
    associatedProjectsISU: [],
    hasSavedDetail: false,
  };
}

function mapFadDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
  index: number,
): DirectLearningActivity {
  return {
    id: `fad-${detalle.grupo?.id ?? index}`,
    criterio: '',
    unidad: detalle.unidadRegional?.nombre?.trim() ?? '',
    programa: detalle.programa?.nombre?.trim() ?? '',
    materia: detalle.materia?.nombre?.trim() ?? '',
    horasPresenciales: parseHoras(detalle.horas),
    grupo: detalle.grupo?.nombre?.trim() ?? '',
    cupos: detalle.grupo?.capacidad ?? 0,
    idTipoActividad: detalle.tipoActividad.id,
    codigoTipoActividad: detalle.tipoActividad.codigo,
    idUnidadRegional: detalle.unidadRegional?.id ?? 0,
    idPrograma: detalle.programa?.id ?? 0,
    codigoMateria: detalle.materia?.codigoMateria?.trim() ?? '',
    idGrupo: detalle.grupo?.id ?? 0,
  };
}

function mapCriteriaDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
  index: number,
): SimpleActivity {
  const hija = detalle.tipoActividadHija[0];

  return {
    id: `criteria-${hija?.id ?? index}`,
    actividad: hija?.nombre?.trim() ?? hija?.descripcion?.trim() ?? '',
    horasDedicacion: parseHoras(detalle.horas),
    idTipoActividadHija: hija?.id,
  };
}

function mapProjectDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
): ProfessorProjectRow | null {
  const relacion = detalle.relacionCargaProyecto[0];
  if (!relacion) {
    return null;
  }

  const hija = detalle.tipoActividadHija[0];
  const proyecto = resolveProyectoById(
    relacion.proyecto,
    relacion.idProyecto,
  );

  return {
    idPersonaProyecto: relacion.idPersonaProyecto,
    idProyecto: relacion.idProyecto,
    idTipoActividad: detalle.tipoActividad.id,
    codigoTipoActividad: detalle.tipoActividad.codigo,
    nombreProyecto: proyecto?.nombre?.trim() ?? '',
    nombreActividad:
      hija?.nombre?.trim() ??
      hija?.descripcion?.trim() ??
      detalle.tipoActividad.nombre?.trim() ??
      '',
    horasDedicacion: parseHoras(detalle.horas),
    nivel: proyecto?.idProyecto != null ? 1 : 0,
    esPadre: proyecto?.idProyecto == null,
    esSeleccionable: true,
  };
}

function resolveProyectoById(
  proyectos: ProyectoDocenteDto[],
  idProyecto: number,
): ProyectoDocenteDto | null {
  for (const proyecto of proyectos) {
    if (proyecto.id === idProyecto) {
      return proyecto;
    }

    const productos = proyecto.productos ?? [];
    for (const producto of productos) {
      if (producto.id === idProyecto) {
        return producto;
      }
    }
  }

  return null;
}

function projectStateKey(
  codigo: ProjectActivityCodigo,
): 'associatedProjectsCTEI' | 'associatedProjectsISU' {
  return codigo === 'CTEI'
    ? 'associatedProjectsCTEI'
    : 'associatedProjectsISU';
}

function parseHoras(horas: string): number {
  const value = Number(horas);
  return Number.isFinite(value) ? value : 0;
}
