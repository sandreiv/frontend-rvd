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
import {
  ApprovePtdRequest,
  HiringCallItem,
  PdtInfoWithWeights,
  ProfessorInformationItem,
  PtdStatesProfessors,
  RejectPtdRequest,
  SavePtdRequest,
  SummaryPtdActivity,
} from '../model/hiring-call.model';
import { PublicSupportDocumentCategory, PublicSupportDocuments } from '../../../public-view/hiring/model/hiring.model';

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

  /**
   * Lista el padrón de docentes de planta de la coordinación dueña de la carga.
   *
   * @param idCarga Identificador de la carga.
   * @returns Observable con los docentes de planta de la coordinación.
   */
  listCareerProfessors(idCarga: number): Observable<ModalityProfessor[]> {
    return this.webRequestService.get<ModalityProfessor[]>(
      `${this.endpoint}/list-career-professors`,
      { idCarga },
    );
  }

  /**
   * Obtiene la información de contratación de un docente: persona, modalidad
   * con fechas, categoría, puntos y actividades PTD vigentes. Si hay una
   * novedad vigente, esos datos salen de la novedad; si no, de la carga.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observable con la información de contratación del docente.
   */
  getProfessorInformation(
    idCargaDocente: number,
  ): Observable<ProfessorInformationItem> {
    return this.webRequestService.get<ProfessorInformationItem>(
      `${this.endpoint}/professor-information`,
      { idCargaDocente },
    );
  }

  /**
   * Lista las actividades disponibles para el plan de trabajo digital.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observable con las actividades necesarias.
  */

  listPtdActivities(idCargaDocente: number): Observable<SummaryPtdActivity[]> {
    return this.webRequestService.get<SummaryPtdActivity[]>(
      `${this.endpoint}/list-ptd-activities`,
      { idCargaDocente }
    );
  }

  /**
   * Registra un nuevo PTD para la persona seleccionada.
   * 
   * @param payload Información del Plan de Trabajo Digital.
   * @returns Observable sin contenido cuando el registro finaliza correctamente.
   */
  savePtd(payload: SavePtdRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-ptd`,
      payload,
    );
  }

  /**
   * Objeto con la información de la novedad registrada por el coordinador y las ponderaciones de cada actividad
   * 
   * @param idPersonaGeneral Identificador del docente.
   * @param idCargaDocente Identificador de la carga docente.
   * @param idPeriodoUniversitario Identificador del periodo universitario.
   * @returns Observable con la información del ptd y la especificación de la ponderación por actividades
   */
  getInfoPtdWithWeights(idPersonaGeneral: number, idCargaDocente: number, idPeriodoUniversitario: number): Observable<PdtInfoWithWeights> {
    return this.webRequestService.get<PdtInfoWithWeights>(
      `${this.endpoint}/get-ptd-with-weights`,
      { idPersonaGeneral, idCargaDocente, idPeriodoUniversitario }
    );
  }

  /**
   * Lista que entrega el estado del ptd para las personas de cierto periodo. Util para bloquear o mostrar información según su estado
   * 
   * @param idPeriodoUniversitario Identificador del periodo universitario.
   * @returns Observable con los estados del ptd por persona
   */
  getPtdStatesProfessors(idPeriodoUniversitario: number): Observable<PtdStatesProfessors[]> {
    return this.webRequestService.get<PtdStatesProfessors[]>(
      `${this.endpoint}/get-ptd-states-professors`,
      { idPeriodoUniversitario }
    );
  }

  /**
   * Objeto con los adjuntos pertenecientes al PTD
   * 
   * @param idPersonaGeneral Identificador del docente.
   * @param idCargaDocente Identificador de la carga docente.
   * @param idPeriodoUniversitario Identificador del periodo universitario.
   * @returns Observable con los adjuntos cargados por el docente para el PTD
   */
  getAttachments(idPersonaGeneral: number, idCargaDocente: number, idPeriodoUniversitario: number): Observable<PublicSupportDocuments> {
    return this.webRequestService.get<PublicSupportDocuments>(
      `${this.endpoint}/get-ptd-attachments`,
      { idPersonaGeneral, idCargaDocente, idPeriodoUniversitario }
    );
  }

  /**
   * Obtiene las categorias de los adjuntos que se pueden relacionar al PTD
   * 
   * @returns Observable con las categorias generales
   */
  getAttachmentCategories(): Observable<PublicSupportDocumentCategory[]> {
    return this.webRequestService.get<PublicSupportDocumentCategory[]>(
      `${this.endpoint}/get-ptd-attachment-categories`, {}
    );
  }

  /**
   * Consulta el archivo adjunto de un PTD para su visualizacion fuera de la vista pública
   * 
   * @param idPersonaGeneral Identificador del docente.
   * @param idCargaDocente Identificador de la carga docente.
   * @param idPeriodoUniversitario Identificador del periodo universitario.
   * @param fileId Identificador del archivo.
   * @returns Archivo del documento PTD solicitado
   */
  getPtdDocumentFile(idPersonaGeneral: number, idCargaDocente: number, idPeriodoUniversitario: number, fileId: string): Observable<Blob> {
    return this.webRequestService.getBlob(
      `${this.endpoint}/get-ptd-document-file/${encodeURIComponent(fileId)}/file`,
      { idPersonaGeneral, idCargaDocente, idPeriodoUniversitario }
    );
    }

  /**
   * Actualiza el estado del PTD a 'Aprobado por Talento' y marca los documentos adjuntos enviados como validos
   * 
   * @param payload Objeto con la información para aprobar el PTD
   * @returns Observable sin contenido cuando el registro finaliza correctamente.
   */
  approvePtdByTh(payload: ApprovePtdRequest): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/approve-ptd-th`,
      payload
    );
  }

  /**
   * Actualiza el estado del PTD a 'Estipulado', marca los documentos adjuntos enviados como validos y registra
   * la observación para corregir los adjuntos invalidos
   * 
   * @param payload Objeto con la información para rechazar el PTD
   * @returns Observable sin contenido cuando el registro finaliza correctamente.
   */
  declinePtdByTh(payload: RejectPtdRequest): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/decline-ptd-th`,
      payload
    );
  }
}
