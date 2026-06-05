import { ModalityFormItem } from './preload-call.model';
import {
  BuildPreloadCallSavePayloadParams,
  PreloadCallFechaCodigo,
  PreloadCallSaveFecha,
  PreloadCallSaveModality,
  PreloadCallSaveRequest,
} from './preload-call-save.model';

function buildFechaIfComplete(
  codigo: PreloadCallFechaCodigo,
  fechaInicio: string,
  fechaFin: string,
): PreloadCallSaveFecha | null {
  const inicio = fechaInicio.trim();
  const fin = fechaFin.trim();
  if (!inicio || !fin) {
    return null;
  }
  return { codigo, fechaInicio: inicio, fechaFin: fin };
}

function mapModalidades(
  modalidades: ModalityFormItem[],
): PreloadCallSaveModality[] {
  return modalidades.map((item) => ({
    idModalidadContratacion: Number(item.tipoModalidad),
    vacaciones: item.diasVacaciones ?? 0,
    semanas: item.semanas ?? 0,
    fechaInicio: item.fechaInicio,
    fechaFin: item.fechaFin,
  }));
}

export function buildPreloadCallSavePayload(params: BuildPreloadCallSavePayloadParams,): PreloadCallSaveRequest {
  const fechas: PreloadCallSaveFecha[] = [];
  const convocatoriaFecha = buildFechaIfComplete(
    'CNV',
    params.fechaInicio,
    params.fechaFin,
  );
  const cteiFecha = buildFechaIfComplete(
    'CTI',
    params.fechaInicioCtei,
    params.fechaFinCtei,
  );
  const isuFecha = buildFechaIfComplete(
    'ISU',
    params.fechaInicioIsu,
    params.fechaFinIsu,
  );

  if (convocatoriaFecha) {
    fechas.push(convocatoriaFecha);
  }
  if (cteiFecha) {
    fechas.push(cteiFecha);
  }
  if (isuFecha) {
    fechas.push(isuFecha);
  }

  return {
    convocatoria: {
      nombre: params.nombre.trim(),
      descripcion: params.descripcion.trim(),
      autoriza: {
        id: params.idPersonaNaturalGeneral,
        documentoIdentidad: params.documentoIdentidad.trim(),
        nombreCompleto: params.nombreCompleto.trim(),
      },
      periodo: {
        id: params.periodo.id,
        periodo: params.periodo.periodo,
        ano: params.periodo.anio,
      },
      nivelEducativo: {
        id: params.nivelEducativo.id,
        descripcion: params.nivelEducativo.descripcion,
      },
    },
    fechas,
    modalidades: mapModalidades(params.modalidades),
  };
}
