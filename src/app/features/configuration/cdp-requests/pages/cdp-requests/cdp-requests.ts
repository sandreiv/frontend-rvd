import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';

import { CdpService } from '../../data/cdp.service';
import { CdpContext, FacultyCoordinationItem } from '../../model/cdp-context.model';

import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, Observable } from 'rxjs';

import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { getFileTypeIconPath } from '../../../../../shared/utils/file-type-icon.util';
import {
  Select,
  type Option as SelectOption,
} from '../../../../../shared/components/form/select/select';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { Tooltip } from '../../../../../shared/ui/tooltip/tooltip';

import { UniversityPeriodItem } from '../../../preload-call/model/preload-call.model';

import { CoordinationTable } from '../../../professor-preload/components/coordination-table/coordination-table';
import { CoordinationService } from '../../../professor-preload/data/coordination.service';

import {
  CoordinationItem,
  CoordinationPreloadCallApi,
} from '../../../professor-preload/model/coordination.model';
import { PermissionService } from '../../../../../core/service/permission-service';
import { AuthService } from '../../../../../core/service/auth-service';

@Component({
  selector: 'app-cdp-requests',
  imports: [
    Button,
    Select,
    SectionFrame,
    CoordinationTable,
    Icon,
    Tooltip,
  ],
  templateUrl: './cdp-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdpRequests implements OnInit {

  private readonly coordinationService = inject(CoordinationService);
  private readonly cdpService = inject(CdpService);
  private readonly authService = inject(AuthService);
  readonly permissions = inject(PermissionService);

  readonly getFileTypeIconPath = getFileTypeIconPath;


  readonly universityPeriods = signal<UniversityPeriodItem[]>([]);
  readonly selectedPeriodId = signal('');
  readonly appliedPeriodId = signal<number | null>(null);

  readonly selectedPreloadCallId = signal('');
  readonly appliedPreloadCallId = signal<string | null>(null);

  readonly selectedCoordinationIds = signal<string[]>([]);

  readonly isLoadingPeriods = signal(false);

  readonly cdpObservation = signal('');
  readonly cdpAttachments = signal<File[]>([]);

  readonly cdpObservationMaxLength = 250;

  readonly isDownloadingReport = signal(false);
  readonly isDownloadingPdfReport = signal(false);


  readonly isDean = computed(() => {
    const rolesUsuario = this.authService.getRoles();

    return rolesUsuario.includes('Decano');
  });

  readonly cdpContextResource = rxResource<CdpContext, unknown>({
    params: () => {
      return this.isDean() ? {} : undefined;
    },
    stream: () =>
      this.cdpService.getContext(),
  });

  readonly cdpContext = computed(
    () => this.cdpContextResource.value(),
  );


  readonly cdpObservationRemaining = computed(
    () =>
      this.cdpObservationMaxLength -
      this.cdpObservation().length,
  );

  readonly activePreloadCallsResource = rxResource({
    params: () => {
      const idPeriodoUniversidad =
        this.resolveSelectedPeriodId();

      if (idPeriodoUniversidad == null) {
        return undefined;
      }

      return {
        idPeriodoUniversidad,
      };
    },

    stream: ({ params }) =>
      this.coordinationService.getActivePreloadCall(
        params.idPeriodoUniversidad,
      ),

    defaultValue: [] as CoordinationPreloadCallApi[],
  });

  readonly cdpRequestsForDeanResource = rxResource({
    params: () => {
      const idPeriodoUniversidad =
        this.appliedPeriodId();

      const preloadCallId =
        this.appliedPreloadCallId();

      if (
        idPeriodoUniversidad == null ||
        preloadCallId == null ||
        !preloadCallId
      ) {
        return undefined;
      }

      const idConvocatoria =
        Number(preloadCallId);

      if (Number.isNaN(idConvocatoria)) {
        return undefined;
      }

      if (!this.isDean()) {
        return undefined;
      }

      return {
        idPeriodoUniversidad,
        idConvocatoria,
      };
    },

    stream: ({ params }) =>
      this.coordinationService.getCdpRequests(
        params.idPeriodoUniversidad,
        params.idConvocatoria,
      ),

    defaultValue: [] as CoordinationItem[],
  });

  readonly cdpRequestsForAcademicDevelopmentResource = rxResource({
    params: () => {
      const idPeriodoUniversidad = this.appliedPeriodId();

      if (idPeriodoUniversidad == null) {
        return undefined;
      }
      if (this.isDean()) {
        return undefined;
      }

      return { idPeriodoUniversidad };
    },

    stream: ({ params }) =>
      this.coordinationService.getCdpRequestsForAcademicDevelopment(
        params.idPeriodoUniversidad,
      ),

    defaultValue: [] as FacultyCoordinationItem[],
  });

  readonly periodOptions =
    computed<SelectOption[]>(() =>
      this.universityPeriods().map((item) => ({
        value: String(item.id),
        label: `${item.anio} - ${item.periodo}`,
      })),
    );

  readonly preloadCallOptions =
    computed<SelectOption[]>(() =>
      this.activePreloadCallsResource
        .value()
        .map((item) => ({
          value: String(item.id),
          label: item.nombre,
        })),
    );

  readonly coordinations = computed(() => this.cdpRequestsForDeanResource.value());

  readonly faculties = computed(() => this.cdpRequestsForAcademicDevelopmentResource.value())

  readonly isLoadingPreloadCalls = computed(
    () =>
      this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(
    () =>
      this.cdpRequestsForDeanResource.isLoading(),
  );

  readonly isLoadingFaculties = computed(() => this.cdpRequestsForAcademicDevelopmentResource.isLoading())

  readonly hasAppliedFilterForDean = computed(
    () =>
      this.appliedPeriodId() != null &&
      this.appliedPreloadCallId() != null &&
      this.isDean(),
  );

  readonly hasAppliedFilterForAcademicDevelopment = computed(
    () =>
      this.appliedPeriodId() != null &&
      !this.isDean(),
  );

  readonly tableEmptyMessage = computed(() => {
    if (this.hasAppliedFilterForDean() || this.hasAppliedFilterForAcademicDevelopment()) {
      return 'No hay solicitudes CDP para mostrar.';
    }

    if (!this.selectedPeriodId()) {
      return 'Seleccione un periodo y pulse Filtrar.';
    }

    return this.isDean() ? 'Seleccione una convocatoria y pulse Filtrar.' : 'Seleccione un periodo y pulse Filtrar.';
  });

  readonly titleSection = computed(() => {
    return this.isDean() ? 'Coordinaciones' : 'Facultades';
  })
  readonly descriptionSection = computed(() => {
    return this.isDean() ? 'Selecciona las coordinaciones para solicitar el CDP.' : 'Selecciona las facultades para revisar el CDP.';
  })

  readonly titleCdpSection = computed(() => {
    return this.isDean() ? 'Solicitar CDP' : 'Revisar CDP';
  })
  readonly descriptionCdpSection = computed(() => {
    return this.isDean() ? 'Registra las observaciones y adjuntos de la solicitud.' : 'Revisa las observaciones y adjuntos de la solicitud.';
  })

  readonly canShowCdpReportButtons = computed(() => this.permissions.canDownloadCdpReport());

  readonly canDownloadCdpReport = computed(() => {
    if (!this.canShowCdpReportButtons) {
      return;
    }

    const periodId = this.resolveSelectedPeriodId();
    const convocatoriaId = this.resolveSelectedConvocatoriaId();

    return periodId != null && convocatoriaId != null;
  });

  readonly downloadReportTooltip = computed(() => {
    if (this.canDownloadCdpReport()) {
      return '';
    }

    return (
      'Seleccione periodo y convocatoria para generar el reporte.'
    );
  });

  readonly disabledFilterOptionsForDean = computed(() => {
    return this.isLoadingPeriods() || !this.selectedPeriodId() || !this.selectedPreloadCallId() || this.isLoadingPreloadCalls() || this.isLoadingCoordinations();
  });

  readonly disabledFilterOptionsForAcademicDevelopment = computed(() => {
    return this.isLoadingPeriods() || !this.selectedPeriodId() || this.isLoadingFaculties();
  });

  ngOnInit(): void {
    void this.loadUniversityPeriods();
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.selectedPreloadCallId.set('');
  }

  onPreloadCallChange(
    preloadCallId: string,
  ): void {
    this.selectedPreloadCallId.set(
      preloadCallId,
    );
  }

  onApplyFilterForDean(): void {
    const periodId =
      this.selectedPeriodId();

    const preloadCallId =
      this.selectedPreloadCallId();

    if (!periodId || !preloadCallId) {
      this.appliedPeriodId.set(null);
      this.appliedPreloadCallId.set(null);
      this.selectedCoordinationIds.set([]);
      return;
    }

    const parsedPeriodId =
      Number(periodId);

    if (Number.isNaN(parsedPeriodId)) {
      return;
    }

    this.appliedPeriodId.set(
      parsedPeriodId,
    );

    this.appliedPreloadCallId.set(
      preloadCallId,
    );

    this.selectedCoordinationIds.set([]);
  }

  onApplyFilterForAcademicDevelopment(): void {
    const periodId = this.selectedPeriodId();

    if (!periodId) {
      this.appliedPeriodId.set(null);
      return;
    }

    const parsedPeriodId = Number(periodId);

    if (Number.isNaN(parsedPeriodId)) {
      return;
    }

    this.appliedPeriodId.set(parsedPeriodId);
  }

  onRefreshCoordinations(): void {
    if (
      this.appliedPeriodId() == null ||
      this.appliedPreloadCallId() == null
    ) {
      return;
    }

    this.cdpRequestsForDeanResource.reload();
  }

  onRefreshFaculties(): void {
    if (this.appliedPeriodId() == null) {
      return;
    }

    this.cdpRequestsForAcademicDevelopmentResource.reload();
  }

  onCdpObservationChange(event: Event): void {
    const textarea =
      event.target as HTMLTextAreaElement;

    this.cdpObservation.set(
      textarea.value.slice(
        0,
        this.cdpObservationMaxLength,
      ),
    );
  }

  onCdpAttachmentSelected(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    const files =
      Array.from(input.files ?? []);

    if (!files.length) {
      return;
    }

    this.cdpAttachments.update(
      (current) => [
        ...current,
        ...files,
      ],
    );

    input.value = '';
  }

  removeCdpAttachment(index: number): void {
    this.cdpAttachments.update(
      (current) =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !== index,
        ),
    );
  }

  onRequestCdp(): void {
    console.log(
      'Solicitud CDP:',
      {
        observacion:
          this.cdpObservation(),
        adjuntos:
          this.cdpAttachments(),
      },
    );
  }

  private resolveSelectedPeriodId():
    number | null {

    const periodId =
      this.selectedPeriodId();

    if (!periodId) {
      return null;
    }

    const parsed = Number(periodId);

    return Number.isNaN(parsed)
      ? null
      : parsed;
  }

  private resolveSelectedConvocatoriaId():
    number | null {

    const convocatoriaId =
      this.selectedPreloadCallId();

    if (!convocatoriaId) {
      return null;
    }

    const parsed = Number(convocatoriaId);

    return Number.isNaN(parsed)
      ? null
      : parsed;
  }

  private triggerBrowserDownload(
    blob: Blob,
    fileName: string,
  ): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private async loadUniversityPeriods():
    Promise<void> {

    this.isLoadingPeriods.set(true);

    try {
      const periods =
        await firstValueFrom(
          this.coordinationService
            .getUniversityPeriod(),
        );

      this.universityPeriods.set(
        periods ?? [],
      );
    } catch (error) {
      console.error(
        'Error al cargar periodos universitarios:',
        error,
      );

      this.universityPeriods.set([]);
    } finally {
      this.isLoadingPeriods.set(false);
    }
  }
  
  async downloadCdpReport(): Promise<void> {
    await this.runCdpDownload(
      this.isDownloadingReport,
      (idConvocatoria, idPeriodoUniversidad) =>
        this.cdpService.downloadCdpReport(
          idConvocatoria,
          idPeriodoUniversidad,
        ),
      'Error al descargar el reporte CDP:',
    );
  }

  async downloadCdpPdfReport(): Promise<void> {
    await this.runCdpDownload(
      this.isDownloadingPdfReport,
      (idConvocatoria, idPeriodoUniversidad) =>
        this.cdpService.downloadCdpPdfReport(
          idConvocatoria,
          idPeriodoUniversidad,
        ),
      'Error al descargar el reporte PDF CDP:',
    );
  }

  private async runCdpDownload(
    isDownloading: WritableSignal<boolean>,
    request: (
      idConvocatoria: number,
      idPeriodoUniversidad: number,
    ) => Observable<{ blob: Blob; fileName: string }>,
    errorMessage: string,
  ): Promise<void> {
    if (
      this.isDownloadingReport() ||
      this.isDownloadingPdfReport() ||
      !this.canDownloadCdpReport()
    ) {
      return;
    }

    const idPeriodoUniversidad =
      this.resolveSelectedPeriodId();
    const idConvocatoria =
      this.resolveSelectedConvocatoriaId();

    if (
      idPeriodoUniversidad == null ||
      idConvocatoria == null
    ) {
      return;
    }

    isDownloading.set(true);

    try {
      const file = await firstValueFrom(
        request(idConvocatoria, idPeriodoUniversidad),
      );

      this.triggerBrowserDownload(
        file.blob,
        file.fileName,
      );
    } catch (error) {
      console.error(errorMessage, error);
    } finally {
      isDownloading.set(false);
    }
  }
}