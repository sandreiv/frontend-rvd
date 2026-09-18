import {
  DetailProfessorPreloadItemApi,
} from './detail-professor-preload.model';
import {
  DetalleCargaDocenteRequest,
  SaveDetailProfessorPreloadRequest,
} from './save-detail-professor-preload.model';
import {
  DirectLearningActivity,
  SimpleActivity,
} from './professor-activities-modal.models';
import { ProfessorProjectRow } from './professor-projects.model';
import {
  SaveDetailProfessorPreloadInput,
  mapFadDetalle,
  mapCriteriaDetalle,
  mapProjectDetalle,
  findActivityType,
  withCentroCosto,
} from './professor-activities-save.mapper';
import {
  patchFadDetailItem,
  patchCriteriaDetailItem,
  patchProjectDetailItem,
  hasDetailChanges,
} from './professor-activities-update.mapper';

export interface NoveltyDistributionResult {
  saveRequest: SaveDetailProfessorPreloadRequest;
  updateRequests: DetailProfessorPreloadItemApi[];
}

export function buildNoveltyActivityDistributionRequest(
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
): NoveltyDistributionResult {
  const idCentroCosto = input.idCentroCosto ?? undefined;
  const detalles: DetalleCargaDocenteRequest[] = [];
  const updateRequests: DetailProfessorPreloadItemApi[] = [];

  const directCodigos = Object.keys(input.directByCodigo);
  for (let index = 0; index < directCodigos.length; index += 1) {
    const codigo = directCodigos[index];
    const categoryType = findActivityType(input.activityTypes, codigo);
    collectDirectNovelty(
      input.directByCodigo[codigo] ?? [],
      categoryType,
      input,
      loadedDetails,
      idCentroCosto,
      detalles,
      updateRequests,
    );
  }

  const criteriaCodigos = Object.keys(input.criteriaByCodigo);
  for (let index = 0; index < criteriaCodigos.length; index += 1) {
    const codigo = criteriaCodigos[index];
    const categoryType = findActivityType(input.activityTypes, codigo);
    collectCriteriaNovelty(
      input.criteriaByCodigo[codigo] ?? [],
      categoryType,
      input,
      loadedDetails,
      idCentroCosto,
      detalles,
      updateRequests,
    );
  }

  const projectCodigos = Object.keys(input.projectsByCodigo);
  for (let index = 0; index < projectCodigos.length; index += 1) {
    const codigo = projectCodigos[index];
    collectProjectNovelty(
      input.projectsByCodigo[codigo] ?? [],
      input,
      loadedDetails,
      idCentroCosto,
      detalles,
      updateRequests,
    );
  }

  return {
    saveRequest: {
      idCargaDocente: input.idCargaDocente,
      detalles,
    },
    updateRequests,
  };
}

export function hasNoveltySaveableActivities(
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
): boolean {
  const { saveRequest, updateRequests } = buildNoveltyActivityDistributionRequest(input, loadedDetails);

  return saveRequest.detalles.length > 0 || updateRequests.length > 0;
}

function isMarkedAsNovelty(
  original: DetailProfessorPreloadItemApi | undefined,
): boolean {
  // esDeNovedad = 1 -> Viene de tabla detalles novedad
  // esDeNovedad = 0 -> Viene de tabla detalles
  return original == null || original.esDeNovedad !== 0;
}

function collectDirectNovelty(
  activities: DirectLearningActivity[],
  categoryType: ReturnType<typeof findActivityType>,
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
  idCentroCosto: number | undefined,
  detalles: DetalleCargaDocenteRequest[],
  updateRequests: DetailProfessorPreloadItemApi[],
): void {
  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index];

    if (activity.idDetalleCargaDocente == null) {
      detalles.push(withCentroCosto(mapFadDetalle(activity, categoryType), idCentroCosto));
      continue;
    }

    const original = loadedDetails.get(activity.idDetalleCargaDocente);

    if (!isMarkedAsNovelty(original)) {
      detalles.push(withCentroCosto(mapFadDetalle(activity, categoryType), idCentroCosto));
      continue;
    }

    if (!original?.detalles[0]) {
      continue;
    }

    const patched = patchFadDetailItem(original, activity, input);
    if (hasDetailChanges(original, patched)) {
      updateRequests.push(patched);
    }
  }
}

function collectCriteriaNovelty(
  activities: SimpleActivity[],
  categoryType: ReturnType<typeof findActivityType>,
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
  idCentroCosto: number | undefined,
  detalles: DetalleCargaDocenteRequest[],
  updateRequests: DetailProfessorPreloadItemApi[],
): void {
  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index];

    if (activity.idDetalleCargaDocente == null) {
      detalles.push(withCentroCosto(mapCriteriaDetalle(activity, categoryType), idCentroCosto));
      continue;
    }

    const original = loadedDetails.get(activity.idDetalleCargaDocente);

    if (!isMarkedAsNovelty(original)) {
      detalles.push(withCentroCosto(mapCriteriaDetalle(activity, categoryType), idCentroCosto));
      continue;
    }

    if (!original?.detalles[0]) {
      continue;
    }

    const patched = patchCriteriaDetailItem(original, activity, categoryType, input);
    if (hasDetailChanges(original, patched)) {
      updateRequests.push(patched);
    }
  }
}

function collectProjectNovelty(
  projects: ProfessorProjectRow[],
  input: SaveDetailProfessorPreloadInput,
  loadedDetails: Map<number, DetailProfessorPreloadItemApi>,
  idCentroCosto: number | undefined,
  detalles: DetalleCargaDocenteRequest[],
  updateRequests: DetailProfessorPreloadItemApi[],
): void {
  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];

    if (project.idDetalleCargaDocente == null) {
      detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
      continue;
    }

    const original = loadedDetails.get(project.idDetalleCargaDocente);

    if (!isMarkedAsNovelty(original)) {
      detalles.push(withCentroCosto(mapProjectDetalle(project), idCentroCosto));
      continue;
    }

    if (!original?.detalles[0]) {
      continue;
    }

    const patched = patchProjectDetailItem(original, project, input);
    if (hasDetailChanges(original, patched)) {
      updateRequests.push(patched);
    }
  }
}