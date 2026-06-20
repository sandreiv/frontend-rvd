import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  CareerProfessor,
  CoordinationApiItem,
  CoordinationItem,
  CoordinationPreloadCallApi,
  ProfessorSearchResult,
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
  
  searchProfesor(
    params: SearchGeneralPersonParams,
  ): Observable<ProfessorSearchResult[]> {
    const query: Record<string, string> = {};
    const documento = params.documento?.trim();
    const nombre = params.nombre?.trim();

    if (documento) {
      query['documento'] = documento;
    }
    if (nombre) {
      query['nombre'] = nombre;
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

}

