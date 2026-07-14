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
  CoordinationManagementCatalogs,
  CoordinationManagementFormData,
  CoordinationManagementItem,
  DeleteBulkCoordinationsRequest,
  CatalogOptionItem,
} from '../model/coordination-administration.model';

@Injectable({ providedIn: 'root' })
export class CoordinationAdministrationService {
  private readonly webRequestService = inject(WebRequestService);

  private readonly endpoint =
    '/configuration/administration/coordination-management';

  getCatalogs(): Observable<CoordinationAssociationCatalogs> {
    return this.webRequestService.get<CoordinationAssociationCatalogs>(
      `${this.endpoint}/coordination-associations/catalogs`,
    );
  }

  listAssociations(): Observable<CoordinationAssociationItem[]> {
    return this.webRequestService.get<CoordinationAssociationItem[]>(
      `${this.endpoint}/coordination-associations/list`,
    );
  }

  saveAssociation(payload: CoordinationAssociationFormData): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/coordination-associations/save`,
      payload,
    );
  }

  updateAssociation(
    id: number,
    payload: CoordinationAssociationFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/coordination-associations/update/${id}`,
      payload,
    );
  }

  deleteAssociation(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/coordination-associations/delete/${id}`,
    );
  }

  deleteBulk(
    payload: DeleteBulkCoordinationAssociationRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/coordination-associations/delete-bulk`,
      payload,
    );
  }

  listCostCenterAssignments(): Observable<CostCenterAssignmentItem[]> {
    return this.webRequestService.get<CostCenterAssignmentItem[]>(
      `${this.endpoint}/cost-centers/list`,
    );
  }

  saveCostCenterAssignment(
    payload: CostCenterAssignmentFormData,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/cost-centers/save`,
      payload,
    );
  }

  updateCostCenterAssignment(
    id: number,
    payload: CostCenterAssignmentFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/cost-centers/update/${id}`,
      payload,
    );
  }

  deleteCostCenterAssignment(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/cost-centers/delete/${id}`,
    );
  }

  deleteBulkCostCenterAssignments(
    payload: DeleteBulkCostCenterAssignmentRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/cost-centers/delete-bulk`,
      payload,
    );
  }

  listPeopleCoordinations(): Observable<PersonCoordinationItem[]> {
    return this.webRequestService.get<PersonCoordinationItem[]>(
      `${this.endpoint}/people/list`,
    );
  }

  savePeopleCoordination(
    payload: PersonCoordinationFormData,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/people/save`,
      payload,
    );
  }

  updatePeopleCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    payload: PersonCoordinationFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/people/update/${idPersonaGeneral}/${idCoordinacion}`,
      payload,
    );
  }

  deletePeopleCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
  ): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/people/delete/${idPersonaGeneral}/${idCoordinacion}`,
    );
  }

  deleteBulkPeopleCoordinations(
    payload: DeleteBulkPersonCoordinationRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/people/delete-bulk`,
      payload,
    );
  }

  listPlantProfessorCoordinations(): Observable<PersonCoordinationItem[]> {
    return this.webRequestService.get<PersonCoordinationItem[]>(
      `${this.endpoint}/plant-professors/list`,
    );
  }

  savePlantProfessorCoordination(
    payload: PersonCoordinationFormData,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/plant-professors/save`,
      payload,
    );
  }

  updatePlantProfessorCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
    payload: PersonCoordinationFormData,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/plant-professors/update/${idPersonaGeneral}/${idCoordinacion}`,
      payload,
    );
  }

  deletePlantProfessorCoordination(
    idPersonaGeneral: number,
    idCoordinacion: number,
  ): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/plant-professors/delete/${idPersonaGeneral}/${idCoordinacion}`,
    );
  }

  deleteBulkPlantProfessorCoordinations(
    payload: DeleteBulkPersonCoordinationRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/plant-professors/delete-bulk`,
      payload,
    );
  }

    getCoordinationCatalogs(): Observable<CoordinationManagementCatalogs> {
    return this.webRequestService.get<CoordinationManagementCatalogs>(
        `${this.endpoint}/coordinations/catalogs`,
    );
    }

    searchUnits(term: string): Observable<CatalogOptionItem[]> {
    return this.webRequestService.get<CatalogOptionItem[]>(
        `${this.endpoint}/coordinations/units/search?term=${encodeURIComponent(term)}`,
    );
    }

    listParentCoordinations(): Observable<CoordinationManagementItem[]> {
    return this.webRequestService.get<CoordinationManagementItem[]>(
        `${this.endpoint}/coordinations/parents/list`,
    );
    }

    listChildCoordinations(idPadre: number): Observable<CoordinationManagementItem[]> {
    return this.webRequestService.get<CoordinationManagementItem[]>(
        `${this.endpoint}/coordinations/${idPadre}/children/list`,
    );
    }

    saveParentCoordination(payload: CoordinationManagementFormData): Observable<void> {
    return this.webRequestService.post<void>(
        `${this.endpoint}/coordinations/parents/save`,
        payload,
    );
    }

    saveChildCoordination(
    idPadre: number,
    payload: CoordinationManagementFormData,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        `${this.endpoint}/coordinations/${idPadre}/children/save`,
        payload,
    );
    }

    updateCoordination(
    id: number,
    payload: CoordinationManagementFormData,
    ): Observable<void> {
    return this.webRequestService.put<void>(
        `${this.endpoint}/coordinations/update/${id}`,
        payload,
    );
    }

    deleteCoordination(id: number): Observable<void> {
    return this.webRequestService.delete<void>(
        `${this.endpoint}/coordinations/delete/${id}`,
    );
    }

    deleteBulkCoordinations(
    payload: DeleteBulkCoordinationsRequest,
    ): Observable<void> {
    return this.webRequestService.post<void>(
        `${this.endpoint}/coordinations/delete-bulk`,
        payload,
    );
    }



}