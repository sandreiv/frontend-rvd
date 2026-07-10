import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  CareerProfessor,
  CategoriaCatedratico,
  CoordinationApiItem,
  CoordinationItem,
  CoordinationPreloadCallApi,
  ModalityProfessor,
  ProfessorSearchResult,
  ValuePointsPreload,
  WorkDate,
  normalizeCoordinationItem,
} from '../model/coordination.model';
import { SavePreloadRequest } from '../model/save-preload.model';
import { AddProfessorRequest } from '../model/add-professor.model';
import { SearchGeneralPersonParams } from '../../preload-call/model/preload-call.model';
import {
  GrupoMateria,
  MateriaAcademica,
  ProgramaAcademico,
  TipoActividad,
  TipoActividadCriterio,
  UnidadRegional,
} from '../model/professor-activities.model';
import { ProyectoDocenteDto } from '../model/professor-projects.model';
import { DetailProfessorPreloadApi, DetailProfessorPreloadItemApi } from '../model/detail-professor-preload.model';
import { SaveDetailProfessorPreloadRequest } from '../model/save-detail-professor-preload.model';

@Injectable({
  providedIn: 'root',
})
export class CoordinationService {

  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/coordination';

  getActivePreloadCall(): Observable<CoordinationPreloadCallApi[]> {
    return this.webRequestService.get<CoordinationPreloadCallApi[]>(
      `${this.endpoint}/list-active-preload-calls`,
    );
  }

  getCoordinations(idConvocatoria?: number): Observable<CoordinationItem[]> {
    const params = idConvocatoria != null ? { idConvocatoria: String(idConvocatoria) } : undefined;
    
    return this.webRequestService
      .get<CoordinationApiItem[]>(`${this.endpoint}/list`, params)
      .pipe(map((items) => items.map(normalizeCoordinationItem)));
  }

  savePreload(request: SavePreloadRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-preload`,
      request,
    );
  }
  
  searchProfesor(params: SearchGeneralPersonParams,): Observable<ProfessorSearchResult[]> {
    const query: Record<string, string | number> = {};
    const documento = params.documento?.trim();
    const nombre = params.nombre?.trim();

    if (documento) {
      query['documento'] = documento;
    }
    if (nombre) {
      query['nombre'] = nombre;
    }
    if (params.idModalidadContratacion != null) {
      query['idModalidadContratacion'] = params.idModalidadContratacion;
    }
    

    return this.webRequestService.get<ProfessorSearchResult[]>(
      `${this.endpoint}/search-professor`,
      query,
    );
  }

  getCareerProfessors(idCoordinacion: number): Observable<CareerProfessor[]> {
    return this.webRequestService.get<CareerProfessor[]>(
      `${this.endpoint}/list-career-professors/${idCoordinacion}`,
    );
  }

  listProfessorsByModality(idCoordinacion: number, idModalidadContratacion: number,): Observable<ModalityProfessor[]> {
    return this.webRequestService.get<ModalityProfessor[]>(
      `${this.endpoint}/list-professors-modality`,
      { idCoordinacion, idModalidadContratacion },
    );
  }

  getWorkDates(idCoordinacion: number, idModalidadContratacion: number): Observable<WorkDate[]> {
    const query = {
      idCoordinacion: idCoordinacion,
      idModalidadContratacion: idModalidadContratacion,
    };
    return this.webRequestService.get<WorkDate[]>(
      `${this.endpoint}/work-date`,
      query,
    );
  }

  getValuePointsPreload(anio: number, idCategoriaCatedratico: number, idPersonaGeneral: number | null): Observable<ValuePointsPreload> {
    return this.webRequestService.get<ValuePointsPreload>(
      `${this.endpoint}/value-points-preload`,
      { anio, idCategoriaCatedratico, idPersonaGeneral },
    );
  }

  getCategoriaCatedratico(idModalidadContratacion: number,): Observable<CategoriaCatedratico[]> {
    return this.webRequestService.get<CategoriaCatedratico[]>(
      `${this.endpoint}/professor-category`,
      { idModalidadContratacion },
    );
  }

  addProfessor(request: AddProfessorRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/add-professor`,
      request,
    );
  }

  deleteProfessor(idCargaDocente: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete-professor/${idCargaDocente}`,
    );
  }

  updateProfessor( idCargaDocente: number, request: AddProfessorRequest): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update-professor/${idCargaDocente}`,
      request,
    );
  }

  listCriteria(idTipoActividad: number): Observable<TipoActividadCriterio[]> {
    return this.webRequestService.get<TipoActividadCriterio[]>(
      `${this.endpoint}/list-criteria`,
      { idTipoActividad },
    );
  }

  listRegionalUnits(idCoordinacion: number): Observable<UnidadRegional[]> {
    return this.webRequestService.get<UnidadRegional[]>(
      `${this.endpoint}/list-regional-unit`,
      { idCoordinacion },
    );
  }

  listPrograms(idCoordinacion: number,idUnidadRegional: number,idNivelEducativo: number,): Observable<ProgramaAcademico[]> {
    return this.webRequestService.get<ProgramaAcademico[]>(
      `${this.endpoint}/list-program`,
      { idCoordinacion, idUnidadRegional, idNivelEducativo },
    );
  }

  listSubjects(idPrograma: number, idCoordinacion: number): Observable<MateriaAcademica[]> {
    return this.webRequestService.get<MateriaAcademica[]>(
      `${this.endpoint}/list-subject`,
      { idPrograma, idCoordinacion },
    );
  }

  listSubjectGroups(codigoMateria: string): Observable<GrupoMateria[]> {
    return this.webRequestService.get<GrupoMateria[]>(
      `${this.endpoint}/list-subject-group`,
      { codigoMateria },
    );
  }

  listProjectsProfessor(idPersonaGeneral: number): Observable<ProyectoDocenteDto[]> {
    return this.webRequestService.get<ProyectoDocenteDto[]>(
      `${this.endpoint}/list-projects-professor`,
      { idPersonaGeneral },
    );
  }

  listActivityTypes(): Observable<TipoActividad[]> {
    return this.webRequestService.get<TipoActividad[]>(
      `${this.endpoint}/list-activity-types`,
    );
  }

  saveActivityDistribution(request: SaveDetailProfessorPreloadRequest): Observable<void> {
    console.log('request', request);
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-detail-professor-preload`,
      request,
    );
  }

  listDetailProfessorPreload(idCargaDocente: number): Observable<DetailProfessorPreloadApi> {
    return this.webRequestService.get<DetailProfessorPreloadApi>(
      `${this.endpoint}/list-detail-professor-preload`,
      { idCargaDocente },
    );
  }

  updateDetailProfessorPreload(detalle: DetailProfessorPreloadItemApi): Observable<void> {
    const payload: DetailProfessorPreloadItemApi = {
      idDetalleCargaDocente: detalle.idDetalleCargaDocente,
      idCargaDocente: detalle.idCargaDocente,
      detalles: [detalle.detalles[0]],
    };

    return this.webRequestService.put<void>(
      `${this.endpoint}/update-detail-professor-preload`,
      payload,
    );
  }
}

