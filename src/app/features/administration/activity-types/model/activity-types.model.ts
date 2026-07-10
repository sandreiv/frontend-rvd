export type ActivityTypeCode = 'CTI' | 'AC' | 'FAD' | 'FAI' | 'ISU';

export interface ActivityTypeItem {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: ActivityTypeCode | string;
  minimoHoras: string | null;
  maximoHoras: string | null;
  orden: string | null;
  estado: '1' | '0' | 'ACTIVO' | 'INACTIVO' | string;
}

export interface ActivityTypeFormData {
  nombre: string;
  descripcion: string;
  codigo: ActivityTypeCode | string;
  minimoHoras: number;
  maximoHoras: number;
  estado: '1' | '0';
}

export interface DeleteBulkActivityTypesRequest {
  ids: number[];
}

export const ACTIVITY_TYPE_CODE_OPTIONS = [
  { value: 'CTI', label: 'CTI' },
  { value: 'AC', label: 'AC' },
  { value: 'FAD', label: 'FAD' },
  { value: 'FAI', label: 'FAI' },
  { value: 'ISU', label: 'ISU' },
];