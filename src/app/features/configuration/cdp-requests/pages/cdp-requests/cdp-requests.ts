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
import { CdpContext, FacultyCoordinationItem } from '../../model/cdp-context.model';
import {
  CdpAttachment,
  CdpRequest,
} from '../../model/cdp-request.model';

import { DocumentPreview } from '../../../../../shared/components/form/document-preview/document-preview';
import { DocumentRequest } from '../../../../../shared/model/document.model';

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
    NewModal,
    DocumentPreview,
  ],
  templateUrl: './cdp-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdpRequests implements OnInit {

  private readonly coordinationService = inject(CoordinationService);
  private readonly cdpService = inject(CdpService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly permissions = inject(PermissionService);

  readonly getFileTypeIconPath = getFileTypeIconPath;


  readonly universityPeriods = signal<UniversityPeriodItem[]>([]);
  readonly selectedPeriodId = signal('');
  readonly appliedPeriodId = signal<number | null>(null);

  readonly selectedPreloadCallId = signal('');
  readonly appliedPreloadCallId = signal<string | null>(null);

  readonly selectedCoordinationIds = signal<string[]>([]);
  readonly selectedFaculty = signal<FacultyCoordinationItem | null>(null);

  readonly isLoadingPeriods = signal(false);

  readonly cdpObservation = signal('');
  readonly cdpAttachments = signal<File[]>([]);
  readonly isRequestingCdp = signal(false);

  readonly currentCdpRequest = signal<CdpRequest | null>(null);
  readonly isLoadingCurrentCdpRequest = signal(false);

  readonly showDocumentPreview = signal(false);
  readonly selectedDocument = signal<DocumentRequest | null>(null);

  readonly hasCdpRequest = computed(
    () => this.currentCdpRequest() != null,
  );

  readonly showRequestCdpModal = signal(false);

  readonly cdpObservationMaxLength = 250;

  readonly cdpMaxFileSize =
    10 * 1024 * 1024;

  readonly cdpMaxTotalSize =
    100 * 1024 * 1024;

  readonly canRequestCdp = computed(
    () =>
      !this.hasCdpRequest() &&
      this.cdpObservation().trim().length > 0 &&
      this.cdpAttachments().length > 0 &&
      !this.isRequestingCdp(),
  );

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

  readonly tableItems = computed(() => {
    return this.isDean() ? this.cdpRequestsForDeanResource.value() : this.cdpRequestsForAcademicDevelopmentResource.value();
  })

  readonly selectedFacultyAttachments = computed(() => this.selectedFaculty()?.solicitud.adjuntos ?? []);

  readonly isLoadingPreloadCalls = computed(
    () =>
      this.activePreloadCallsResource.isLoading(),
  );

  readonly isLoadingCoordinations = computed(
    () =>
      this.cdpRequestsForDeanResource.isLoading(),
  );

  readonly isLoadingFaculties = computed(() => this.cdpRequestsForAcademicDevelopmentResource.isLoading())

  readonly hasAppliedFilter = computed(() => {
    if (this.isDean()) {
      return (this.appliedPeriodId() != null) && (this.appliedPreloadCallId() != null)
    }

    return this.appliedPeriodId() != null;
  })

  readonly tableEmptyMessage = computed(() => {
    if (this.hasAppliedFilter()) {
      return 'No hay solicitudes CDP para mostrar.';
    }

    if (!this.selectedPeriodId()) {
      return 'Seleccione un periodo y pulse Filtrar.';
    }

    if (this.isDean() && !this.selectedPreloadCallId()) {
      return 'Seleccione una convocatoria y pulse Filtrar.';
    }

    return 'Seleccione un periodo y pulse Filtrar.';
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
    if (this.isDean()) {
      return 'Registra las observaciones y adjuntos de la solicitud.';
    }

    const faculty = this.selectedFaculty();
    if (faculty) {
      return `Revisa las observaciones y adjuntos de ${faculty.nombre}.`
    }

    return 'Revisa las observaciones y adjuntos de la solicitud.';
  })

  readonly canShowCdpReportButtons = computed(() => this.permissions.canDownloadCdpReport());
  readonly canCreateCdpRequest = computed(() => this.permissions.canAddCdpRequest());

  readonly canDownloadCdpReport = computed(() => {
    if (!this.canShowCdpReportButtons()) {
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

  readonly isFilterDisabled = computed(() => {
    if (this.isLoadingPeriods()) return true;

    if (!this.selectedPeriodId()) return true;

    if (this.isDean()) {
      return !this.selectedPreloadCallId() || this.isLoadingPreloadCalls() || this.isLoadingCoordinations();
    }

    return this.isLoadingFaculties();
  })

  readonly canShowCdpSection = computed(() => {
    if (this.isDean()) return true;

    return this.selectedFaculty() !== null;
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
    if (this.isDean()) {
      this.applyDeanFilters();
      return;
    }

    this.applyAcademicDevelopmentFilters();
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

  onOpenFacultyCdpRequest(row: CoordinationItem): void {
    const faculty = row as FacultyCoordinationItem;
    this.selectedFaculty.set(faculty);

    this.cdpObservation.set(
      faculty.solicitud.observacion ?? ''
    );

    this.cdpAttachments.set([]);
  }

  onCdpAttachmentSelected(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    const selectedFiles =
      Array.from(input.files ?? []);

    input.value = '';

    if (!selectedFiles.length) {
      return;
    }

    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size > this.cdpMaxFileSize,
      );

    if (oversizedFile) {

      this.notificationService.error(
        `El archivo "${oversizedFile.name}" supera el tamaño máximo permitido de 10 MB.`,
        'Adjunto no permitido',
      );

      return;
    }

    const currentTotal =
      this.cdpAttachments()
        .reduce(
          (total, file) =>
            total + file.size,
          0,
        );

    const selectedTotal =
      selectedFiles.reduce(
        (total, file) =>
          total + file.size,
        0,
      );

    if (
      currentTotal + selectedTotal >
      this.cdpMaxTotalSize
    ) {

      this.notificationService.error(
        'Los archivos adjuntos no pueden superar los 100 MB por solicitud.',
        'Límite de adjuntos',
      );

      return;
    }

    this.cdpAttachments.update(
      (current) => [
        ...current,
        ...selectedFiles,
      ],
    );
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
    const periodId = this.selectedPeriodId()
    if (!periodId) return;

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
          periodId
        ),
      );

      this.notificationService.success(
        'La solicitud CDP fue registrada correctamente.',
        'Solicitud CDP',
      );

      this.showRequestCdpModal.set(false);

      await this.loadCurrentCdpRequest();

      this.cdpObservation.set('');
      this.cdpAttachments.set([]);

      this.showRequestCdpModal.set(false);

    } catch (error) {

      console.error(
        'Error al registrar la solicitud CDP:',
        error,
      );

      this.notificationService.error(
        'No fue posible registrar la solicitud CDP.',
        'Solicitud CDP',
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
    if (!this.isDean()) return;

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
        'Error al cargar la solicitud CDP:',
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

  openAttachmentPreview(
    adjunto: CdpAttachment,
  ): void {
    const extension =
      adjunto.nombre
        .split('.')
        .pop()
        ?.toLowerCase() ?? '';

    this.selectedDocument.set({
      mimeType: '',
      tamano: 0,
      extension,
      path: adjunto.path,
      descripcion: adjunto.nombre,
      nombreArchivo: adjunto.nombre,
    });

    this.showDocumentPreview.set(true);
  }

  openLocalAttachmentPreview(
    file: File,
  ): void {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ?? '';

    this.selectedDocument.set({
      archivo: file,
      mimeType:
        file.type ||
        'application/octet-stream',
      tamano: file.size,
      extension,
      path: '',
      descripcion: file.name,
      nombreArchivo: file.name,
    });

    this.showDocumentPreview.set(true);
  }

  closeDocumentPreview(): void {
    this.showDocumentPreview.set(false);
    this.selectedDocument.set(null);
  }

  private applyDeanFilters(): void {
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

  private applyAcademicDevelopmentFilters(): void {
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
}