export type ActivityTypeCode = 'CTEI' | 'AC' | 'FAD' | 'FAI' | 'ISU';

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
  { value: 'CTEI', label: 'CTEI' },
  { value: 'AC', label: 'AC' },
  { value: 'FAD', label: 'FAD' },
  { value: 'FAI', label: 'FAI' },
  { value: 'ISU', label: 'ISU' },
];

export function parseActivityHours(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function sumChildrenMaxHours(
  children: ActivityTypeItem[],
  excludeId?: number | null,
): number {
  return children.reduce((total, child) => {
    if (excludeId != null && child.id === excludeId) {
      return total;
    }

    const hours = parseActivityHours(child.maximoHoras);
    return total + (hours ?? 0);
  }, 0);
}
