import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { SectionFrame } from "../../../../../shared/ui/section-frame/section-frame";
import { PreloadCallItem } from '../../model/preload-call.model';
import { DataTableColumn } from '../../../../../shared/ui/data-table/table.types';
import { PreloadCallTable } from "../../components/preload-call-table/preload-call-table";
import { ToastService } from '../../../../../core/service/toastService';
import { BreadcrumbTitle } from '../../../../../core/service/breadcrumb-title';

@Component({
  selector: 'app-preload-call',
  imports: [SectionFrame, PreloadCallTable],
  templateUrl: './preload-call.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloadCall implements OnInit, OnDestroy{

  readonly breadcrumbTitleService = inject(BreadcrumbTitle);
  private readonly toastService = inject(ToastService);

  readonly preloadCalls = signal<PreloadCallItem[]>([]);
  readonly selectedPreloadCallIds = signal<string[]>([]);
  readonly selectedPreloadCall = signal<PreloadCallItem | null>(null);
  readonly showPreloadCallForm = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  formMode = signal<'create' | 'edit' | 'read'>('create');



  async ngOnInit(): Promise<void> {
    this.breadcrumbTitleService.setPageTitle('Experiencia');
    //await this.loadPersonalInfo();
  }

  ngOnDestroy(): void {
    this.breadcrumbTitleService.clearPageTitle();
  }

  openPreloadCallForm(): void {
    this.selectedPreloadCall.set(null);
    this.formMode.set('create');
    this.showPreloadCallForm.set(true);
  }

  selectedPreloadCallIdsChange(ids: string[]): void {
    this.selectedPreloadCallIds.set(ids);
  }

  openReadOnlyPreloadCallForm(preloadCall: PreloadCallItem): void {
    /*this.experienceService.getExperienceById(experience.id).subscribe((response) => {
      console.log('Experience by id:', response);
      this.selectedExperience.set(response);
      this.formMode.set('edit');
      this.showExperienceForm.set(true);
    });*/
  }

  onDeletePreloadCall(preloadCall: PreloadCallItem): void {
    /*this.experienceToDelete.set(experience);
    this.isDeleteModalOpen.set(true);
    this.openSingleDeleteModal(experience);*/
  }

  async onRefreshPreloadCallList(): Promise<void> {
    console.log('Refrescando lista de experiencias...');

    this.successMessage.set(null);
    this.errorMessage.set(null);
    //await this.loadPersonalInfo();
  }

  onDeleteAllPreloadCall(ids: string[]): void {
    //this.openBulkDeleteModal(ids);
  }

}
