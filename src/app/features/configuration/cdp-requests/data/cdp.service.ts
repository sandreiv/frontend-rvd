import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { WebRequestService } from '../../../../core/service/web-request-service';
import { CdpContext } from '../model/cdp-context.model';

@Injectable({
  providedIn: 'root',
})
export class CdpService {

  private readonly webRequestService = inject(WebRequestService);

  private readonly endpoint = '/configuration/cdp';

  getContext(): Observable<CdpContext> {
    return this.webRequestService.get<CdpContext>(
      `${this.endpoint}/context`,
    );
  }

  /**
   * Descarga el reporte Excel CDP de la facultad.
   * Una hoja por coordinación en Aval Desarrollo.
   *
   * @param idConvocatoria Identificador de la convocatoria.
   * @param idPeriodoUniversidad Identificador del periodo.
   * @returns Observable con el archivo y el nombre sugerido.
   */
  downloadCdpReport(
    idConvocatoria?: number,
    idPeriodoUniversidad?: number,
  ): Observable<{ blob: Blob; fileName: string }> {
    return this.webRequestService
      .getBlobResponse(
        `${this.endpoint}/cdp-report`,
        this.buildReportParams(
          idConvocatoria,
          idPeriodoUniversidad,
        ),
      )
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName: resolveDownloadFileName(
            response.headers.get('content-disposition'),
            'reporte-preasignacion.xlsx',
          ),
        })),
      );
  }

  /**
   * Descarga el reporte PDF CDP de la facultad.
   * Encabezado, bloques por coordinación y firma del decano.
   *
   * @param idConvocatoria Identificador de la convocatoria.
   * @param idPeriodoUniversidad Identificador del periodo.
   * @returns Observable con el archivo y el nombre sugerido.
   */
  downloadCdpPdfReport(
    idConvocatoria?: number,
    idPeriodoUniversidad?: number,
  ): Observable<{ blob: Blob; fileName: string }> {
    return this.webRequestService
      .getBlobResponse(
        `${this.endpoint}/cdp-pdf-report`,
        this.buildReportParams(
          idConvocatoria,
          idPeriodoUniversidad,
        ),
      )
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName: resolveDownloadFileName(
            response.headers.get('content-disposition'),
            'reporte-preasignacion.pdf',
          ),
        })),
      );
  }

  private buildReportParams(
    idConvocatoria?: number,
    idPeriodoUniversidad?: number,
  ): Record<string, number> {
    const params: Record<string, number> = {};

    if (idConvocatoria != null) {
      params['idConvocatoria'] = idConvocatoria;
    }

    if (idPeriodoUniversidad != null) {
      params['idPeriodoUniversidad'] = idPeriodoUniversidad;
    }

    return params;
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