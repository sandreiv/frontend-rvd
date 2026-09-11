import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  DeleteBulkNoveltiesRequest,
  NoveltyFormData,
  NoveltyItem,
} from '../model/novelties.model';

@Injectable({
  providedIn: 'root',
})
export class NoveltiesService {
  private readonly webRequestService =
    inject(WebRequestService);

  private readonly endpoint =
    '/configuration/administration/novelties';

  listNovelties(): Observable<NoveltyItem[]> {
    return this.webRequestService.get<NoveltyItem[]>(
      `${this.endpoint}/list`,
    );
  }

  saveNovelty(
    payload: NoveltyFormData,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  updateNovelty(
    id: number,
    payload: NoveltyFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }

  deleteNovelty(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete/${id}`,
    );
  }

  deleteBulkNovelties(
    payload: DeleteBulkNoveltiesRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }
}