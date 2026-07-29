/**
 * Aplicación: rvd
 * Archivo: load-restriction.model.ts
 * Ruta: src/app/features/administration/load-restriction/model
 * Autor: GRUPO DE DESARROLLO ESPECÍFICO - CIADTI - Universidad de Pamplona
 * Fecha de creación: 22/07/2026
 * Modificaciones:
 * 22/07/2026 - Joel Daniel Arias Duarte - Creación inicial para modelos de restricción de carga.
 */

export interface LoadRestrictionModalityItem {
  id: number;
  nombre: string;
  sigla: string | null;
  estado: string | null;
}

export interface LoadRestrictionCatalogItem {
  id: number;
  label: string;
  codigo: string | null;
}

export interface LoadRestrictionCatalogs {
  categorias: LoadRestrictionCatalogItem[];
  tiposActividad: LoadRestrictionCatalogItem[];
  programas: LoadRestrictionCatalogItem[];
  personas: LoadRestrictionCatalogItem[];
}

export interface LoadRestrictionDetail {
  idModalidadContratacion: number;
  minimo: string | null;
  maximo: string | null;
  investigacion: string | null;
  formaPago: string | null;
  tipoContrato: string | null;
  tipoHoras: string | null;
  idsProgramasExcepcion: number[];
  idsPersonasExcepcion: number[];
  idCategoriaCatedratico: number | null;
  idTipoActividad: number | null;
}

export interface LoadRestrictionFormData {
  idModalidadContratacion: number;
  minimo: string | null;
  maximo: string | null;
  investigacion: string;
  formaPago: string | null;
  tipoContrato: string | null;
  tipoHoras: string | null;
  idsProgramasExcepcion: number[];
  idsPersonasExcepcion: number[];
  idCategoriaCatedratico: number | null;
  idTipoActividad: number | null;
}

export function formatLoadRestrictionStatus(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim().toUpperCase();

  return normalized === '1' || normalized === 'ACTIVO' || normalized === 'A'
    ? 'Activo'
    : 'Inactivo';
}