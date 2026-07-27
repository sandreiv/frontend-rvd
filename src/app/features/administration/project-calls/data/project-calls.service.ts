import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  DeleteBulkProjectCallsRequest,
  ProjectCallFormData,
  ProjectCallItem,
} from '../model/project-calls.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectCallsService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/administration/projects/project-calls';

  /**
   * Obtiene las convocatorias de proyecto
   * @returns Observable<ProjectCallItem[]>
   */
  listProjectCalls(): Observable<ProjectCallItem[]> {
    return this.webRequestService.get<ProjectCallItem[]>(
      `${this.endpoint}/list`,
    );
  }

  /**
   * Guarda una convocatoria de proyecto
   * @param payload - El tipo de proyecto a guardar
   * @returns Observable<void>
   */
  saveProjectCall(payload: ProjectCallFormData): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  /**
   * Actualiza una convocatoria de proyecto
   * @param id - El ID del tipo de proyecto a actualizar
   * @param payload - El tipo de proyecto a actualizar
   * @returns Observable<void>
   */
  updateProjectCall(id: number, payload: ProjectCallFormData): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }


  /**
   * Elimina una convocatoria de proyecto
   * @param id - El ID del tipo de proyecto a eliminar
   * @returns Observable<void>
   */
  deleteProjectCall(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete/${id}`,
    );
  }

  /**
   * Elimina varias convocatorias de proyecto
   * @param payload - Los IDs de los tipos de proyecto a eliminar
   * @returns Observable<void>
   */
  deleteBulkProjectCalls(payload: DeleteBulkProjectCallsRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }
}
