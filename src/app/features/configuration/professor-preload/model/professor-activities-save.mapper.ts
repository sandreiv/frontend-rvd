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
  SaveActivityDistributionRequest,
} from './save-activity-distribution.model';
import { TipoActividad } from './professor-activities.model';

export interface SaveActivityDistributionInput {
  idCargaDocente: number;
  activityTypes: TipoActividad[];
  actividadesFAD: DirectLearningActivity[];
  actividadesFAI: SimpleActivity[];
  actividadesAC: SimpleActivity[];
  associatedProjectsCTEI: ProfessorProjectRow[];
  associatedProjectsISU: ProfessorProjectRow[];
}

export function buildSaveActivityDistributionRequest(
  input: SaveActivityDistributionInput,
): SaveActivityDistributionRequest {
  const fadType = findActivityType(input.activityTypes, 'FAD');
  const faiType = findActivityType(input.activityTypes, 'FAI');
  const acType = findActivityType(input.activityTypes, 'AC');

  const detalles: DetalleCargaDocenteRequest[] = [];

  for (const activity of input.actividadesFAD) {
    detalles.push(mapFadDetalle(activity, fadType));
  }

  for (const activity of input.actividadesFAI) {
    detalles.push(mapCriteriaDetalle(activity, faiType));
  }

  for (const activity of input.actividadesAC) {
    detalles.push(mapCriteriaDetalle(activity, acType));
  }

  for (const project of input.associatedProjectsCTEI) {
    detalles.push(mapProjectDetalle(project));
  }

  for (const project of input.associatedProjectsISU) {
    detalles.push(mapProjectDetalle(project));
  }

  return {
    idCargaDocente: input.idCargaDocente,
    detalles,
  };
}

export function hasSaveableActivities(
  input: SaveActivityDistributionInput,
): boolean {
  return buildSaveActivityDistributionRequest(input).detalles.length > 0;
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
    codigoMateria: activity.codigoMateria,
    idGrupo: activity.idGrupo,
    relacionesProyecto: [],
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
    relacionesProyecto: [],
  };
}

function mapProjectDetalle(
  project: ProfessorProjectRow,
): DetalleCargaDocenteRequest {
  return {
    idTipoActividad: project.idTipoActividad,
    codigoTipoActividad: project.codigoTipoActividad,
    horas: project.horasDedicacion,
    relacionesProyecto: [
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
