import {
  ActivityCategoryCodigo,
} from './professor-activities.config';
import {
  DirectLearningActivity,
  SimpleActivity,
} from './professor-activities-modal.models';
import { ProfessorProjectRow } from './professor-projects.model';
import {
  DetalleCargaDocenteRequest,
  SaveDetailProfessorPreloadRequest,
} from './save-detail-professor-preload.model';
import { TipoActividad } from './professor-activities.model';
import { DetailProfessorPreloadItemApi } from './detail-professor-preload.model';
import {
  buildUpdateDetailProfessorPreloadRequests,
  hasUpdateDetailProfessorPreloadRequests,
} from './professor-activities-update.mapper';

export interface SaveDetailProfessorPreloadInput {
  idCargaDocente: number;
  idCentroCosto: number | null;
  centroCostoDescripcion: string | null;
  activityTypes: TipoActividad[];
  actividadesFAD: DirectLearningActivity[];
  actividadesFAI: SimpleActivity[];
  actividadesAC: SimpleActivity[];
  associatedProjectsCTEI: ProfessorProjectRow[];
  associatedProjectsISU: ProfessorProjectRow[];
}

export function buildSaveActivityDistributionRequest(
  input: SaveDetailProfessorPreloadInput,
): SaveDetailProfessorPreloadRequest {
  const fadType = findActivityType(input.activityTypes, 'FAD');
  const faiType = findActivityType(input.activityTypes, 'FAI');
  const acType = findActivityType(input.activityTypes, 'AC');
  const idCentroCosto = input.idCentroCosto ?? undefined;
  const detalles: DetalleCargaDocenteRequest[] = [];

  for (const activity of filterNewItems(input.actividadesFAD)) {
    detalles.push(
      withCentroCosto(mapFadDetalle(activity, fadType), idCentroCosto),
    );
  }

  for (const activity of filterNewItems(input.actividadesFAI)) {
    detalles.push(
      withCentroCosto(mapCriteriaDetalle(activity, faiType), idCentroCosto),
    );
  }

  for (const activity of filterNewItems(input.actividadesAC)) {
    detalles.push(
      withCentroCosto(mapCriteriaDetalle(activity, acType), idCentroCosto),
    );
  }

  for (const project of filterNewItems(input.associatedProjectsCTEI)) {
    detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
  }

  for (const project of filterNewItems(input.associatedProjectsISU)) {
    detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
  }

  return {
    idCargaDocente: input.idCargaDocente,
    detalles,
  };
}

export function hasSaveableActivities(
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
): boolean {
  return (
    buildSaveActivityDistributionRequest(input).detalles.length > 0 ||
    hasUpdateDetailProfessorPreloadRequests(input, loadedDetails)
  );
}

function filterNewItems<T extends { idDetalleCargaDocente?: number }>(
  items: T[],
): T[] {
  return items.filter((item) => item.idDetalleCargaDocente == null);
}

function mapFadDetalle(
  activity: DirectLearningActivity,
  fadType: TipoActividad | undefined,
): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: activity.idTipoActividad ?? fadType?.id ?? 0,
    codigoTipoActividad:
      activity.codigoTipoActividad ?? fadType?.codigo ?? 'FAD',
    horas: activity.horasPresenciales,
    idUnidadRegional: activity.idUnidadRegional,
    idPrograma: activity.idPrograma,
    materia: {
      codigoMateria: activity.codigoMateria,
      idCentroCosto: activity.idCentroCostoMateria ?? null,
    },
    idGrupo: activity.idGrupo,
    relacionCargaProyecto: [],
  };
}

function mapCriteriaDetalle(
  activity: SimpleActivity,
  categoryType: TipoActividad | undefined,
): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: categoryType?.id ?? 0,
    idTipoActividadHija: activity.idTipoActividadHija,
    codigoTipoActividad: categoryType?.codigo ?? '',
    horas: activity.horasDedicacion,
    materia: null,
    relacionCargaProyecto: [],
  };
}

function mapProjectDetalle(
  project: ProfessorProjectRow,
): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: project.idTipoActividad,
    codigoTipoActividad: project.codigoTipoActividad,
    horas: project.horasDedicacion,
    materia: null,
    relacionCargaProyecto: [
      {
        idPersonaProyecto: project.idPersonaProyecto,
        idProyecto: project.idProyecto,
      },
    ],
  };
}

function findActivityType(
  activityTypes: TipoActividad[],
  codigo: ActivityCategoryCodigo,
): TipoActividad | undefined {
  return activityTypes.find((type) => type.codigo === codigo);
}

function withCentroCosto(
  detalle: DetalleCargaDocenteRequest,
  idCentroCosto: number | undefined,
): DetalleCargaDocenteRequest {
  if (idCentroCosto == null) {
    return detalle;
  }

  return { ...detalle, idCentroCosto };
}

export { buildUpdateDetailProfessorPreloadRequests };
