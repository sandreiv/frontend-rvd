import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  DeleteBulkProjectTypesRequest,
  ProjectTypeFormData,
  ProjectTypeItem,
} from '../model/project-types.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectTypesService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/administration/projects/project-types';

  /**
   * Obtiene los tipos de proyecto
   * @returns Observable<ProjectTypeItem[]>
   */
  listProjectTypes(): Observable<ProjectTypeItem[]> {
    return this.webRequestService.get<ProjectTypeItem[]>(
      `${this.endpoint}/list`,
    );
  }

  /**
   * Guarda un tipo de proyecto
   * @param payload - El tipo de proyecto a guardar
   * @returns Observable<void>
   */
  saveProjectType(payload: ProjectTypeFormData): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  /**
   * Actualiza un tipo de proyecto
   * @param id - El ID del tipo de proyecto a actualizar
   * @param payload - El tipo de proyecto a actualizar
   * @returns Observable<void>
   */
  updateProjectType(id: number, payload: ProjectTypeFormData): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }


  /**
   * Elimina un tipo de proyecto
   * @param id - El ID del tipo de proyecto a eliminar
   * @returns Observable<void>
   */
  deleteProjectType(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete/${id}`,
    );
  }

  /**
   * Elimina varios tipos de proyecto
   * @param payload - Los IDs de los tipos de proyecto a eliminar
   * @returns Observable<void>
   */
  deleteBulkProjectTypes(payload: DeleteBulkProjectTypesRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }
}
