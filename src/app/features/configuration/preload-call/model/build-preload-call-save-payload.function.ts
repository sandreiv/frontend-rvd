import { FechaFormMeta, ModalityFormItem } from './preload-call.model';
import {
  BuildPreloadCallSavePayloadParams,
  PreloadCallFechaCodigo,
  PreloadCallSaveCotc,
  PreloadCallSaveCotcFecha,
  PreloadCallSaveFecha,
  PreloadCallSaveRequest,
} from './preload-call-save.model';

function resolveFechaId(
  fechasMeta: FechaFormMeta[],
  codigo: PreloadCallFechaCodigo,
): number | undefined {
  return fechasMeta.find((item) => item.codigo === codigo)?.id;
}

function buildFechaIfComplete(
  codigo: PreloadCallFechaCodigo,
  fechaInicio: string,
  fechaFin: string,
  id?: number,
): PreloadCallSaveFecha | null {
  const inicio = fechaInicio.trim();
  const fin = fechaFin.trim();
  if (!inicio || !fin) {
    return null;
  }
  const fecha: PreloadCallSaveFecha = {
    codigo,
    fechaInicio: inicio,
    fechaFin: fin,
    id: id ?? null,
  };
  return fecha;
}

function resolveCotcGroupKey(item: ModalityFormItem): string {
  if (item.cotcId != null) {
    return `cotc-${item.cotcId}`;
  }
  return `mod-${item.tipoModalidad}`;
}

function mapCotcFecha(row: ModalityFormItem): PreloadCallSaveCotcFecha {
  return {
    id: row.fechaId ?? null,
    vacaciones: row.diasVacaciones ?? null,
    fechaInicio: row.fechaInicio,
    fechaFin: row.fechaFin,
    semanas: row.semanas ?? 0,
  };
}

function mapConvocatoriaTipoContratacion(
  rows: ModalityFormItem[],
): PreloadCallSaveCotc[] {
  const groups = new Map<string, ModalityFormItem[]>();

  for (const row of rows) {
    const key = resolveCotcGroupKey(row);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    return {
      id: first.cotcId ?? null,
      idModalidadContratacion: Number(first.tipoModalidad),
      fechas: group.map((row) => mapCotcFecha(row)),
    };
  });
}

export function buildPreloadCallSavePayload(
  params: BuildPreloadCallSavePayloadParams,
): PreloadCallSaveRequest {
  const fechas: PreloadCallSaveFecha[] = [];
  const convocatoriaFecha = buildFechaIfComplete(
    'CNV',
    params.fechaInicio,
    params.fechaFin,
    resolveFechaId(params.fechasMeta, 'CNV'),
  );
  const cteiFecha = buildFechaIfComplete(
    'CTI',
    params.fechaInicioCtei,
    params.fechaFinCtei,
    resolveFechaId(params.fechasMeta, 'CTI'),
  );
  const isuFecha = buildFechaIfComplete(
    'ISU',
    params.fechaInicioIsu,
    params.fechaFinIsu,
    resolveFechaId(params.fechasMeta, 'ISU'),
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

  const convocatoria: PreloadCallSaveRequest['convocatoria'] = {
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
  };

  if (params.convocatoriaId != null) {
    convocatoria.id = params.convocatoriaId;
  }

  return {
    convocatoria,
    fechas,
    convocatoriaTipoContratacion: mapConvocatoriaTipoContratacion(
      params.modalityRows,
    ),
  };
}
