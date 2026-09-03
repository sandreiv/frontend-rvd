import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';

import { NotificationService } from '../../../../../core/service/notification-service';

import { CdpService } from '../../data/cdp.service';
import { CdpContext } from '../../model/cdp-context.model';
import { CdpRequest } from '../../model/cdp-request.model';

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

import { NewModal } from '../../../../../shared/ui/new-modal/new-modal';

import {
  CoordinationItem,
  CoordinationPreloadCallApi,
} from '../../../professor-preload/model/coordination.model';

@Component({
  selector: 'app-cdp-requests',
  imports: [
    Button,
    Select,
    SectionFrame,
    CoordinationTable,
    Icon,
    Tooltip,
    NewModal,
  ],
  templateUrl: './cdp-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdpRequests implements OnInit {

  private readonly coordinationService = inject(CoordinationService);

  private readonly cdpService = inject(CdpService);

  private readonly notificationService = inject(NotificationService);

  readonly getFileTypeIconPath = getFileTypeIconPath;

  readonly cdpContextResource = rxResource<CdpContext, unknown>({
    stream: () =>
      this.cdpService.getContext(),
  });

  readonly cdpContext = computed(
    () => this.cdpContextResource.value(),
  );

  readonly universityPeriods = signal<UniversityPeriodItem[]>([]);
  readonly selectedPeriodId = signal('');
  readonly appliedPeriodId = signal<number | null>(null);

  readonly selectedPreloadCallId = signal('');
  readonly appliedPreloadCallId = signal<string | null>(null);

  readonly selectedCoordinationIds = signal<string[]>([]);

  readonly isLoadingPeriods = signal(false);

  readonly cdpObservation = signal('');
  readonly cdpAttachments = signal<File[]>([]);
  readonly isRequestingCdp = signal(false);

  readonly currentCdpRequest = signal<CdpRequest | null>(null);
  readonly isLoadingCurrentCdpRequest = signal(false);

  readonly hasCdpRequest = computed(
    () => this.currentCdpRequest() != null,
  );

  readonly showRequestCdpModal = signal(false);

  readonly cdpObservationMaxLength = 250;

  readonly canRequestCdp = computed(
    () =>
      !this.hasCdpRequest() &&
      this.cdpObservation().trim().length > 0 &&
      this.cdpAttachments().length > 0 &&
      !this.isRequestingCdp(),
  );

  readonly isDownloadingReport = signal(false);
  readonly isDownloadingPdfReport = signal(false);

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

  readonly cdpRequestsResource = rxResource({
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

  readonly coordinations = computed(
    () => this.cdpRequestsResource.value(),
  );

  readonly isLoadingPreloadCalls = computed(
    () =>
      this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(
    () =>
      this.cdpRequestsResource.isLoading(),
  );

  readonly hasAppliedFilter = computed(
    () =>
      this.appliedPeriodId() != null &&
      this.appliedPreloadCallId() != null,
  );

  readonly tableEmptyMessage = computed(() => {
    if (this.hasAppliedFilter()) {
      return 'No hay solicitudes CPD para mostrar.';
    }

    if (!this.selectedPeriodId()) {
      return 'Seleccione un periodo y pulse Filtrar.';
    }

    return 'Seleccione una convocatoria y pulse Filtrar.';
  });

  readonly canDownloadCdpReport = computed(() => {
    const periodId = this.resolveSelectedPeriodId();
    const convocatoriaId =
      this.resolveSelectedConvocatoriaId();

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

  ngOnInit(): void {
    void this.loadUniversityPeriods();
    void this.loadCurrentCdpRequest();
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

  onApplyFilter(): void {
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

  onRefreshCoordinations(): void {
    if (
      this.appliedPeriodId() == null ||
      this.appliedPreloadCallId() == null
    ) {
      return;
    }

    this.cdpRequestsResource.reload();
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

  async onRequestCdp(): Promise<void> {

    if (
      this.isRequestingCdp() ||
      !this.canRequestCdp()
    ) {
      return;
    }

    this.isRequestingCdp.set(true);

    try {

      await firstValueFrom(
        this.cdpService.createRequest(
          this.cdpObservation(),
          this.cdpAttachments(),
        ),
      );

      this.notificationService.success(
        'La solicitud CPD fue registrada correctamente.',
        'Solicitud CPD',
      );

      this.showRequestCdpModal.set(false);

      await this.loadCurrentCdpRequest();

      this.cdpObservation.set('');
      this.cdpAttachments.set([]);

      this.showRequestCdpModal.set(false);

    } catch (error) {

      console.error(
        'Error al registrar la solicitud CPD:',
        error,
      );

      this.notificationService.error(
        'No fue posible registrar la solicitud CPD.',
        'Solicitud CPD',
      );

    } finally {

      this.isRequestingCdp.set(false);

    }
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

  private async loadCurrentCdpRequest():
    Promise<void> {

    this.isLoadingCurrentCdpRequest.set(true);

    try {

      const request =
        await firstValueFrom(
          this.cdpService.getCurrentRequest(),
        );

      this.currentCdpRequest.set(
        request ?? null,
      );

    } catch (error) {

      console.error(
        'Error al cargar la solicitud CPD:',
        error,
      );

      this.currentCdpRequest.set(null);

    } finally {

      this.isLoadingCurrentCdpRequest.set(false);

    }
  }

  openRequestCdpModal(): void {
    if (!this.canRequestCdp()) {
      return;
    }

    this.showRequestCdpModal.set(true);
  }

  closeRequestCdpModal(): void {
    if (this.isRequestingCdp()) {
      return;
    }

    this.showRequestCdpModal.set(false);
  }

}