import { Observable } from 'rxjs';
import { ConvocatoriaDates } from './add-professor.model';
import { DetalleCargaDocenteRequest } from './save-detail-professor-preload.model';
import { WorkDate } from './coordination.model';

export interface NoveltyAssignmentSnapshot {
  idModalidadContratacion: number;
  idCategoriaCatedratico: number;
  workDate: WorkDate;
  semanas: string;
  horas: string | null;
  horasDeExcepcion: string | null;
  valorHora: number | null;
  puntos: string | null;
  valorPunto: number | null;
  valorContrato: number | null;
  valorPrestaciones: number | null;
  totalContrato: number | null;
  asignacionSalarial: number | null;
}

export interface SaveNovedadCargaDocenteRequest {
  idCargaDocente: number;
  idCarga: number;
  idPersonaGeneral: number | null;
  idModalidadContratacion: number;
  idCategoriaCatedratico: number;
  idNovedad: number;
  fechasConvocatoria: ConvocatoriaDates;
  semanas: string;
  horas?: string | null;
  horasDeExcepcion?: string | null;
  valorPunto?: number | null;
  valorContrato?: number | null;
  valorPrestaciones?: number | null;
  totalContrato?: number | null;
  asignacionSalarial?: number | null;
  puntos?: string | null;
  valorHora?: number | null;
  onceMeses?: string | null;
  detalles: DetalleCargaDocenteRequest[];
}

export interface NoveltySaveHost {
  save(): Observable<void>;
}

export function isNoveltySaveHost(
  value: unknown,
): value is NoveltySaveHost {
  return (
    typeof value === 'object' &&
    value != null &&
    'save' in value &&
    typeof (value as NoveltySaveHost).save === 'function'
  );
}