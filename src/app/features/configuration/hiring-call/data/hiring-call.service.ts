import { HttpParams } from '@angular/common/http';
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
  ContractAnexo,
  ContractCatalogs,
  HiringCdpInformationApi,
  HiringValuesInformationApi,
  PdtInfoWithWeights,
  ProfessorInformationItem,
  PtdStatesProfessors,
  RejectPtdRequest,
  SavePtdRequest,
  SummaryPtdActivity,
} from '../model/hiring-call.model';
import { PublicSupportDocumentCategory, PublicSupportDocuments } from '../../../public-view/hiring/model/hiring.model';

/**
 * Datos que el usuario diligencia en el modal antes de descargar el anexo.
 */
export interface ContractDownloadParams {
  numeroAnexo?: string | null;
  fechaFirma?: string | null;
  formaPago?: string | null;
  tipoObjeto?: string | null;
  formaInicioContrato?: string | null;
  labor?: string | null;
  objeto?: string | null;
  descripcion?: string | null;
}

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
   * Catalogos que el usuario selecciona en el panel "Datos del anexo":
   * formas de pago (BIENESV3.FORMAPAGO) y tipos de objeto contractual
   * (CONTRATOS.TIPOOBJETO).
   *
   * @returns Observable con las descripciones de ambos catalogos.
   */
  getContractCatalogs(): Observable<ContractCatalogs> {
    return this.webRequestService.get<ContractCatalogs>(
      `${this.endpoint}/contract-catalogs`,
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
   * Obtiene la información del CDP de TESORERIAV3 para la contratación de un docente.
   * Contiene un resumen de la información almacenada allí dependiendo del idCdp guardado
   * en RVD.SOLICITUDCDP para la facultad a la que pertenece la coordinación
   * 
   * @param idPeriodoUniversitario Identificador del periodo universitario
   * @param idCoordinacionHija Identificador de la coordinación hija
   * @returns Observable con la información del CDP para generar el contrato
   */
  getHiringCdpInformation(idPeriodoUniversitario: number, idCoordinacionHija: number): Observable<HiringCdpInformationApi> {
    return this.webRequestService.get<HiringCdpInformationApi>(
      `${this.endpoint}/hiring-cdp-information`,
      { idPeriodoUniversitario, idCoordinacionHija },
    );
  }

  /**
   * Obtiene la información de los centros de costos y calculos salariales.
   * Esta consulta funciona bajo la misma logica del Resumen de novedades, trayendo la
   * información relevante de la novedad o de la carga original y entregando solamente
   * los valores de contratación
   * 
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observación con los valores de contratación para generar el contrato
   */
  getHiringValuesInformation(idCargaDocente: number, numeroPeriodo: string): Observable<HiringValuesInformationApi> {
    return this.webRequestService.get<HiringValuesInformationApi>(
      `${this.endpoint}/hiring-values-information`,
      { idCargaDocente, numeroPeriodo }
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
   * Datos del anexo del contrato ya generado por el docente. Se muestran al
   * diligenciar la vinculación docente para no volver a capturarlos.
   *
   * @param idCargaDocente Carga docente del docente.
   * @returns Observable con los datos del anexo, o null si no hay contrato generado.
   */
  getContractAnexo(idCargaDocente: number): Observable<ContractAnexo | null> {
    return this.webRequestService
      .get<ContractAnexo | null>(`${this.endpoint}/contract-anexo/${idCargaDocente}`)
      .pipe(map((anexo) => anexo ?? null));
  }

  /**
   * Datos del anexo de los contratos ya generados de varias cargas docentes.
   * Es la consulta de la vinculación masiva: devuelve un elemento por carga
   * docente que ya tiene contrato generado. Las cargas docentes sin contrato
   * generado no aparecen en la lista.
   *
   * @param idsCargaDocente Cargas docentes consultadas.
   * @returns Observable con la lista de datos del anexo.
   */
  getContractAnexos(idsCargaDocente: number[]): Observable<ContractAnexo[]> {
    return this.webRequestService.get<ContractAnexo[]>(
      `${this.endpoint}/contract-anexo/listar`,
      { idsCargaDocente: idsCargaDocente.map((id) => String(id)) },
    );
  }

  /**
   * Vincula masivamente docentes con una labor compartida.
   */
  vincularDocentesMasivamente(
    idsCargaDocente: number[],
    idLabor: number,
  ): Observable<{ totalVinculados: number }> {

    return this.webRequestService.post<{ totalVinculados: number }>(
      `${this.endpoint}/vincular-masivo`,
      {
        idsCargaDocente,
        idLabor,
      },
    );
  }

  /**
   * Sincroniza masivamente docentes dentro de una carga
   * 
   * @param idsCargaDocente Identificadores de los docentes a sincronizar.
   * @param idCarga Identificador de la carga.
   * @returns Observable sin contenido cuando el registro finaliza correctamente.
   */
  sincronizarDocentesMasivamente(idsCargaDocente: number[], idCarga: number): Observable<{ totalSincronizados: number }> {
    return this.webRequestService.put<{ totalSincronizados: number }>(
      `${this.endpoint}/sync-professors/${idCarga}`,
      idsCargaDocente,
    );
  }

  /**
   * Lista que entrega el estado del ptd para las personas de cierto periodo. Util para bloquear o mostrar información según su estado
   *
   * @param idPeriodoUniversitario Identificador del periodo universitario.
   * @param idCarga Identificador de la carga.
   * @returns Observable con los estados del ptd por persona.
   */
  getPtdStatesProfessors(idPeriodoUniversitario: number, idCarga: number): Observable<PtdStatesProfessors[]> {
    return this.webRequestService.get<PtdStatesProfessors[]>(
      `${this.endpoint}/get-ptd-states-professors`,
      { idPeriodoUniversitario, idCarga }
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
   * Descarga el anexo de contratación del docente en PDF y registra el
   * contrato con los datos diligenciados.
   *
   * El backend decide la plantilla: anexo con funciones administrativas si el
   * docente es coordinador del programa, anexo de 4 meses en caso contrario.
   *
   * @param idCargaDocente Carga docente del docente contratado.
   * @param numeroPeriodo Numero del periodo para la carga docente.
   * @param datos Datos adicionales diligenciados por el usuario.
   * @returns Observable con el archivo y su nombre.
   */
  downloadContractPdf(
    idCargaDocente: number,
    numeroPeriodo: string,
    datos?: ContractDownloadParams,
  ): Observable<{ blob: Blob; fileName: string }> {
    let params = new HttpParams();

    if (datos) {
      Object.entries(datos).forEach(([key, value]) => {
        const trimmedValue = value?.trim();

        if (trimmedValue) {
          params = params.set(key, trimmedValue);
        }
      });
    }

    return this.webRequestService
      .getBlobResponse(`${this.endpoint}/contract-pdf-report/${idCargaDocente}/${numeroPeriodo}`, params)
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName: resolveDownloadFileName(
            response.headers.get('content-disposition'),
            `anexo-contrato-${idCargaDocente}.pdf`,
          ),
        })),
      );
  }

  /**
   * Vincula un docente con su contrato ya generado.
   *
   * A diferencia de la generacion del contrato, la vinculacion no produce el
   * anexo en PDF: solo completa las tablas de vinculacion del docente.
   *
   * @param idCargaDocente Carga docente del docente a vincular.
   * @param numeroPeriodo Numero del periodo de la carga docente.
   * @param labor Labor docente a asignar.
   * @returns Observable con el id del contrato vinculado.
   */
  vincularDocente(
    idCargaDocente: number,
    numeroPeriodo: string,
    labor: string | null,
  ): Observable<{ idContrato: number; idCargaDocente: number }> {
    return this.webRequestService.post<{ idContrato: number; idCargaDocente: number }>(
      `${this.endpoint}/vincular-docente/${idCargaDocente}`,
      {
        idCargaDocente,
        numeroPeriodo,
        anexo: { idLabor: labor ? Number(labor) : null },
      }
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


/**
 * Extrae el nombre del archivo del header Content-Disposition.
 */
function resolveDownloadFileName(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/"/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/"/g, '');
    }
  }

  const plainMatch = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallback;
}
