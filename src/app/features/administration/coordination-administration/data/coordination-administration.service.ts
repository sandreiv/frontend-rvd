import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  CoordinationAssociationCatalogs,
  CoordinationAssociationFormData,
  CoordinationAssociationItem,
  DeleteBulkCoordinationAssociationRequest,
  CostCenterAssignmentFormData,
  CostCenterAssignmentItem,
  DeleteBulkCostCenterAssignmentRequest,
  PersonCoordinationFormData,
  PersonCoordinationItem,
  DeleteBulkPersonCoordinationRequest,
} from '../model/coordination-administration.model';

@Injectable({ providedIn: 'root' })
export class CoordinationAdministrationService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/administration/coordination-associations';

    getCatalogs(): Observable<CoordinationAssociationCatalogs> {
        return this.webRequestService.get<CoordinationAssociationCatalogs>(
        `${this.endpoint}/catalogs`,
        );
    }

    listAssociations(): Observable<CoordinationAssociationItem[]> {
        return this.webRequestService.get<CoordinationAssociationItem[]>(
        `${this.endpoint}/list`,
        );
    }

    saveAssociation(payload: CoordinationAssociationFormData): Observable<void> {
        return this.webRequestService.post<void>(`${this.endpoint}/save`, payload);
    }

    updateAssociation(id: number, payload: CoordinationAssociationFormData): Observable<void> {
        return this.webRequestService.put<void>(`${this.endpoint}/update/${id}`, payload);
    }

    deleteAssociation(id: number): Observable<void> {
        return this.webRequestService.delete<void>(`${this.endpoint}/delete/${id}`);
    }

    deleteBulk(payload: DeleteBulkCoordinationAssociationRequest): Observable<void> {
        return this.webRequestService.post<void>(`${this.endpoint}/delete-bulk`, payload);
    }

    listCostCenterAssignments(): Observable<CostCenterAssignmentItem[]> {
    return this.webRequestService.get<CostCenterAssignmentItem[]>(
        '/configuration/administration/cost-centers/list',
    );
    }

    saveCostCenterAssignment(payload: CostCenterAssignmentFormData): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/cost-centers/save',
        payload,
    );
    }

    updateCostCenterAssignment(
    id: number,
    payload: CostCenterAssignmentFormData,
    ): Observable<void> {
    return this.webRequestService.put<void>(
        `/configuration/administration/cost-centers/update/${id}`,
        payload,
    );
    }

    deleteCostCenterAssignment(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
        `/configuration/administration/cost-centers/delete/${id}`,
    );
    }

    deleteBulkCostCenterAssignments(
    payload: DeleteBulkCostCenterAssignmentRequest,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/cost-centers/delete-bulk',
        payload,
    );
    }

    listPeopleCoordinations(): Observable<PersonCoordinationItem[]> {
    return this.webRequestService.get<PersonCoordinationItem[]>(
        '/configuration/administration/people/list',
    );
    }

    savePeopleCoordination(payload: PersonCoordinationFormData): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/people/save',
        payload,
    );
    }

    updatePeopleCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    payload: PersonCoordinationFormData,
    ): Observable<void> {
    return this.webRequestService.put<void>(
        `/configuration/administration/people/update/${idPersonaGeneral}/${idCoordinacion}`,
        payload,
    );
    }

    deletePeopleCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    ): Observable<void> {
    return this.webRequestService.delete<void>(
        `/configuration/administration/people/delete/${idPersonaGeneral}/${idCoordinacion}`,
    );
    }

    deleteBulkPeopleCoordinations(
    payload: DeleteBulkPersonCoordinationRequest,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/people/delete-bulk',
        payload,
    );
    }

    listPlantProfessorCoordinations(): Observable<PersonCoordinationItem[]> {
    return this.webRequestService.get<PersonCoordinationItem[]>(
        '/configuration/administration/plant-professors/list',
    );
    }

    savePlantProfessorCoordination(payload: PersonCoordinationFormData): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/plant-professors/save',
        payload,
    );
    }

    updatePlantProfessorCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    payload: PersonCoordinationFormData,
    ): Observable<void> {
    return this.webRequestService.put<void>(
        `/configuration/administration/plant-professors/update/${idPersonaGeneral}/${idCoordinacion}`,
        payload,
    );
    }

    deletePlantProfessorCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    ): Observable<void> {
    return this.webRequestService.delete<void>(
        `/configuration/administration/plant-professors/delete/${idPersonaGeneral}/${idCoordinacion}`,
    );
    }

    deleteBulkPlantProfessorCoordinations(
    payload: DeleteBulkPersonCoordinationRequest,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        '/configuration/administration/plant-professors/delete-bulk',
        payload,
    );
    }    

}