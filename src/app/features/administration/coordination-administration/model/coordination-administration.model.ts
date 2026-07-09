import { TabBarItem } from '../../../../shared/ui/tab-bar/tab-bar.types';

export type CoordinationAdministrationTabId =
  | 'associationCoordinations'
  | 'costCenters'
  | 'people'
  | 'careerProfessors';

export interface CatalogOptionItem {
  id: number;
  label: string;
  codigo?: string | null;
}

export interface SubjectCatalogOptionItem {
  codigoMateria: string;
  label: string;
}

export interface CoordinationAssociationCatalogs {
  coordinaciones: CatalogOptionItem[];
  programas: CatalogOptionItem[];
  materias: SubjectCatalogOptionItem[];
  centrosCosto: CatalogOptionItem[];
  personas: CatalogOptionItem[];

}

export interface CoordinationAssociationItem {
  id: number;
  idCoordinacion: number;
  coordinacion: string;
  idPrograma?: number | null;
  programa?: string | null;
  codigoMateria?: string | null;
  materia?: string | null;
  idCentroCosto: number;
  centroCosto: string;
  estado: '1' | '0' | 'ACTIVO' | 'INACTIVO' | string;
}

export interface CoordinationAssociationFormData {
  id?: number | null;
  idCoordinacion: number;
  idPrograma?: number | null;
  codigoMateria?: string | null;
  idCentroCosto: number;
  estado: '1' | '0';
}

export interface DeleteBulkCoordinationAssociationRequest {
  ids: number[];
}

export const COORDINATION_ADMINISTRATION_TABS: TabBarItem[] = [
  {
    id: 'associationCoordinations',
    label: 'Asociación coordinaciones',
    accent: 'brand',
  },
  {
    id: 'costCenters',
    label: 'Centros costo',
    accent: 'brandDeep',
  },
  {
    id: 'people',
    label: 'Personas',
    accent: 'brandLight',
  },
  {
    id: 'careerProfessors',
    label: 'Docentes planta',
    accent: 'brandStrong',
  },
];

export interface CostCenterAssignmentItem {
  id: number;
  idCoordinacion: number;
  coordinacion: string;
  idCentroCosto: number;
  centroCosto: string;
  estado: '1' | '0' | 'ACTIVO' | 'INACTIVO' | string;
}

export interface CostCenterAssignmentFormData {
  id?: number | null;
  idCoordinacion: number;
  idCentroCosto: number;
  estado: '1' | '0';
}

export interface DeleteBulkCostCenterAssignmentRequest {
  ids: number[];
}

export interface PersonCoordinationItem {
  idPersonaGeneral: number;
  persona: string;
  documentoIdentidad: string;
  idCoordinacion: number;
  coordinacion: string;
  estado: '1' | '0' | 'ACTIVO' | 'INACTIVO' | string;
}

export interface PersonCoordinationFormData {
  idPersonaGeneral: number;
  idCoordinacion: number;
  estado: '1' | '0';
}

export interface PersonCoordinationKey {
  idPersonaGeneral: number;
  idCoordinacion: number;
}

export interface DeleteBulkPersonCoordinationRequest {
  registros: PersonCoordinationKey[];
}