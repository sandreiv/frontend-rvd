import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import { UniversityPeriodItem } from '../../preload-call/model/preload-call.model';
import { ProfessorLoadSummaryApi } from '../../professor-preload/model/professor-summary.model';
import {
  AcademicCoordinationItem,
  PendingVerifyProfessorsList,
  VerifyPreloadCallItem,
  VerifyProfessorItem,
  VerifyProfessorsFilter,
} from '../model/verify-professors.model';

@Injectable({
  providedIn: 'root',
})
export class VerifyProfessorsService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/verify-professor';

  /**
   * Obtiene los periodos universitarios para el filtro.
   */
  listUniversityPeriod(): Observable<UniversityPeriodItem[]> {
    return this.webRequestService.get<UniversityPeriodItem[]>(
      `${this.endpoint}/list-university-period`,
    );
  }

  /**
   * Obtiene las convocatorias activas del periodo.
   */
  listActivePreloadCalls(
    idPeriodoUniversidad: number,
  ): Observable<VerifyPreloadCallItem[]> {
    return this.webRequestService.get<VerifyPreloadCallItem[]>(
      `${this.endpoint}/list-active-preload-calls`,
      { idPeriodoUniversidad },
    );
  }

  /**
   * Lista coordinaciones académicas con docentes para verificar
   * en el periodo y la convocatoria.
   */
  listAcademicCoordinations(
    idPeriodoUniversidad: number,
    idConvocatoria: number,
  ): Observable<AcademicCoordinationItem[]> {
    return this.webRequestService.get<AcademicCoordinationItem[]>(
      `${this.endpoint}/list-academic-coordinations`,
      { idPeriodoUniversidad, idConvocatoria },
    );
  }

  /**
   * Lista docentes en estado para verificar.
   */
  listProfessors(filter: VerifyProfessorsFilter): Observable<VerifyProfessorItem[]> {
    return this.webRequestService.get<VerifyProfessorItem[]>(
      `${this.endpoint}/list-professors`,
      {
        idPeriodoUniversidad: filter.idPeriodoUniversidad,
        idConvocatoria: filter.idConvocatoria,
        idCoordinacion: filter.idCoordinacion,
      },
    );
  }

  /**
   * Lista docentes pendientes de verificación para el header.
   */
  listPendingProfessors(): Observable<PendingVerifyProfessorsList> {
    return this.webRequestService.get<PendingVerifyProfessorsList>(
      `${this.endpoint}/pending`,
    );
  }

  /**
   * Obtiene el resumen completo de una carga docente:
   * valor de contratación, horas de actividades y centros de costo.
   */
  getProfessorLoadSummary(
    idCargaDocente: number,
  ): Observable<ProfessorLoadSummaryApi> {
    return this.webRequestService.get<ProfessorLoadSummaryApi>(
      `${this.endpoint}/professor-load-summary/${idCargaDocente}`,
    );
  }
}
