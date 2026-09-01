import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { WebRequestService } from '../../../../core/service/web-request-service';
import {
  CategoriaCatedratico,
  CoordinationApiItem,
  CoordinationItem,
  CoordinationPreloadCallApi,
  LoadRestrictionPreview,
  ModalityProfessor,
  ProfessorSearchResult,
  ActivitiesHours,
  TotalPreload,
  ValuePointsPreload,
  WorkDate,
  normalizeCoordinationItem,
} from '../model/coordination.model';
import { SavePreloadRequest } from '../model/save-preload.model';
import { AddProfessorRequest } from '../model/add-professor.model';
import { SearchGeneralPersonParams, UniversityPeriodItem } from '../../preload-call/model/preload-call.model';
import {
  ActividadModalidadDTO,
  GrupoMateria,
  MateriaAcademica,
  ProgramHourRestriction,
  ProgramaAcademico,
  TipoActividad,
  TipoActividadCriterio,
  UnidadRegional,
} from '../model/professor-activities.model';
import { ProyectoDocenteDto } from '../model/professor-projects.model';
import { DetailProfessorPreloadApi, DetailProfessorPreloadItemApi } from '../model/detail-professor-preload.model';
import {   ApproveProfessorActivityDistributionRequest, SaveDetailProfessorPreloadRequest } from '../model/save-detail-professor-preload.model';
import { SaveCareerProfessorPreloadRequest } from '../model/save-career-professor-preload.model';
import { ProfessorLoadSummaryApi } from '../model/professor-summary.model';
import { DeclinePreloadDeanRequest } from '../model/preload-carga.model';
import { ObservacionesCargaItem } from '../model/observations-load';

@Injectable({
  providedIn: 'root',
})
export class CoordinationService {

  private readonly webRequestService = inject(WebRequestService);
  private readonly endpoint = '/configuration/coordination';
  private readonly cdpEndpoint = '/configuration/cdp';


  /**
   * Obtiene las convocatorias de precarga activas del periodo universitario.
   *
   * @param idPeriodoUniversidad Identificador del periodo universitario.
   * @returns Observable con las convocatorias activas del periodo.
   */
  getActivePreloadCall(idPeriodoUniversidad: number): Observable<CoordinationPreloadCallApi[]> {
    return this.webRequestService.get<CoordinationPreloadCallApi[]>(
      `${this.endpoint}/list-active-preload-calls`,
      { idPeriodoUniversidad },
    );
  }

  /**
   * Obtiene las convocatorias activas asignables del periodo.
   * Excluye las que tienen restricciones vigentes o no vencidas.
   * Se usa para autoasignación y para el modal del botón "+".
   *
   * @param idPeriodoUniversidad Identificador del periodo universitario.
   * @returns Observable con convocatorias disponibles para asignación libre.
   */
  getAssignablePreloadCalls(idPeriodoUniversidad: number): Observable<CoordinationPreloadCallApi[]> {
    return this.webRequestService.get<CoordinationPreloadCallApi[]>(
      `${this.endpoint}/list-assignable-preload-calls`,
      { idPeriodoUniversidad },
    );
  }

  /**
   * Lista coordinaciones del periodo. Sin convocatoria, “sin carga”
   * significa sin CARGA en ese periodo (puede tener carga en otro).
   *
   * @param idPeriodoUniversidad Identificador del periodo universitario.
   * @param idConvocatoria Identificador opcional de la convocatoria.
   */
  getCoordinations(idPeriodoUniversidad: number, idConvocatoria?: number | null): Observable<CoordinationItem[]> {
    const params: Record<string, number> = {
      idPeriodoUniversidad,
    };

    if (idConvocatoria != null) {
      params['idConvocatoria'] = idConvocatoria;
    }

    return this.webRequestService
      .get<CoordinationApiItem[]>(`${this.endpoint}/list`, params)
      .pipe(map((items) => items.map(normalizeCoordinationItem)));
  }

  /**
   * Lista las coordinaciones disponibles para Solicitudes CPD.
   * El backend retorna únicamente cargas en estado AVAL DESARROLLO
   * asociadas al Decano autenticado.
   */
  getCdpRequests(
    idPeriodoUniversidad: number,
    idConvocatoria: number,
  ): Observable<CoordinationItem[]> {
    return this.webRequestService
      .get<CoordinationApiItem[]>(
        `${this.cdpEndpoint}/requests`,
        {
          idPeriodoUniversidad,
          idConvocatoria,
        },
      )
      .pipe(
        map((items) =>
          items.map(normalizeCoordinationItem),
        ),
      );
  }

  /**
   * Asigna o actualiza la convocatoria asociada a una coordinación.
   * El backend valida que la convocatoria sea asignable libremente y que no tenga restricciones vigentes.
   *
   * @param request Información de la coordinación y convocatoria a asignar.
   * @returns Observable sin contenido cuando la operación finaliza correctamente.
   */

