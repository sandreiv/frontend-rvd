import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  normalizePreloadCallListItem,
  PreloadCallItem,
  PreloadCallListApiItem,
} from '../../preload-call/model/preload-call.model';
import {
  CoordinationApiItem,
  CoordinationItem,
  normalizeCoordinationItem,
} from '../model/coordination.model';
import { SavePreloadRequest } from '../model/save-preload.model';

@Injectable({
  providedIn: 'root',
})
export class CoordinationService {

  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/coordination';

  getActivePreloadCall(): Observable<PreloadCallItem[]> {
    return this.webRequestService.get<PreloadCallListApiItem[]>(`${this.endpoint}/list-active-preload-calls`,)
      .pipe(
        map((items) =>
          items
            .map((item) => normalizePreloadCallListItem(item))
            .filter((item): item is PreloadCallItem => item != null),
        ),
      );
  }

  getCoordinations(idConvocatoria?: number): Observable<CoordinationItem[]> {
    const params = idConvocatoria != null ? { idConvocatoria: String(idConvocatoria) } : undefined;
    
    return this.webRequestService
      .get<CoordinationApiItem[]>(`${this.endpoint}/list`, params)
      .pipe(map((items) => items.map(normalizeCoordinationItem)));
  }

  savePreload(request: SavePreloadRequest): Observable<void> {
    console.log('request', request);
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-preload`,
      request,
    );
  }
}

