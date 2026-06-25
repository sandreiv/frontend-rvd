import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  CareerProfessor,
  CategoriaCatedratico,
  CoordinationApiItem,
  CoordinationItem,
  CoordinationPreloadCallApi,
  ProfessorSearchResult,
  ValuePointsPreload,
  WorkDate,
  normalizeCoordinationItem,
} from '../model/coordination.model';
import { SavePreloadRequest } from '../model/save-preload.model';
import { SearchGeneralPersonParams } from '../../preload-call/model/preload-call.model';

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

    console.log('idPersonaGeneral', idPersonaGeneral);
    console.log('anio', anio);
    console.log('idCategoriaCatedratico', idCategoriaCatedratico);
    return this.webRequestService.get<ValuePointsPreload>(
      `${this.endpoint}/value-points-preload`,
      { anio, idCategoriaCatedratico, idPersonaGeneral },
    );
  }

  getCategoriaCatedratico(): Observable<CategoriaCatedratico[]> {
    return this.webRequestService.get<CategoriaCatedratico[]>(
      `${this.endpoint}/professor-category`,
    );
  }

}

