import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  ActivityTypeFormData,
  ActivityTypeItem,
  DeleteBulkActivityTypesRequest,
} from '../model/activity-types.model';

@Injectable({ providedIn: 'root' })
export class ActivityTypesService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/administration/activity-types';

  listActivityTypes(): Observable<ActivityTypeItem[]> {
    return this.webRequestService.get<ActivityTypeItem[]>(`${this.endpoint}/list`);
  }

  saveActivityType(payload: ActivityTypeFormData): Observable<void> {
    return this.webRequestService.post<void>(`${this.endpoint}/save`, payload);
  }

  updateActivityType(id: number, payload: ActivityTypeFormData): Observable<void> {
    return this.webRequestService.put<void>(`${this.endpoint}/update/${id}`, payload);
  }

  deleteActivityType(id: number): Observable<void> {
    return this.webRequestService.delete<void>(`${this.endpoint}/delete/${id}`);
  }

  deleteBulkActivityTypes(payload: DeleteBulkActivityTypesRequest): Observable<void> {
    return this.webRequestService.post<void>(`${this.endpoint}/delete-bulk`, payload);
  }

  listChildActivityTypes(idPadre: number): Observable<ActivityTypeItem[]> {
    return this.webRequestService.get<ActivityTypeItem[]>(
    `${this.endpoint}/${idPadre}/children/list`,
    );
  }

  saveChildActivityType(
    idPadre: number,
    payload: ActivityTypeFormData,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        `${this.endpoint}/${idPadre}/children/save`,
        payload,
    );
  }

}