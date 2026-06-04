import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  ModalityItem,
  PersonaAutorizaConvocatoriaItem,
  PreloadCallItem,
  SearchGeneralPersonParams,
} from '../model/preload-call.model';

@Injectable({
  providedIn: 'root',
})
export class PreloadCallService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/preload-call';

  getPreloadCallList(): Observable<PreloadCallItem[]> {
    return this.webRequestService.get<PreloadCallItem[]>(
      `${this.endpoint}/list`,
    );
  }

  searchGeneralPerson(
    params: SearchGeneralPersonParams,
  ): Observable<PersonaAutorizaConvocatoriaItem[]> {
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
}
