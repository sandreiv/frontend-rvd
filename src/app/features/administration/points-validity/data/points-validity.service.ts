import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  DeleteBulkPointsValidityRequest,
  PointsValidityFormData,
  PointsValidityItem,
} from '../model/points-validity.model';

@Injectable({
  providedIn: 'root',
})
export class PointsValidityService {
  private readonly webRequestService =
    inject(WebRequestService);

  private readonly endpoint =
    '/configuration/administration/points-validity';

  list(): Observable<PointsValidityItem[]> {
    return this.webRequestService.get<PointsValidityItem[]>(
      `${this.endpoint}/list`,
    );
  }

  save(
    payload: PointsValidityFormData,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  update(
    id: number,
    payload: PointsValidityFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete/${id}`,
    );
  }

  deleteBulk(
    payload: DeleteBulkPointsValidityRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }
}