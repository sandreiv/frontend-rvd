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

export interface SaveDetailProfessorPreloadInput {
  idCargaDocente: number;
  idCentroCosto: number | null;
  activityTypes: TipoActividad[];
  actividadesFAD: DirectLearningActivity[];
  actividadesFAI: SimpleActivity[];
  actividadesAC: SimpleActivity[];
  associatedProjectsCTEI: ProfessorProjectRow[];
  associatedProjectsISU: ProfessorProjectRow[];
}

export function buildSaveActivityDistributionRequest(input: SaveDetailProfessorPreloadInput): SaveDetailProfessorPreloadRequest {
  const fadType = findActivityType(input.activityTypes, 'FAD');
  const faiType = findActivityType(input.activityTypes, 'FAI');
  const acType = findActivityType(input.activityTypes, 'AC');

  const detalles: DetalleCargaDocenteRequest[] = [];
  const idCentroCosto = input.idCentroCosto ?? undefined;

  for (const activity of input.actividadesFAD) {
    detalles.push(withCentroCosto(mapFadDetalle(activity, fadType), idCentroCosto));
  }

  for (const activity of input.actividadesFAI) {
    detalles.push(
      withCentroCosto(mapCriteriaDetalle(activity, faiType), idCentroCosto),
    );
  }

  for (const activity of input.actividadesAC) {
    detalles.push(
      withCentroCosto(mapCriteriaDetalle(activity, acType), idCentroCosto),
    );
  }

  for (const project of input.associatedProjectsCTEI) {
    detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
  }

  for (const project of input.associatedProjectsISU) {
    detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
  }

  return {
    idCargaDocente: input.idCargaDocente,
    detalles,
  };
}

export function hasSaveableActivities(input: SaveDetailProfessorPreloadInput): boolean {
  return buildSaveActivityDistributionRequest(input).detalles.length > 0;
}

function mapFadDetalle(activity: DirectLearningActivity, fadType: TipoActividad | undefined): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: activity.idTipoActividad ?? fadType?.id ?? 0,
    codigoTipoActividad:
      activity.codigoTipoActividad ?? fadType?.codigo ?? 'FAD',
    horas: activity.horasPresenciales,
    idUnidadRegional: activity.idUnidadRegional,
    idPrograma: activity.idPrograma,
    codigoMateria: activity.codigoMateria,
    idGrupo: activity.idGrupo,
    relacionCargaProyecto: [],
  };
}

function mapCriteriaDetalle(activity: SimpleActivity, categoryType: TipoActividad | undefined): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: categoryType?.id ?? 0,
    idTipoActividadHija: activity.idTipoActividadHija,
    codigoTipoActividad: categoryType?.codigo ?? '',
    horas: activity.horasDedicacion,
    relacionCargaProyecto: [],
  };
}

function mapProjectDetalle(project: ProfessorProjectRow): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: project.idTipoActividad,
    codigoTipoActividad: project.codigoTipoActividad,
    horas: project.horasDedicacion,
    relacionCargaProyecto: [
      {
        idPersonaProyecto: project.idPersonaProyecto,
        idProyecto: project.idProyecto,
      },
    ],
  };
}

function findActivityType(activityTypes: TipoActividad[], codigo: ActivityCategoryCodigo): TipoActividad | undefined {
  return activityTypes.find((type) => type.codigo === codigo);
}

function withCentroCosto(detalle: DetalleCargaDocenteRequest, idCentroCosto: number | undefined): DetalleCargaDocenteRequest {
  if (idCentroCosto == null) {
    return detalle;
  }

  return { ...detalle, idCentroCosto };
}
