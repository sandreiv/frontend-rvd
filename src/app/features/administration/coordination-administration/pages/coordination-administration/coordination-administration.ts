import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbTitle } from '../../../../../core/service/breadcrumb-title';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';
import { Icon } from '../../../../../shared/ui/icon/icon';
import type { AppIconName } from '../../../../../shared/ui/icon/icons';
import { NewModal } from '../../../../../shared/ui/new-modal/new-modal';
import { AssociationCoordinationForm } from '../../components/association-coordination-form/association-coordination-form';
import { AssociationCoordinationTable } from '../../components/association-coordination-table/association-coordination-table';
import { CoordinationAdministrationService } from '../../data/coordination-administration.service';
import { CostCenterAssignmentForm } from '../../components/cost-center-assignment-form/cost-center-assignment-form';
import { CostCenterAssignmentTable } from '../../components/cost-center-assignment-table/cost-center-assignment-table';
import { PersonCoordinationForm } from '../../components/person-coordination-form/person-coordination-form';
import { PersonCoordinationTable } from '../../components/person-coordination-table/person-coordination-table';
import {
  CatalogOptionItem,
  CoordinationAdministrationTabId,
  CoordinationAssociationFormData,
  CoordinationAssociationItem,
  SubjectCatalogOptionItem,
  CostCenterAssignmentFormData,
  CostCenterAssignmentItem,
  PersonCoordinationFormData,
  PersonCoordinationItem,
  PersonCoordinationKey,
} from '../../model/coordination-administration.model';

type CoordinationSwitchItem = {
  id: CoordinationAdministrationTabId;
  label: string;
  icon: AppIconName;
};

