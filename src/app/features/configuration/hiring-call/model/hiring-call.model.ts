import {
  PreloadCallItem,
} from '../../preload-call/model/preload-call.model';

export type HiringCallItem = PreloadCallItem;

export interface HiringModalityItem {
  id: number;
  nombre: string;
}

export interface HiringProfessorItem {
  id: number;
  nombreCompleto: string;
  idModalidad: number | null;
}
