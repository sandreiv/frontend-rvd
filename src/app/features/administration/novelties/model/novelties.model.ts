export type NoveltyAction =
  | 'ACTUALIZAR'
  | 'ELIMINAR'
  | 'GUARDAR';

export interface NoveltyItem {
  id: number;
  tipo: string;
  descripcion: string;
  accion: NoveltyAction | string;
}

export interface NoveltyFormData {
  tipo: string;
  descripcion: string;
  accion: NoveltyAction;
}

export interface DeleteBulkNoveltiesRequest {
  ids: number[];
}

export const NOVELTY_ACTION_OPTIONS = [
  {
    value: 'ACTUALIZAR',
    label: 'Actualizar',
  },
  {
    value: 'ELIMINAR',
    label: 'Eliminar',
  },
  {
    value: 'GUARDAR',
    label: 'Guardar',
  },
];