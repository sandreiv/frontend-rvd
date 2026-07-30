import { isActivityFormType } from './professor-activities.config';
import { ActivityFormType } from './professor-activities.model';
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
  ProyectoDocenteDto,
} from './professor-projects.model';

export interface ProfessorActivitiesModalState {
  directByCodigo: Record<string, DirectLearningActivity[]>;
  criteriaByCodigo: Record<string, SimpleActivity[]>;
  projectsByCodigo: Record<string, ProfessorProjectRow[]>;
  hasSavedDetail: boolean;
}

export function mapDetailProfessorPreloadToModalState(
  response: DetailProfessorPreloadApi | null,
  componenteByCodigo: Record<string, ActivityFormType> = {},
): ProfessorActivitiesModalState {
  const state = createEmptyModalState();

  if (!response?.length) {
    return state;
  }

  state.hasSavedDetail = true;

  let fadIndex = 0;
  let criteriaIndex = 0;

  for (let index = 0; index < response.length; index += 1) {
    const item = response[index];
    const detalle = item.detalles[0];
    if (!detalle) {
      continue;
    }

    const codigo = detalle.tipoActividad.codigo;
    const formType = resolveFormType(detalle, codigo, componenteByCodigo);
    const idDetalleCargaDocente = item.idDetalleCargaDocente;

    if (formType === 'direct') {
      pushToMap(
        state.directByCodigo,
        codigo,
        mapFadDetalle(detalle, fadIndex, idDetalleCargaDocente),
      );
      fadIndex += 1;
      continue;
    }

    if (formType === 'criteria') {
      pushToMap(
        state.criteriaByCodigo,
        codigo,
        mapCriteriaDetalle(detalle, criteriaIndex, idDetalleCargaDocente),
      );
      criteriaIndex += 1;
      continue;
    }

    if (formType === 'project') {
      const row = mapProjectDetalle(detalle, idDetalleCargaDocente);
      if (row) {
        pushToMap(state.projectsByCodigo, codigo, row);
      }
    }
  }

  return state;
}

function createEmptyModalState(): ProfessorActivitiesModalState {
  return {
    directByCodigo: {},
    criteriaByCodigo: {},
    projectsByCodigo: {},
    hasSavedDetail: false,
  };
}

function resolveFormType(
  detalle: DetalleCargaDocenteFormularioApi,
  codigo: string,
  componenteByCodigo: Record<string, ActivityFormType>,
): ActivityFormType {
  const fromMap = componenteByCodigo[codigo];
  if (fromMap) {
    return fromMap;
  }

  const fromTipo = detalle.tipoActividad.componente;
  if (isActivityFormType(fromTipo)) {
    return fromTipo;
  }

  if ((detalle.relacionCargaProyecto?.length ?? 0) > 0) {
    return 'project';
  }

  if (detalle.grupo != null || detalle.materia != null) {
    return 'direct';
  }

  return 'criteria';
}

function pushToMap<T>(
  map: Record<string, T[]>,
  codigo: string,
  item: T,
): void {
  const current = map[codigo];
  if (current) {
    current.push(item);
    return;
  }
  map[codigo] = [item];
}

function mapFadDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
  index: number,
  idDetalleCargaDocente: number,
): DirectLearningActivity {
  const hija = detalle.tipoActividadHija[0];

  return {
    idDetalleCargaDocente,
    id: `fad-${idDetalleCargaDocente ?? detalle.grupo?.id ?? index}`,
    criterio: hija?.nombre?.trim() ?? hija?.descripcion?.trim() ?? '',
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
    idCentroCostoMateria: detalle.materia?.idCentroCosto ?? null,
    idGrupo: detalle.grupo?.id ?? 0,
  };
}

function mapCriteriaDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
  index: number,
  idDetalleCargaDocente: number,
): SimpleActivity {
  const hija = detalle.tipoActividadHija[0];

  return {
    idDetalleCargaDocente,
    id: `criteria-${idDetalleCargaDocente ?? hija?.id ?? index}`,
    actividad: hija?.nombre?.trim() ?? hija?.descripcion?.trim() ?? '',
    horasDedicacion: parseHoras(detalle.horas),
    idTipoActividadHija: hija?.id,
  };
}

function mapProjectDetalle(
  detalle: DetalleCargaDocenteFormularioApi,
  idDetalleCargaDocente: number,
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
    idDetalleCargaDocente,
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
  for (let index = 0; index < proyectos.length; index += 1) {
    const proyecto = proyectos[index];
    if (proyecto.id === idProyecto) {
      return proyecto;
    }

    const productos = proyecto.productos ?? [];
    for (let childIndex = 0; childIndex < productos.length; childIndex += 1) {
      const producto = productos[childIndex];
      if (producto.id === idProyecto) {
        return producto;
      }
    }
  }

  return null;
}

function parseHoras(horas: string): number {
  const value = Number(horas);
  return Number.isFinite(value) ? value : 0;
}
