import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  normalizePreloadCallListItem,
  PreloadCallItem,
  PreloadCallListApiItem,
  UniversityPeriodItem,
} from '../../preload-call/model/preload-call.model';
import {
  CoordinationApiItem,
  CoordinationItem,
  ModalityProfessor,
  normalizeCoordinationItem,
} from '../../professor-preload/model/coordination.model';
import { HiringCallItem } from '../model/hiring-call.model';

@Injectable({ providedIn: 'root' })
export class HiringCallService {
  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/hiring-call';

  /**
   * Obtiene los periodos universitarios disponibles.
   *
   * @returns Observable con los periodos universitarios.
  */

  getUniversityPeriod(): Observable<UniversityPeriodItem[]> {
    return this.webRequestService.get<UniversityPeriodItem[]>(
      `${this.endpoint}/list-university-period`,
    );
  }

  /**
   * Lista las convocatorias de contratación del periodo universitario indicado.
   *
   * @param idPeriodoUniversidad Identificador del periodo universitario.
   * @returns Observable con las convocatorias de contratación del periodo.
  */

  listHiringCalls(
    idPeriodoUniversidad: number,
  ): Observable<HiringCallItem[]> {
    return this.webRequestService
      .get<PreloadCallListApiItem[]>(`${this.endpoint}/list-active-calls`, {
        idPeriodoUniversidad: String(idPeriodoUniversidad),
      })
      .pipe(
        map((items) =>
          items
            .map((item) => normalizePreloadCallListItem(item))
            .filter((item): item is PreloadCallItem => item != null),
        ),
      );
  }

  /**
   * Lista las coordinaciones del coordinador autenticado cuya carga se encuentra
   * en AVAL DESARROLLO y está asociada a la preasignación de la convocatoria
   * de contratación.
   *
   * @param idPeriodoUniversidad Identificador del periodo universitario.
   * @param idConvocatoria Identificador opcional de la convocatoria de contratación.
   * @returns Observable con las coordinaciones disponibles.
  */
  listCoordinations(
    idPeriodoUniversidad: number,
    idConvocatoria?: number | null,
  ): Observable<CoordinationItem[]> {
    const params: Record<string, string> = {
      idPeriodoUniversidad: String(idPeriodoUniversidad),
    };

    if (idConvocatoria != null) {
      params['idConvocatoria'] = String(idConvocatoria);
    }

    return this.webRequestService
      .get<CoordinationApiItem[]>(
        `${this.endpoint}/list-coordinations`,
        params,
      )
      .pipe(map((items) => items.map(normalizeCoordinationItem)));
  }

  /**
   * Lista los docentes de una carga según la modalidad de contratación.
   * Para planta utiliza los docentes de la coordinación y para las demás
   * modalidades los docentes registrados en CARGADOCENTE.
   *
   * @param idCarga Identificador de la carga.
   * @param idModalidadContratacion Identificador de la modalidad de contratación.
   * @returns Observable con los docentes de la modalidad seleccionada.
  */
  listProfessorsByModality(
    idCarga: number,
    idModalidadContratacion: number,
  ): Observable<ModalityProfessor[]> {
    return this.webRequestService.get<ModalityProfessor[]>(
      `${this.endpoint}/list-professors-modality`,
      { idCarga, idModalidadContratacion },
    );
  }
}