@Component({
  selector: 'app-coordination-administration',
  imports: [SectionFrame, AssociationCoordinationTable, AssociationCoordinationForm, NewModal, Icon, CostCenterAssignmentTable, CostCenterAssignmentForm, PersonCoordinationTable, PersonCoordinationForm],
  templateUrl: './coordination-administration.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationAdministration implements OnInit {
  private readonly administrationService = inject(CoordinationAdministrationService);
  private readonly breadcrumbTitle = inject(BreadcrumbTitle);

  readonly switchItems: CoordinationSwitchItem[] = [
        {
            id: 'associationCoordinations',
            label: 'Asociación coordinaciones',
            icon: 'adjustmentsHorizontal',
        },
        {
            id: 'costCenters',
            label: 'Centros costo',
            icon: 'briefcase',
        },
        {
            id: 'people',
            label: 'Personas',
            icon: 'user',
        },
        {
            id: 'careerProfessors',
            label: 'Docentes planta',
            icon: 'academicCap',
        },
  ];

   readonly selectedTab = signal<CoordinationAdministrationTabId>('associationCoordinations');

  readonly associations = signal<CoordinationAssociationItem[]>([]);
  readonly selectedAssociationIds = signal<string[]>([]);
  readonly selectedAssociation = signal<CoordinationAssociationItem | null>(null);

  readonly coordinations = signal<CatalogOptionItem[]>([]);
  readonly programs = signal<CatalogOptionItem[]>([]);
  readonly subjects = signal<SubjectCatalogOptionItem[]>([]);
  readonly costCenters = signal<CatalogOptionItem[]>([]);

  readonly showForm = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);

  readonly showDeleteModal = signal(false);
  readonly idsToDelete = signal<number[]>([]);
  readonly associationToDelete = signal<CoordinationAssociationItem | null>(null);

  readonly selectedTabId = computed(() => this.selectedTab() as CoordinationAdministrationTabId);

  readonly costCenterAssignments = signal<CostCenterAssignmentItem[]>([]);
  readonly selectedCostCenterAssignmentIds = signal<string[]>([]);
  readonly selectedCostCenterAssignment = signal<CostCenterAssignmentItem | null>(null);

  readonly people = signal<CatalogOptionItem[]>([]);

  readonly peopleCoordinations = signal<PersonCoordinationItem[]>([]);
  readonly selectedPeopleCoordinationIds = signal<string[]>([]);
  readonly selectedPeopleCoordination = signal<PersonCoordinationItem | null>(null);

  readonly plantProfessorCoordinations = signal<PersonCoordinationItem[]>([]);
  readonly selectedPlantProfessorCoordinationIds = signal<string[]>([]);
  readonly selectedPlantProfessorCoordination = signal<PersonCoordinationItem | null>(null);

  readonly compositeKeysToDelete = signal<PersonCoordinationKey[]>([]);
  readonly deleteContext = signal<
  'associationCoordinations' | 'costCenters' | 'people' | 'careerProfessors'
  >('associationCoordinations');
  
  
  readonly deleteModalTitle = computed(() =>
    this.idsToDelete().length > 1 ? 'Eliminar asociaciones' : 'Eliminar asociación',
  );

  readonly deleteModalMessage = computed(() => {
    const count = this.idsToDelete().length;

    if (count > 1) {
      return `¿Seguro que deseas eliminar las ${count} asociaciones seleccionadas?`;
    }

    return `¿Seguro que deseas eliminar la asociación ${this.associationToDelete()?.coordinacion ?? ''}?`;
  });

  async ngOnInit(): Promise<void> {
    this.breadcrumbTitle.setPageTitle('Administración / Coordinaciones');
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading.set(true);

    try {
      const [
      catalogs,
      associations,
      costCenterAssignments,
      peopleCoordinations,
      plantProfessorCoordinations,
      ] = await Promise.all([
      firstValueFrom(this.administrationService.getCatalogs()),
      firstValueFrom(this.administrationService.listAssociations()),
      firstValueFrom(this.administrationService.listCostCenterAssignments()),
      firstValueFrom(this.administrationService.listPeopleCoordinations()),
      firstValueFrom(this.administrationService.listPlantProfessorCoordinations()),
      ]);

      this.coordinations.set(catalogs.coordinaciones ?? []);
      this.programs.set(catalogs.programas ?? []);
      this.subjects.set(catalogs.materias ?? []);
      this.costCenters.set(catalogs.centrosCosto ?? []);
      this.associations.set(associations ?? []);
      this.costCenterAssignments.set(costCenterAssignments ?? []);
      this.people.set(catalogs.personas ?? []);
      this.peopleCoordinations.set(peopleCoordinations ?? []);
      this.plantProfessorCoordinations.set(plantProfessorCoordinations ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectTab(tabId: CoordinationAdministrationTabId): void {
    this.selectedTab.set(tabId);
    this.closeForm();
   }

  openCreateForm(): void {
    this.selectedAssociation.set(null);
    this.showForm.set(true);
  }

  openEditForm(association: CoordinationAssociationItem): void {
    this.selectedAssociation.set(association);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedAssociation.set(null);
    this.selectedCostCenterAssignment.set(null);
    this.selectedPeopleCoordination.set(null);
    this.selectedPlantProfessorCoordination.set(null);
   }

  async onSaveAssociation(payload: CoordinationAssociationFormData): Promise<void> {
    this.isSaving.set(true);

    try {
      const selected = this.selectedAssociation();

      if (selected?.id) {
        await firstValueFrom(this.administrationService.updateAssociation(selected.id, payload));
      } else {
        await firstValueFrom(this.administrationService.saveAssociation(payload));
      }

      this.closeForm();
      await this.refreshAssociations();
    } catch (error) {
      console.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  requestDeleteAssociation(association: CoordinationAssociationItem): void {
    this.deleteContext.set('associationCoordinations');
    this.associationToDelete.set(association);
    this.idsToDelete.set([association.id]);
    this.compositeKeysToDelete.set([]);
    this.showDeleteModal.set(true);
  }

  requestBulkDelete(ids: number[]): void {
    if (!ids.length) {
      return;
    }

    this.associationToDelete.set(null);
    this.idsToDelete.set(ids);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.idsToDelete.set([]);
    this.associationToDelete.set(null);
  }

    async confirmDelete(): Promise<void> {
        this.isDeleting.set(true);

        try {
            if (this.deleteContext() === 'people') {
            const registros = this.compositeKeysToDelete();

            if (!registros.length) {
                return;
            }

            if (registros.length === 1) {
                await firstValueFrom(
                this.administrationService.deletePeopleCoordination(
                    registros[0].idPersonaGeneral,
                    registros[0].idCoordinacion,
                ),
                );
            } else {
                await firstValueFrom(
                this.administrationService.deleteBulkPeopleCoordinations({
                    registros,
                }),
                );
            }

            this.selectedPeopleCoordinationIds.set([]);
            this.compositeKeysToDelete.set([]);
            this.closeDeleteModal();
            await this.refreshPeopleCoordinations();
            return;
            }

            if (this.deleteContext() === 'careerProfessors') {
            const registros = this.compositeKeysToDelete();

            if (!registros.length) {
                return;
            }

            if (registros.length === 1) {
                await firstValueFrom(
                this.administrationService.deletePlantProfessorCoordination(
                    registros[0].idPersonaGeneral,
                    registros[0].idCoordinacion,
                ),
                );
            } else {
                await firstValueFrom(
                this.administrationService.deleteBulkPlantProfessorCoordinations({
                    registros,
                }),
                );
            }

            this.selectedPlantProfessorCoordinationIds.set([]);
            this.compositeKeysToDelete.set([]);
            this.closeDeleteModal();
            await this.refreshPlantProfessorCoordinations();
            return;
            }

            const ids = this.idsToDelete();

            if (!ids.length) {
            return;
            }

            if (this.deleteContext() === 'costCenters') {
            if (ids.length === 1) {
                await firstValueFrom(
                this.administrationService.deleteCostCenterAssignment(ids[0]),
                );
            } else {
                await firstValueFrom(
                this.administrationService.deleteBulkCostCenterAssignments({ ids }),
                );
            }

            this.selectedCostCenterAssignmentIds.set([]);
            this.closeDeleteModal();
            await this.refreshCostCenterAssignments();
            return;
            }

            if (ids.length === 1) {
            await firstValueFrom(
                this.administrationService.deleteAssociation(ids[0]),
            );
            } else {
            await firstValueFrom(
                this.administrationService.deleteBulk({ ids }),
            );
            }

            this.selectedAssociationIds.set([]);
            this.closeDeleteModal();
            await this.refreshAssociations();
        } catch (error) {
            console.error(error);
        } finally {
            this.isDeleting.set(false);
        }
    }

  async refreshAssociations(): Promise<void> {
    this.isLoading.set(true);

    try {
      const associations = await firstValueFrom(this.administrationService.listAssociations());
      this.associations.set(associations ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateCostCenterForm(): void {
    this.selectedCostCenterAssignment.set(null);
    this.showForm.set(true);
    }

    openEditCostCenterForm(assignment: CostCenterAssignmentItem): void {
    this.selectedCostCenterAssignment.set(assignment);
    this.showForm.set(true);
    }

    async onSaveCostCenterAssignment(payload: CostCenterAssignmentFormData): Promise<void> {
    this.isSaving.set(true);

    try {
        const selected = this.selectedCostCenterAssignment();

        if (selected?.id) {
        await firstValueFrom(
            this.administrationService.updateCostCenterAssignment(selected.id, payload),
        );
        } else {
        await firstValueFrom(
            this.administrationService.saveCostCenterAssignment(payload),
        );
        }

        this.closeForm();
        await this.refreshCostCenterAssignments();
    } catch (error) {
        console.error(error);
    } finally {
        this.isSaving.set(false);
    }
    }

    async refreshCostCenterAssignments(): Promise<void> {
    this.isLoading.set(true);

    try {
        const assignments = await firstValueFrom(
        this.administrationService.listCostCenterAssignments(),
        );

        this.costCenterAssignments.set(assignments ?? []);
    } catch (error) {
        console.error(error);
    } finally {
        this.isLoading.set(false);
    }
    }

    requestDeleteCostCenterAssignment(assignment: CostCenterAssignmentItem): void {
        this.deleteContext.set('costCenters');
        this.associationToDelete.set(null);
        this.selectedCostCenterAssignment.set(assignment);
        this.idsToDelete.set([assignment.id]);
        this.compositeKeysToDelete.set([]);
        this.showDeleteModal.set(true);
    }

    requestBulkDeleteCostCenters(ids: number[]): void {
    if (!ids.length) {
        return;
    }

    this.associationToDelete.set(null);
    this.selectedCostCenterAssignment.set(null);
    this.idsToDelete.set(ids);
    this.showDeleteModal.set(true);
    }

    openCreatePeopleForm(): void {
    this.selectedPeopleCoordination.set(null);
    this.showForm.set(true);
    }

    openEditPeopleForm(item: PersonCoordinationItem): void {
    this.selectedPeopleCoordination.set(item);
    this.showForm.set(true);
    }

    async onSavePeopleCoordination(payload: PersonCoordinationFormData): Promise<void> {
    this.isSaving.set(true);

    try {
        const selected = this.selectedPeopleCoordination();

        if (selected) {
        await firstValueFrom(
            this.administrationService.updatePeopleCoordination(
            selected.idPersonaGeneral,
            selected.idCoordinacion,
            payload,
            ),
        );
        } else {
        await firstValueFrom(this.administrationService.savePeopleCoordination(payload));
        }

        this.closeForm();
        await this.refreshPeopleCoordinations();
    } catch (error) {
        console.error(error);
    } finally {
        this.isSaving.set(false);
    }
    }

    async refreshPeopleCoordinations(): Promise<void> {
    this.isLoading.set(true);

    try {
        const rows = await firstValueFrom(this.administrationService.listPeopleCoordinations());
        this.peopleCoordinations.set(rows ?? []);
    } catch (error) {
        console.error(error);
    } finally {
        this.isLoading.set(false);
    }
    }

    requestDeletePeopleCoordination(item: PersonCoordinationItem): void {
    this.deleteContext.set('people');
    this.compositeKeysToDelete.set([
        {
        idPersonaGeneral: item.idPersonaGeneral,
        idCoordinacion: item.idCoordinacion,
        },
    ]);
    this.showDeleteModal.set(true);
    }

    requestBulkDeletePeople(keys: PersonCoordinationKey[]): void {
    if (!keys.length) {
        return;
    }

    this.deleteContext.set('people');
    this.compositeKeysToDelete.set(keys);
    this.showDeleteModal.set(true);
    }

    openCreatePlantProfessorForm(): void {
    this.selectedPlantProfessorCoordination.set(null);
    this.showForm.set(true);
    }

    openEditPlantProfessorForm(item: PersonCoordinationItem): void {
    this.selectedPlantProfessorCoordination.set(item);
    this.showForm.set(true);
    }

    async onSavePlantProfessorCoordination(payload: PersonCoordinationFormData): Promise<void> {
    this.isSaving.set(true);

    try {
        const selected = this.selectedPlantProfessorCoordination();

        if (selected) {
        await firstValueFrom(
            this.administrationService.updatePlantProfessorCoordination(
            selected.idPersonaGeneral,
            selected.idCoordinacion,
            payload,
            ),
        );
        } else {
        await firstValueFrom(
            this.administrationService.savePlantProfessorCoordination(payload),
        );
        }

        this.closeForm();
        await this.refreshPlantProfessorCoordinations();
    } catch (error) {
        console.error(error);
    } finally {
        this.isSaving.set(false);
    }
    }

    async refreshPlantProfessorCoordinations(): Promise<void> {
    this.isLoading.set(true);

    try {
        const rows = await firstValueFrom(
        this.administrationService.listPlantProfessorCoordinations(),
        );
        this.plantProfessorCoordinations.set(rows ?? []);
    } catch (error) {
        console.error(error);
    } finally {
        this.isLoading.set(false);
    }
    }

    requestDeletePlantProfessorCoordination(item: PersonCoordinationItem): void {
    this.deleteContext.set('careerProfessors');
    this.compositeKeysToDelete.set([
        {
        idPersonaGeneral: item.idPersonaGeneral,
        idCoordinacion: item.idCoordinacion,
        },
    ]);
    this.showDeleteModal.set(true);
    }

    requestBulkDeletePlantProfessors(keys: PersonCoordinationKey[]): void {
    if (!keys.length) {
        return;
    }

    this.deleteContext.set('careerProfessors');
    this.compositeKeysToDelete.set(keys);
    this.showDeleteModal.set(true);
    }    


  
}