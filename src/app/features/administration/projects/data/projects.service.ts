import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  DeleteBulkProjectsRequest,
  ProjectFormData,
  ProjectItem,
  ProjectPersonFormData,
  ProjectPersonItem,
} from '../model/projects.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/administration/projects';

  listProjects(): Observable<ProjectItem[]> {
    return this.webRequestService.get<ProjectItem[]>(`${this.endpoint}/list`);
  }

  listProducts(idProyecto: number): Observable<ProjectItem[]> {
    return this.webRequestService.get<ProjectItem[]>(
      `${this.endpoint}/list-products`,
      { idProyecto },
    );
  }

  saveProject(payload: ProjectFormData): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save`,
      payload,
    );
  }

  updateProject(id: number, payload: ProjectFormData): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update/${id}`,
      payload,
    );
  }

  deleteProject(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete/${id}`,
    );
  }

  deleteBulkProjects(payload: DeleteBulkProjectsRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-bulk`,
      payload,
    );
  }

  listProjectPersons(idProyecto: number): Observable<ProjectPersonItem[]> {
    return this.webRequestService.get<ProjectPersonItem[]>(
      `${this.endpoint}/list-persons`,
      { idProyecto },
    );
  }

  saveProjectPerson(payload: ProjectPersonFormData): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-person`,
      payload,
    );
  }

  updateProjectPerson(
    id: number,
    payload: ProjectPersonFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update-person/${id}`,
      payload,
    );
  }

  deleteProjectPerson(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete-person/${id}`,
    );
  }

  deleteBulkProjectPersons(
    payload: DeleteBulkProjectsRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/delete-persons-bulk`,
      payload,
    );
  }
}
