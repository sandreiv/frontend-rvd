import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  EducationalLevelItem,
  ModalityItem,
  normalizePreloadCallListItem,
  PersonaAutorizaConvocatoriaItem,
  PreloadCallDetailResponse,
  PreloadCallItem,
  PreloadCallListApiItem,
  RestrictCoordinationFormData,
  RestrictCoordinationItem,
  RestrictCoordinationDeleteRequest,
  SearchGeneralPersonParams,
  UniversityPeriodItem,
} from '../model/preload-call.model';
import { PreloadCallDeleteRequest, PreloadCallSaveRequest } from '../model/preload-call-save.model';
import { CoordinationOption } from '../components/restrict-coordination/restrict-coordination-form/restrict-coordination-form';

@Injectable({
  providedIn: 'root',
})
export class PreloadCallService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/preload-call';

  getPreloadCallList(): Observable<PreloadCallItem[]> {
    return this.webRequestService
      .get<PreloadCallListApiItem[]>(`${this.endpoint}/list`)
      .pipe(
        map((items) =>
          items
            .map((item) => normalizePreloadCallListItem(item))
            .filter((item): item is PreloadCallItem => item != null),
        ),
      );
  }

  searchGeneralPerson(params: SearchGeneralPersonParams): Observable<PersonaAutorizaConvocatoriaItem[]> {
    const query: Record<string, string> = {};
    const documento = params.documento?.trim();
    const nombre = params.nombre?.trim();

    if (documento) {
      query['documento'] = documento;
    }
    if (nombre) {
      query['nombre'] = nombre;
    }

    return this.webRequestService.get<PersonaAutorizaConvocatoriaItem[]>(
      `${this.endpoint}/search-general-person`,
      query,
    );
  }

  getModalities(): Observable<ModalityItem[]> {
    return this.webRequestService.get<ModalityItem[]>(
      `${this.endpoint}/list-modality`,
    );
  }
  getUniversityPeriod(): Observable<UniversityPeriodItem[]> {
    return this.webRequestService.get<UniversityPeriodItem[]>(
      `${this.endpoint}/list-university-period`,
    );
  }

  getEducationalLevels(): Observable<EducationalLevelItem[]> {
    return this.webRequestService.get<EducationalLevelItem[]>(
      `${this.endpoint}/list-educational-level`,
    );
  }

  savePreloadCall(payload: PreloadCallSaveRequest): Observable<PreloadCallItem> {
    return this.webRequestService.post<PreloadCallItem>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  getPreloadCallDetails(id: number): Observable<PreloadCallDetailResponse> {
    return this.webRequestService.get<PreloadCallDetailResponse>(
      `${this.endpoint}/detail/${id}`,
    );
  }

  updatePreloadCall(id: number, payload: PreloadCallSaveRequest): Observable<PreloadCallItem> {
    return this.webRequestService.put<PreloadCallItem>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }

  deletePreloadCall(id: number, payload: PreloadCallDeleteRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete/${id}`,
      payload,
    );
  }

  bulkDeletePreloadCall(payload: PreloadCallDeleteRequest[]): Observable<void> {
    console.log('payload', payload);
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }

  searchCoordination(nombre: string): Observable<CoordinationOption[]> {
    return this.webRequestService.get<CoordinationOption[]>(
      `${this.endpoint}/search-coordination`,
      { nombre },
    );
  }

  saveCoordinationRestriction(payload: RestrictCoordinationFormData): Observable<RestrictCoordinationItem> {
    console.log('payload', payload);
    return this.webRequestService.post<RestrictCoordinationItem>(
      `${this.endpoint}/save-coordination-restriction`,
      payload,
    );
  }

  listCoordinationRestriction(idConvocatoria?: number,): Observable<RestrictCoordinationItem[]> {
    const query: Record<string, string> = {};

    if (idConvocatoria != null) {
      query['idConvocatoria'] = String(idConvocatoria);
    }

    return this.webRequestService.get<RestrictCoordinationItem[]>(
      `${this.endpoint}/list-coordination-restriction`,
      query,
    );
  }

  updateCoordinationRestriction(id: number, payload: RestrictCoordinationFormData): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update-coordination-restriction/${id}`,
      payload,
    );
  }

  deleteCoordinationRestriction(id: number, payload: RestrictCoordinationDeleteRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-coordination-restriction/${id}`,
      payload,
    );
  }

  bulkDeleteCoordinationRestriction(payload: RestrictCoordinationDeleteRequest[]): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk-coordination-restriction`,
      payload,
    );
  }
}