  savePreload(request: SavePreloadRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-preload`,
      request,
    );
  }
  
  searchProfesor(params: SearchGeneralPersonParams,): Observable<ProfessorSearchResult[]> {
    const query: Record<string, string | number> = {};
    const documento = params.documento?.trim();
    const nombre = params.nombre?.trim();

    if (documento) {
      query['documento'] = documento;
    }
    if (nombre) {
      query['nombre'] = nombre;
    }
    if (params.idModalidadContratacion != null) {
      query['idModalidadContratacion'] = params.idModalidadContratacion;
    }

    return this.webRequestService.get<ProfessorSearchResult[]>(
      `${this.endpoint}/search-professor`,
      query,
    );
  }

  /**
   * Lista docentes de una carga según modalidad de contratación.
   * Planta: docentes de la coordinación de la carga, con datos de esa carga.
   * Otras modalidades: solo docentes con CARGADOCENTE en esa carga.
   *
   * @param idCarga Identificador de la carga.
   * @param idModalidadContratacion Identificador de la modalidad.
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
   * Obtiene fechas de convocatoria por carga y modalidad.
   *
   * @param idCarga Identificador de la carga.
   * @param idModalidadContratacion Identificador de la modalidad.
   */
  getWorkDates(idCarga: number, idModalidadContratacion: number): Observable<WorkDate[]> {
    return this.webRequestService.get<WorkDate[]>(
      `${this.endpoint}/work-date`,
      { idCarga, idModalidadContratacion },
    );
  }

  getLoadRestrictionByModality(idModalidadContratacion: number): Observable<LoadRestrictionPreview> {
    return this.webRequestService.get<LoadRestrictionPreview>(
      `/configuration/administration/load-restriction/restriction/${idModalidadContratacion}`,
    );
  }

  getValuePointsPreload(anio: number, idCategoriaCatedratico: number, idPersonaGeneral: number | null, idModalidadContratacion: number): Observable<ValuePointsPreload> {
    return this.webRequestService.get<ValuePointsPreload>(
      `${this.endpoint}/value-points-preload`,
      { anio, idCategoriaCatedratico, idPersonaGeneral, idModalidadContratacion },
    );
  }

  getCategoriaCatedratico(idModalidadContratacion: number,): Observable<CategoriaCatedratico[]> {
    return this.webRequestService.get<CategoriaCatedratico[]>(
      `${this.endpoint}/professor-category`,
      { idModalidadContratacion },
    );
  }

  /**
   * Registra un docente en la precarga.
   * El backend valida si la coordinación se encuentra habilitada para edición.
   *
   * @param request Información del docente, carga y modalidad de contratación.
   * @returns Observable sin contenido cuando el registro finaliza correctamente.
   */

  addProfessor(request: AddProfessorRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/add-professor`,
      request,
    );
  }

  /**
   * Elimina un docente de la precarga.
   * La eliminación queda protegida por las reglas de edición definidas en backend.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observable sin contenido cuando la eliminación finaliza correctamente.
   */

  deleteProfessor(idCargaDocente: number): Observable<void> {
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete-professor/${idCargaDocente}`,
    );
  }

  /**
   * Actualiza la información de un docente registrado en la precarga.
   * El backend valida los permisos de edición según la convocatoria, coordinación y restricciones vigentes.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @param request Información actualizada del docente.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */

  updateProfessor( idCargaDocente: number, request: AddProfessorRequest): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/update-professor/${idCargaDocente}`,
      request,
    );
  }

  listCriteria(idTipoActividad: number): Observable<TipoActividadCriterio[]> {
    return this.webRequestService.get<TipoActividadCriterio[]>(
      `${this.endpoint}/list-criteria`,
      { idTipoActividad },
    );
  }

  listRegionalUnits(idCoordinacion: number): Observable<UnidadRegional[]> {
    return this.webRequestService.get<UnidadRegional[]>(
      `${this.endpoint}/list-regional-unit`,
      { idCoordinacion },
    );
  }

  listPrograms(idCoordinacion: number,idUnidadRegional: number,idNivelEducativo: number,): Observable<ProgramaAcademico[]> {
    return this.webRequestService.get<ProgramaAcademico[]>(
      `${this.endpoint}/list-program`,
      { idCoordinacion, idUnidadRegional, idNivelEducativo },
    );
  }

  listSubjects(idPrograma: number, idCoordinacion: number): Observable<MateriaAcademica[]> {
    return this.webRequestService.get<MateriaAcademica[]>(
      `${this.endpoint}/list-subject`,
      { idPrograma, idCoordinacion },
    );
  }

  /**
   * Consulta restricciones de horas por programa para la modalidad.
   * Si se envía idCargaDocente, incluye horas asignadas y disponibles.
   *
   * @param idModalidadContratacion Identificador de la modalidad.
   * @param idCargaDocente Identificador opcional de la carga docente.
   * @returns Observable con programas que tienen máximo de horas configurado.
   */
  listProgramHourRestrictions(
    idModalidadContratacion: number,
    idCargaDocente?: number | null,
  ): Observable<ProgramHourRestriction[]> {
    const params: Record<string, number> = {
      idModalidadContratacion,
    };

    if (idCargaDocente != null) {
      params['idCargaDocente'] = idCargaDocente;
    }

    return this.webRequestService.get<ProgramHourRestriction[]>(
      `${this.endpoint}/program-hour-restriction`,
      params,
    );
  }

  listSubjectGroups(codigoMateria: string, idPeriodoUniversidad: number,): Observable<GrupoMateria[]> {
    return this.webRequestService.get<GrupoMateria[]>(
      `${this.endpoint}/list-subject-group`,
      { codigoMateria, idPeriodoUniversidad },
    );
  }

  listProjectsProfessor(
    idPersonaGeneral: number,
    idConvocatoria: number,
  ): Observable<ProyectoDocenteDto[]> {
    return this.webRequestService.get<ProyectoDocenteDto[]>(
      `${this.endpoint}/list-projects-professor`,
      {
        idPersonaGeneral,
        idConvocatoria,
      },
    );
  }

  listActivityTypes(): Observable<TipoActividad[]> {
    return this.webRequestService.get<TipoActividad[]>(
      `${this.endpoint}/list-activity-types`,
    );
  }

  /**
   * Lista los tipos de actividad permitidos según la modalidad de contratación.
   * Fuente de verdad desde RESTRICCIONCARGA / TIPOACTIVIDADMODALIDAD.
   *
   * @param idModalidadContratacion Identificador de la modalidad.
   * @returns Observable con los tipos de actividad de la modalidad.
   */
  listActivitiesModality(idModalidadContratacion: number): Observable<ActividadModalidadDTO> {
    return this.webRequestService.get<ActividadModalidadDTO>(
      `${this.endpoint}/list-activities-modality`,
      { idModalidadContratacion },
    );
  }

  /**
   * Guarda la distribución de actividades de un docente.
   * El backend valida que la coordinación pueda editar dentro de la convocatoria seleccionada.
   *
   * @param request Distribución de actividades de la precarga docente.
   * @returns Observable sin contenido cuando el guardado finaliza correctamente.
   */
  saveActivityDistribution(request: SaveDetailProfessorPreloadRequest): Observable<void> {
    console.log('request', request);
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-detail-professor-preload`,
      request,
    );
  }

  /**
   * Consulta el detalle de la distribución de actividades de un docente.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observable con el detalle de actividades de la precarga.
   */

  listDetailProfessorPreload(idCargaDocente: number): Observable<DetailProfessorPreloadApi> {
    return this.webRequestService.get<DetailProfessorPreloadApi>(
      `${this.endpoint}/list-detail-professor-preload`,
      { idCargaDocente },
    );
  }

  getUniversityPeriod(): Observable<UniversityPeriodItem[]> {
    return this.webRequestService.get<UniversityPeriodItem[]>(
      `${this.endpoint}/list-university-period`,
    );
  }

  /**
   * Actualiza una actividad específica dentro de la distribución de precarga docente.
   *
   * @param detalle Información de la actividad a actualizar.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */

  updateDetailProfessorPreload(detalle: DetailProfessorPreloadItemApi): Observable<void> {
    const payload: DetailProfessorPreloadItemApi = {
      idDetalleCargaDocente: detalle.idDetalleCargaDocente,
      idCargaDocente: detalle.idCargaDocente,
      detalles: [detalle.detalles[0]],
    };

    return this.webRequestService.put<void>(
      `${this.endpoint}/update-detail-professor-preload`,
      payload,
    );
  }

  /**
   * Activa o guarda la precarga de un docente de planta.
   *
   * @param request Información de la carga docente de planta.
   * @returns Observable sin contenido cuando la operación finaliza correctamente.
   */

  saveCareerProfessorPreload(request: SaveCareerProfessorPreloadRequest): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/save-career-professor-preload`,
      request,
    );
  }

  /**
   * Elimina una actividad asociada al detalle de carga docente.
   *
   * @param idDetalleCargaDocente Identificador del detalle de carga docente.
   * @returns Observable sin contenido cuando la eliminación finaliza correctamente.
   */

  deleteProfessorActivity(idDetalleCargaDocente: number): Observable<void>{
    return this.webRequestService.delete<void>(
      `${this.endpoint}/delete-professor-activity/${idDetalleCargaDocente}`,
    );
  }

  approveProfessorPreassignment(idCargaDocente: number): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/approve-professor-preassignment/${idCargaDocente}`,
      {},
    );
  }

  approveProfessorActivityDistribution(
    request: ApproveProfessorActivityDistributionRequest,
  ): Observable<void> {
    return this.webRequestService.post<void>(
      `${this.endpoint}/approve-professor-activity-distribution`,
      request,
    );
  }

  /**
   * Consulta el total general de la preasignación docente.
   *
   * @param idCarga Identificador de la carga.
   * @returns Observable con los valores totales de la preasignación.
   */

  getTotalPreload(idCarga: number): Observable<TotalPreload> {
    return this.webRequestService.get<TotalPreload>(
      `${this.endpoint}/total-preload`,
      { idCarga },
    );
  }

  /**
   * Obtiene el resumen completo de una carga docente:
   * valor de contratación, horas de actividades y centros de costo.
   *
   * @param idCargaDocente Identificador de la carga docente.
   * @returns Observable con el resumen de la carga docente.
   */
  getProfessorLoadSummary(
    idCargaDocente: number,
  ): Observable<ProfessorLoadSummaryApi> {
    return this.webRequestService.get<ProfessorLoadSummaryApi>(
      `${this.endpoint}/professor-load-summary/${idCargaDocente}`,
    );
  }

  /**
   * Descarga el reporte Excel de preasignación de una carga.
   *
   * @param idCarga Identificador de la carga.
   * @returns Observable con el archivo y el nombre sugerido.
   */
  downloadPreloadReport(idCarga: number): Observable<{ blob: Blob; fileName: string }> {
    return this.webRequestService
      .getBlobResponse(`${this.endpoint}/preload-report/${idCarga}`)
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName: resolveDownloadFileName(
            response.headers.get('content-disposition'),
            `preasignacion-carga-${idCarga}.xlsx`,
          ),
        })),
      );
  }

  /**
   * Obtiene las observaciones por carga.
   * 
   * @param idCarga Identificador de la carga.
   * @returns Observable con el objeto de observaciones que se mostrara en el modal.
   */
  listPreloadObservations(idCarga: number): Observable<ObservacionesCargaItem[]> {
    return this.webRequestService.get<ObservacionesCargaItem[]>(
      `${this.endpoint}/preload-observations/${idCarga}`,
      {},
    )
  }

  /**
   * Actualiza la bandera booleana de la observación a Vista.
   * 
   * @param idCarga Identificador de la carga.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */
  markSeenObservations(idCarga: number): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/mark-seen-observations/${idCarga}`,
      {},
    )
  }

  /**
   * Activa el aval de la carga para cambiar su estado a inscrito y pasar al decano.
   * 
   * @param idCarga Identificador de la carga.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */
  endorsePreloadDean(idCarga: number): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/send-preload-dean/${idCarga}`,
      {},
    );
  }

  /**
   * Devuelve la carga al coordinador para su corrección, cambiando el estado a registrado.
   * 
   * @param idCarga Identificador de la carga.
   * @param request Cuerpo de la solicitud para mantener trazabilidad de observaciones.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */
  declinePreloadDean(idCarga: number, request: DeclinePreloadDeanRequest): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/decline-preload-dean/${idCarga}`,
      request,
    )
  }

  /**
   * Aprueba la carga por parte del decano y la envía a desarrollo académico.
   *
   * @param idCarga Identificador de la carga.
   * @returns Observable sin contenido cuando la actualización finaliza correctamente.
   */
  approvePreloadDean(idCarga: number): Observable<void> {
      return this.webRequestService.put<void>(
        `${this.endpoint}/approve-preload-dean/${idCarga}`,
        {},
      );
    }

    /**
   * Devuelve la carga desde Desarrollo Académico al coordinador.
   * El estado de la carga vuelve a REGISTRADO.
   */
  declinePreloadDevelopment(
    idCarga: number,
    request: DeclinePreloadDeanRequest,
  ): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/decline-preload-development/${idCarga}`,
      request,
    );
  }

  /**
   * Aprueba la carga por parte de Desarrollo Académico.
   * El estado cambia a AVAL DESARROLLO.
   */
  approvePreloadDevelopment(idCarga: number): Observable<void> {
    return this.webRequestService.put<void>(
      `${this.endpoint}/approve-preload-development/${idCarga}`,
      {},
    );
  }

  /**
   * Consulta las horas totales de las actividades de la precarga.
   *
   * @param idCarga Identificador de la carga.
   * @returns Observable con las horas totales de las actividades.
   */
  getActivitiesHours(idCarga: number): Observable<ActivitiesHours> {
    return this.webRequestService.get<ActivitiesHours>(
      `${this.endpoint}/activities-hours`,
      { idCarga },
    );
  }

}

function resolveDownloadFileName(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(
    contentDisposition,
  );
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